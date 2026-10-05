"""Anonymous feedback: users send a note (and optionally one screenshot), the admin reads it.

There are no accounts, so:
- senders are told apart only by IP for rate limiting (never stored),
- the admin endpoints need the ADMIN_TOKEN environment variable as a Bearer token.

Storage is Postgres when DATABASE_URL is set (rows survive restarts and deploys).
Without it, feedback is kept in memory, which is only meant for local development.
"""
from __future__ import annotations

import base64
import binascii
import hmac
import os
import threading
from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field

try:  # started from api/ (`uvicorn main:app`)
    from rate_limit import ExplainLimiter
except ModuleNotFoundError:  # started from the repo root (`uvicorn api.main:app`)
    from api.rate_limit import ExplainLimiter

MAX_MESSAGE = 2000
MAX_CONTEXT = 200
MAX_SCREENSHOT_BYTES = 1_500_000  # decoded; the web app shrinks phone screenshots below this

# (magic bytes at the start of the file, mime type). The client's own claim is never trusted.
IMAGE_SIGNATURES = [
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"GIF87a", "image/gif"),
    (b"GIF89a", "image/gif"),
]


def sniff_image(data: bytes) -> Optional[str]:
    for magic, mime in IMAGE_SIGNATURES:
        if data.startswith(magic):
            return mime
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


# ── Storage ───────────────────────────────────────────────────
class Store:
    def add(self, message: str, context: str, mime: Optional[str], screenshot_b64: Optional[str]) -> int:
        raise NotImplementedError

    def list(self) -> List[Dict]:
        raise NotImplementedError

    def screenshot(self, feedback_id: int) -> Optional[Dict]:
        raise NotImplementedError

    def set_resolved(self, feedback_id: int, resolved: Optional[bool]) -> Optional[bool]:
        """Set (or toggle when `resolved` is None) the flag. Returns the new value, None if missing."""
        raise NotImplementedError


class MemoryStore(Store):
    def __init__(self) -> None:
        self._rows: List[Dict] = []
        self._next = 1
        self._lock = threading.Lock()

    def add(self, message, context, mime, screenshot_b64):
        with self._lock:
            row = {"id": self._next, "message": message, "context": context,
                   "created_at": datetime.now(timezone.utc), "resolved": False,
                   "screenshot_mime": mime, "screenshot": screenshot_b64}
            self._next += 1
            self._rows.append(row)
            return row["id"]

    def list(self):
        with self._lock:
            return [self._public(r) for r in sorted(self._rows, key=lambda r: r["id"], reverse=True)]

    def screenshot(self, feedback_id):
        with self._lock:
            for r in self._rows:
                if r["id"] == feedback_id and r["screenshot"]:
                    return {"mime": r["screenshot_mime"], "data": r["screenshot"]}
        return None

    def set_resolved(self, feedback_id, resolved):
        with self._lock:
            for r in self._rows:
                if r["id"] == feedback_id:
                    r["resolved"] = (not r["resolved"]) if resolved is None else resolved
                    return r["resolved"]
        return None

    @staticmethod
    def _public(r: Dict) -> Dict:
        return {"id": r["id"], "message": r["message"], "context": r["context"],
                "created_at": r["created_at"].strftime("%Y-%m-%dT%H:%M:%SZ"),
                "resolved": r["resolved"], "has_screenshot": bool(r["screenshot"])}


class SqlStore(Store):
    """SQLAlchemy-backed store (Postgres in production, SQLite in tests)."""

    def __init__(self, url: str) -> None:
        from sqlalchemy import Boolean, Column, DateTime, Integer, MetaData, String, Table, Text, create_engine

        # Neon/Render hand out postgres:// or postgresql:// URLs; pick the psycopg 3 driver.
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                url = "postgresql+psycopg://" + url[len(prefix):]
        self._engine = create_engine(url, pool_pre_ping=True, future=True)
        meta = MetaData()
        self._table = Table(
            "feedback", meta,
            Column("id", Integer, primary_key=True, autoincrement=True),
            Column("message", Text, nullable=False),
            Column("context", String(MAX_CONTEXT), nullable=False, default=""),
            Column("created_at", DateTime(timezone=True), nullable=False),
            Column("resolved", Boolean, nullable=False, default=False),
            Column("screenshot_mime", String(32), nullable=True),
            Column("screenshot", Text, nullable=True),
        )
        meta.create_all(self._engine)  # the table is created on first use

    def add(self, message, context, mime, screenshot_b64):
        with self._engine.begin() as conn:
            result = conn.execute(self._table.insert().values(
                message=message, context=context, created_at=datetime.now(timezone.utc),
                resolved=False, screenshot_mime=mime, screenshot=screenshot_b64))
            return int(result.inserted_primary_key[0])

    def list(self):
        from sqlalchemy import select

        t = self._table
        # The screenshot column is only checked for presence, never loaded into the list.
        stmt = select(t.c.id, t.c.message, t.c.context, t.c.created_at, t.c.resolved,
                      (t.c.screenshot.isnot(None)).label("has_screenshot")).order_by(t.c.id.desc())
        with self._engine.connect() as conn:
            rows = conn.execute(stmt).all()
        out = []
        for r in rows:
            created = r.created_at if r.created_at.tzinfo else r.created_at.replace(tzinfo=timezone.utc)
            out.append({"id": r.id, "message": r.message, "context": r.context,
                        "created_at": created.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                        "resolved": bool(r.resolved), "has_screenshot": bool(r.has_screenshot)})
        return out

    def screenshot(self, feedback_id):
        from sqlalchemy import select

        t = self._table
        with self._engine.connect() as conn:
            row = conn.execute(select(t.c.screenshot_mime, t.c.screenshot).where(t.c.id == feedback_id)).first()
        if row and row.screenshot:
            return {"mime": row.screenshot_mime, "data": row.screenshot}
        return None

    def set_resolved(self, feedback_id, resolved):
        from sqlalchemy import select

        t = self._table
        with self._engine.begin() as conn:
            row = conn.execute(select(t.c.resolved).where(t.c.id == feedback_id)).first()
            if row is None:
                return None
            new = (not row.resolved) if resolved is None else resolved
            conn.execute(t.update().where(t.c.id == feedback_id).values(resolved=new))
            return new


