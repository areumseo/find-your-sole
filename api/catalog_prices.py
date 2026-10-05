"""Optional, cached read of Cron's verified price observations; never scrape on requests."""
import os
import threading
import time
try:
    from catalog_store import CatalogStore
except ModuleNotFoundError:
    from api.catalog_store import CatalogStore

_lock = threading.Lock()
_store = None
_cached = {}
_expires = 0.0


def prices():
    global _store, _cached, _expires
    if os.environ.get('CATALOG_PRICES_ENABLED') != '1' or not os.environ.get('DATABASE_URL'):
        return {}
    with _lock:
        if time.monotonic() < _expires:
            return _cached
        try:
            if _store is None:
                _store = CatalogStore(os.environ['DATABASE_URL'])
            _cached = _store.latest()
        except Exception as exc:
            # Do not keep stale prices after a failed read. Recommendations still use reviewed JSON.
            _cached = {}
            print(f'catalog prices unavailable ({type(exc).__name__})')
        _expires = time.monotonic() + 300
        return _cached


def enrich(shoes):
    offers = prices()
    return [{**shoe, **(offers.get(shoe['id'], {}) if
             offers.get(shoe['id'], {}).get('sale_source_url') == shoe.get('source_url') else {})}
            for shoe in shoes]
