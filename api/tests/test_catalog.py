import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx
import pytest
sys.path.insert(0, str(Path(__file__).parents[1]))
os.environ.setdefault('ANTHROPIC_API_KEY', 'test')
import main
from catalog_store import CatalogStore
from catalog_sync import parse_offer, valid_source, sync
import catalog_prices

SHOE = next(s for s in main.SHOES if s['brand'] == 'LeMouton')
NOW = datetime.now(timezone.utc)


def html(price=116900, stock='InStock', **changes):
    group = {'@type':'ProductGroup', 'productGroupID':SHOE['source_product_id'],
             'name':SHOE['source_product_name'], 'hasVariant':[
        {'brand':{'name':'LeMouton'}, 'sku':SHOE['source_product_id'] + '_size1',
         'offers':{'priceCurrency':'KRW', 'price':price,
                   'availability':'https://schema.org/' + stock}}]}
    group.update(changes)
    return '<script type="application/ld+json">' + json.dumps(group) + '</script>'


def test_parser_requires_exact_model_and_valid_price():
    assert parse_offer(html(), SHOE)['sale_price'] == 116900
    for changes in ({'name':'different model'}, {'productGroupID':'wrong'}):
        with pytest.raises(ValueError):
            parse_offer(html(**changes), SHOE)
    for amount in (0, True, 0.5, 99999999, 'free'):
        with pytest.raises(ValueError):
            parse_offer(html(amount), SHOE)
    with pytest.raises(ValueError):
        parse_offer(html(stock='PreOrder'), SHOE)
    assert parse_offer(html(stock='OutOfStock'), SHOE) == {
        'sale_price':None, 'sale_price_max':None, 'sale_available':False}


def test_variant_range_uses_only_confirmed_in_stock_prices():
    data = json.loads(html().split('>',1)[1].split('</script>')[0])
    variant = json.loads(json.dumps(data['hasVariant'][0]))
    variant['offers']['price'] = 121900
    data['hasVariant'].append(variant)
    result = parse_offer('<script type="application/ld+json">'+json.dumps(data)+'</script>', SHOE)
    assert (result['sale_price'], result['sale_price_max']) == (116900, 121900)


def test_sources_cannot_redirect_to_arbitrary_servers():
    assert valid_source(SHOE)
    for url in ('http://www.lemouton.co.kr/product/detail.html?product_no=325',
                'https://evil.test/product/detail.html?product_no=325',
                SHOE['source_url'] + '&other=1'):
        assert not valid_source({**SHOE,'source_url':url})


def test_history_expiry_out_of_stock_and_review_dedup(tmp_path):
    store = CatalogStore('sqlite:///' + str(tmp_path/'catalog.db'), create=True)
    store.seed([SHOE]); store.seed([SHOE])
    assert len(store.engine.connect().execute(store.products.select()).all()) == 1
    store.record(SHOE, {'sale_price':116900, 'sale_available':True}, NOW - timedelta(days=8))
    assert store.latest(NOW) == {}
    store.record(SHOE, {'sale_price':116900, 'sale_available':True}, NOW)
    store.review(SHOE['id'],'identity_changed'); store.review(SHOE['id'],'identity_changed')
    assert len(store.review_items()) == 1
    assert store.latest(NOW)[SHOE['id']]['sale_price'] == 116900
    store.record(SHOE, {'sale_price':None, 'sale_available':False}, NOW + timedelta(seconds=1))
    assert store.latest(NOW + timedelta(seconds=1))[SHOE['id']]['sale_available'] is False


def test_sync_keeps_previous_price_on_failed_identity(tmp_path):
    store = CatalogStore('sqlite:///' + str(tmp_path/'catalog.db'), create=True)
    store.record(SHOE, {'sale_price':116900}, NOW)
    def respond(req):
        return httpx.Response(200, text='User-agent: *\nAllow: /' if req.url.path == '/robots.txt'
                              else html(name='wrong model'))
    with httpx.Client(transport=httpx.MockTransport(respond)) as client:
        assert sync([SHOE], store, client, pause=lambda _:None) == (0,1)
    assert store.latest()[SHOE['id']]['sale_price'] == 116900
    assert len(store.review_items()) == 1


