"""Daily official-store prices. python -m api.catalog_sync [--dry-run | --reviews]
New products/specs require a reviewed shoes_data.json change; never auto-publish them.
"""
import argparse
import json
import os
import time
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from urllib.robotparser import RobotFileParser
import httpx
try:
    from catalog_store import CatalogStore
except ModuleNotFoundError:
    from api.catalog_store import CatalogStore

USER_AGENT = 'FindYourSoleCatalog/1.0 (+https://findyoursole.app/)'
MAX_BYTES = 3_000_000


class StructuredData(HTMLParser):
    def __init__(self):
        super().__init__()
        self.collect = False
        self.parts = []
        self.blocks = []
    def handle_starttag(self, tag, attrs):
        if tag == 'script' and dict(attrs).get('type') == 'application/ld+json':
            self.collect = True
            self.parts = []
    def handle_data(self, data):
        if self.collect:
            self.parts.append(data)
    def handle_endtag(self, tag):
        if tag == 'script' and self.collect:
            self.blocks.append(''.join(self.parts))
            self.collect = False


def valid_source(shoe):
    u = urlparse(shoe.get('source_url', ''))
    pid = shoe.get('source_product_id', '').removeprefix('cafe24_lemouton_1_')
    return (u.scheme == 'https' and u.netloc == 'www.lemouton.co.kr'
            and u.path == '/product/detail.html' and pid.isdigit()
            and parse_qs(u.query) == {'product_no': [pid]})


def parse_offer(html, shoe):
    parser = StructuredData()
    parser.feed(html)
    group = None
    for block in parser.blocks:
        try:
            data = json.loads(block)
        except ValueError:
            continue
        entries = data if isinstance(data, list) else data.get('@graph', [data]) if isinstance(data, dict) else []
        for entry in entries:
            if isinstance(entry, dict) and entry.get('@type') == 'ProductGroup' and entry.get('productGroupID') == shoe['source_product_id']:
                group = entry
    if group is None or group.get('name') != shoe['source_product_name']:
        raise ValueError('product_identity_changed')
    prices = []
    known_out = 0
    variants = group.get('hasVariant', [])
    if not isinstance(variants, list) or not variants:
        raise ValueError('no_variants')
    for v in variants:
        brand = v.get('brand', {})
        sku = v.get('sku', '')
        if brand.get('name') != 'LeMouton' or not sku.startswith(shoe['source_product_id'] + '_'):
            raise ValueError('variant_identity_changed')
        offer = v.get('offers', {})
        if not isinstance(offer, dict) or offer.get('priceCurrency') != 'KRW':
            raise ValueError('unknown_currency')
        state = offer.get('availability', '').rsplit('/', 1)[-1]
        if state == 'OutOfStock':
            known_out += 1
            continue
        if state != 'InStock':
            raise ValueError('unknown_availability')
        price = offer.get('price')
        # Reject boolean, fractional, zero or implausible prices rather than overwriting good data.
        if isinstance(price, bool):
            raise ValueError('invalid_price')
        try:
            amount = int(price)
        except (TypeError, ValueError):
            raise ValueError('invalid_price') from None
        if str(amount) != str(price) or not 10000 <= amount <= 1000000:
            raise ValueError('invalid_price')
        prices.append(amount)
    if not prices and known_out != len(variants):
        raise ValueError('no_confirmed_offer')
    return {'sale_price': min(prices) if prices else None,
            'sale_price_max': max(prices) if prices else None, 'sale_available': bool(prices)}


def fetch_text(client, url):
    # No redirects: never follow a page-controlled URL to another host.
    with client.stream('GET', url) as response:
        response.raise_for_status()
        if response.status_code != 200:
            raise ValueError('unexpected_response')
        chunks, size = [], 0
        for chunk in response.iter_bytes():
            size += len(chunk)
            if size > MAX_BYTES:
                raise ValueError('response_too_large')
            chunks.append(chunk)
        return b''.join(chunks).decode('utf-8')


def sync(shoes, store=None, client=None, pause=time.sleep):
    client = client or httpx.Client(timeout=15, follow_redirects=False,
                                   headers={'User-Agent': USER_AGENT})
    count = failed = 0
    # A failed or restrictive robots request stops collection (keeps previous data).
    robots = RobotFileParser('https://www.lemouton.co.kr/robots.txt')
    robots.parse(fetch_text(client, robots.url).splitlines())
    for shoe in shoes:
        if not shoe.get('source_product_id'):
            continue
        try:
            if not valid_source(shoe) or not robots.can_fetch(USER_AGENT, shoe['source_url']):
                raise ValueError('source_not_allowed')
            offer = parse_offer(fetch_text(client, shoe['source_url']), shoe)
            if store:
                store.record(shoe, offer)
            count += 1
            print(f"shoe {shoe['id']}: verified offer")
        except Exception as exc:
            failed += 1
            # Never log response bodies, credentials, or exception messages from network/DB clients.
            reason = str(exc) if type(exc) is ValueError else type(exc).__name__
            if store:
                store.review(shoe['id'], reason)
            print(f"shoe {shoe['id']}: review required ({reason})")
        pause(1)
    if store:
        store.prune()
    return count, failed


def run_main():
    parser = argparse.ArgumentParser()
    actions = parser.add_mutually_exclusive_group()
    actions.add_argument('--dry-run', action='store_true', help='Read public sources without writing to a database')
    actions.add_argument('--reviews', action='store_true', help='Print the review queue without fetching sources')
    actions.add_argument('--resolve-review', type=int, help='Mark a reviewed queue item as resolved')
    args = parser.parse_args()
    shoes = json.loads((Path(__file__).parent.parent / 'shoes_data.json').read_text())
    store = None
    if not args.dry_run:
        url = os.environ.get('DATABASE_URL', '').strip()
        if not url:
            raise SystemExit('DATABASE_URL is required; use --dry-run to verify sources first')
        store = CatalogStore(url, create=True)
    if args.resolve_review is not None:
        store.resolve_review(args.resolve_review)
        print(f'Review {args.resolve_review} resolved')
        return
    if args.reviews:
        if not store:
            raise SystemExit('--reviews requires DATABASE_URL')
        for row in store.review_items():
            print(f"review {row['id']} / shoe {row['shoe_id']}: {row['reason']}")
        return
    if store:
        store.seed(shoes)
    try:
        with httpx.Client(timeout=15, follow_redirects=False, headers={'User-Agent': USER_AGENT}) as client:
            count, failed = sync(shoes, store, client)
    except Exception as exc:
        print(f'catalog sync failed ({type(exc).__name__})')
        raise SystemExit(1) from None
    print(f'{count} verified, {failed} needing review')
    if failed or not count:
        raise SystemExit(1)


def main():
    try:
        run_main()
    except Exception as exc:
        print(f'catalog sync failed ({type(exc).__name__})')
        raise SystemExit(1) from None


if __name__ == '__main__':
    main()
