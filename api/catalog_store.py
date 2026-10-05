"""Reviewed catalogue mirror, price history and review queue. No feedback tables touched."""
import json
from datetime import datetime, timedelta, timezone
from sqlalchemy import (Boolean, Column, DateTime, Integer, MetaData, String, Table, Text,
                        create_engine, select, delete)


def utcnow():
    return datetime.now(timezone.utc)


class CatalogStore:
    def __init__(self, url, create=False):
        for prefix in ('postgres://', 'postgresql://'):
            if url.startswith(prefix):
                url = 'postgresql+psycopg://' + url[len(prefix):]
        opts = {'connect_timeout': 5} if url.startswith('postgresql') else {}
        self.engine = create_engine(url, pool_pre_ping=True, connect_args=opts)
        meta = MetaData()
        self.products = Table('shoe_catalog', meta,
            Column('id', Integer, primary_key=True), Column('payload', Text, nullable=False))
        self.offers = Table('shoe_price_history', meta,
            Column('id', Integer, primary_key=True, autoincrement=True),
            Column('shoe_id', Integer, nullable=False, index=True),
            Column('source_url', Text, nullable=False), Column('payload', Text, nullable=False),
            Column('checked_at', DateTime(timezone=True), nullable=False, index=True))
        self.reviews = Table('shoe_review_queue', meta,
            Column('id', Integer, primary_key=True, autoincrement=True),
            Column('shoe_id', Integer, nullable=False, index=True),
            Column('reason', String(100), nullable=False), Column('resolved', Boolean, nullable=False, default=False), Column('payload', Text, nullable=False),
            Column('created_at', DateTime(timezone=True), nullable=False))
        if create:
            meta.create_all(self.engine)

    def seed(self, shoes):
        # Git-reviewed JSON remains authoritative. Do not import scraped specs here.
        with self.engine.begin() as c:
            for shoe in shoes:
                payload = json.dumps(shoe, ensure_ascii=False)
                exists = c.execute(select(self.products.c.id).where(self.products.c.id == shoe['id'])).first()
                if exists:
                    c.execute(self.products.update().where(self.products.c.id == shoe['id']).values(payload=payload))
                else:
                    c.execute(self.products.insert().values(id=shoe['id'], payload=payload))

    def record(self, shoe, offer, now=None):
        with self.engine.begin() as c:
            c.execute(self.offers.insert().values(shoe_id=shoe['id'], source_url=shoe['source_url'],
                payload=json.dumps(offer), checked_at=now or utcnow()))

    def review(self, shoe_id, reason, payload=None):
        with self.engine.begin() as c:
            # One unresolved item per product/reason, not a new row every daily failure.
            existing = c.execute(select(self.reviews.c.id).where(
                self.reviews.c.shoe_id == shoe_id, self.reviews.c.reason == reason, self.reviews.c.resolved.is_(False))).first()
            if not existing:
                c.execute(self.reviews.insert().values(shoe_id=shoe_id, reason=reason,
                    payload=json.dumps(payload or {}, ensure_ascii=False), created_at=utcnow()))

    def review_items(self):
        with self.engine.connect() as c:
            return [dict(r._mapping) for r in c.execute(select(self.reviews).where(self.reviews.c.resolved.is_(False)))]

    def resolve_review(self, review_id):
        with self.engine.begin() as c:
            c.execute(self.reviews.update().where(self.reviews.c.id == review_id).values(resolved=True))

    def latest(self, now=None):
        cutoff = (now or utcnow()) - timedelta(days=7)
        with self.engine.connect() as c:
            rows = c.execute(select(self.offers).where(self.offers.c.checked_at >= cutoff)
                             .order_by(self.offers.c.checked_at.desc(), self.offers.c.id.desc()))
            result = {}
            for row in rows:
                if row.shoe_id not in result:
                    checked = row.checked_at
                    if checked.tzinfo is None:
                        checked = checked.replace(tzinfo=timezone.utc)
                    result[row.shoe_id] = {**json.loads(row.payload), 'sale_checked_at': checked.isoformat(),
                                           'sale_source_url': row.source_url}
            return result

    def prune(self):
        with self.engine.begin() as c:
            c.execute(delete(self.offers).where(self.offers.c.checked_at < utcnow() - timedelta(days=90)))