def make_store() -> Store:
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        print("DATABASE_URL not set; feedback is kept in memory and is lost on restart")
        return MemoryStore()
    return SqlStore(url)


# ── Wiring (replaceable in tests) ─────────────────────────────
class State:
    store: Optional[Store] = None
    send_limiter = ExplainLimiter(
        per_client=int(os.environ.get("FEEDBACK_PER_CLIENT", 5)),
        window_seconds=float(os.environ.get("FEEDBACK_WINDOW_SECONDS", 600)),
        daily_cap=int(os.environ.get("FEEDBACK_DAILY_CAP", 200)),
    )
    # Failed admin-token attempts per client: slows down guessing.
    admin_limiter = ExplainLimiter(per_client=10, window_seconds=600, daily_cap=10_000)


def get_store() -> Store:
    if State.store is None:
        State.store = make_store()
    return State.store


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


router = APIRouter()


class FeedbackIn(BaseModel):
    message: str = Field(max_length=10_000)  # trimmed and checked against MAX_MESSAGE below
    context: str = Field(default="", max_length=1_000)
    screenshot: Optional[str] = None  # base64 of a single image
    website: str = ""  # honeypot: real users never see or fill this


@router.post("/feedback", status_code=201)
def send_feedback(body: FeedbackIn, request: Request, store: Store = Depends(get_store)):
    message = body.message.strip()
    if not message or len(message) > MAX_MESSAGE:
        raise HTTPException(status_code=422, detail=f"message must be 1-{MAX_MESSAGE} characters")
    context = body.context.strip()[:MAX_CONTEXT]

    if body.website:  # a bot filled the hidden field: pretend it worked, store nothing
        return {"ok": True}

    mime: Optional[str] = None
    screenshot_b64: Optional[str] = None
    if body.screenshot:
        raw = body.screenshot.split(",", 1)[-1]  # tolerate a data: URL prefix
        if len(raw) > MAX_SCREENSHOT_BYTES * 4 // 3 + 16:
            raise HTTPException(status_code=413, detail="screenshot is too large")
        try:
            data = base64.b64decode(raw, validate=True)
        except (binascii.Error, ValueError):
            raise HTTPException(status_code=422, detail="screenshot is not valid base64")
        if len(data) > MAX_SCREENSHOT_BYTES:
            raise HTTPException(status_code=413, detail="screenshot is too large")
        mime = sniff_image(data)
        if mime is None:
            raise HTTPException(status_code=422, detail="screenshot must be a png, jpeg, gif or webp image")
        screenshot_b64 = base64.b64encode(data).decode("ascii")

    allowed, retry_after = State.send_limiter.check(client_ip(request))
    if not allowed:
        raise HTTPException(status_code=429, detail="Too many feedback messages. Please try again later.",
                            headers={"Retry-After": str(retry_after)})

    feedback_id = store.add(message, context, mime, screenshot_b64)
    return {"ok": True, "id": feedback_id}


# ── Admin ─────────────────────────────────────────────────────
def require_admin(request: Request, authorization: str = Header(default="")) -> None:
    token = os.environ.get("ADMIN_TOKEN", "")
    if not token:
        raise HTTPException(status_code=404, detail="Not found")  # admin is off until a token is set
    given = authorization[7:] if authorization.lower().startswith("bearer ") else ""
    if not hmac.compare_digest(given.encode(), token.encode()):
        ok, retry_after = State.admin_limiter.check(client_ip(request))  # counts only failures
        if not ok:
            raise HTTPException(status_code=429, detail="Too many attempts", headers={"Retry-After": str(retry_after)})
        raise HTTPException(status_code=401, detail="Invalid admin token")


@router.get("/admin/feedback", dependencies=[Depends(require_admin)])
def list_feedback(store: Store = Depends(get_store)):
    return store.list()


@router.get("/admin/feedback/{feedback_id}/screenshot", dependencies=[Depends(require_admin)])
def feedback_screenshot(feedback_id: int, store: Store = Depends(get_store)):
    from fastapi.responses import Response

    shot = store.screenshot(feedback_id)
    if shot is None:
        raise HTTPException(status_code=404, detail="No screenshot")
    return Response(content=base64.b64decode(shot["data"]), media_type=shot["mime"],
                    headers={"Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff"})


@router.post("/admin/feedback/{feedback_id}/resolve", dependencies=[Depends(require_admin)])
def resolve_feedback(feedback_id: int, store: Store = Depends(get_store)):
    new = store.set_resolved(feedback_id, None)
    if new is None:
        raise HTTPException(status_code=404, detail="Not found")
    return {"id": feedback_id, "resolved": new}