def test_robots_disallow_prevents_product_fetch():
    requests = []
    def respond(req):
        requests.append(req.url.path)
        return httpx.Response(200, text='User-agent: *\nDisallow: /product/')
    with httpx.Client(transport=httpx.MockTransport(respond)) as client:
        assert sync([SHOE], client=client, pause=lambda _:None) == (0,1)
    assert requests == ['/robots.txt']


def test_missing_db_does_not_break_recommendations(monkeypatch):
    monkeypatch.setenv('CATALOG_PRICES_ENABLED','1')
    monkeypatch.delenv('DATABASE_URL', raising=False)
    assert catalog_prices.enrich([SHOE]) == [SHOE]


def test_new_models_only_in_walking_and_unknowns_never_match():
    added = [s for s in main.SHOES if s['brand'] == 'LeMouton']
    assert len(added) == 10
    for shoe in added:
        assert not main.is_running_candidate(shoe,'로드')
        assert main.is_comfort_candidate(shoe)
        assert shoe['drop_mm'] is None and shoe['cushion'] == '미확인' and shoe['width'] == '미확인'
    prefs = main.map_comfort_to_prefs(main.ComfortPrefs(where='출퇴근 · 통학', hours='2~5시간', pain=['없음'], wide_foot=False,budget=150000))
    assert main.compute_score(SHOE, prefs) == main.compute_score(SHOE,{**prefs, 'cushion':'최고','width':'넓음','weight_kg':90})
    result = main.run_recommendation(prefs,[],[SHOE])[0]
    assert result.drop_mm is None and result.specs_checked_at == '2026-10-05'
    system, user = main.build_explain_prompts(SHOE,{**prefs,'mode':'comfort'},'en')
    assert 'unknown' in system and 'unknown' in user
    assert 'Nonemm' not in user


def test_api_reads_only_matching_verified_offer_and_keeps_list_budget(monkeypatch, tmp_path):
    store = CatalogStore('sqlite:///' + str(tmp_path/'prices.db'), create=True)
    store.record(SHOE, {'sale_price':99000, 'sale_price_max':99000, 'sale_available':True}, NOW)
    monkeypatch.setenv('DATABASE_URL','sqlite:///' + str(tmp_path/'prices.db'))
    monkeypatch.setenv('CATALOG_PRICES_ENABLED','1')
    monkeypatch.setattr(catalog_prices,'_store',store)
    monkeypatch.setattr(catalog_prices,'_expires',0)
    monkeypatch.setattr(catalog_prices,'_cached',{})
    prefs = main.map_comfort_to_prefs(main.ComfortPrefs(where='출퇴근 · 통학',hours='2~5시간',pain=['없음'],wide_foot=False,budget=100000))
    result = main.run_recommendation(prefs,[],[SHOE])[0]
    assert result.sale_price == 99000 and result.price == 149000
    assert result.budget_status == 'over'  # selling price is not a list-price affordability claim
    assert catalog_prices.enrich([{**SHOE,'source_url':'https://different.test'}])[0].get('sale_price') is None


def test_failed_db_read_falls_back_and_review_can_be_resolved(monkeypatch, tmp_path):
    class Broken:
        def latest(self):
            raise RuntimeError('private details must not be logged')
    monkeypatch.setenv('DATABASE_URL','unused')
    monkeypatch.setenv('CATALOG_PRICES_ENABLED','1')
    monkeypatch.setattr(catalog_prices,'_store',Broken())
    monkeypatch.setattr(catalog_prices,'_expires',0)
    assert catalog_prices.enrich([SHOE]) == [SHOE]
    store = CatalogStore('sqlite:///' + str(tmp_path/'review.db'), create=True)
    store.review(SHOE['id'],'changed')
    store.resolve_review(store.review_items()[0]['id'])
    assert store.review_items() == []
    store.review(SHOE['id'],'changed')
    assert len(store.review_items()) == 1  # a later recurrence is reviewable
