"""Tests for the news module. Run from the api/ folder:  python -m pytest tests"""
import asyncio
import logging
import os
import sys
from datetime import datetime, timedelta, timezone
from email.utils import format_datetime

import httpx
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")

import shoe_news  # noqa: E402
from shoe_news import NewsService, parse_items  # noqa: E402

NOW = datetime(2026, 10, 5, 12, 0, tzinfo=timezone.utc)


def pub(days_ago: float = 1) -> str:
    return format_datetime(NOW - timedelta(days=days_ago))


def raw(title, url="https://www.example.com/a", days_ago=1, **extra):
    return {"title": title, "originallink": url, "link": "https://n.news.naver.com/x", "description": "",
            "pubDate": pub(days_ago), **extra}


# ── parsing ───────────────────────────────────────────────────────────────────
def test_strips_tags_and_entities_and_extracts_source():
    [item] = parse_items([raw("나이키, 새 <b>러닝화</b> 출시 &quot;페가수스&quot; &amp; 신제품")], NOW)
    assert item.title == '나이키, 새 러닝화 출시 "페가수스" & 신제품'
    assert item.source == "example.com"  # "www." removed


def test_naver_links_are_labelled_as_naver_news():
    [item] = parse_items([{**raw("호카 러닝화 신제품 출시"), "originallink": ""}], NOW)
    assert item.source == "네이버 뉴스" and item.url == "https://n.news.naver.com/x"


@pytest.mark.parametrize("title", [
    "삼성전자 신제품 출시",               # not a shoe
    "나이키 러닝화 상품 후기",            # shoe, but not launch news
    "러닝화 신제품 출시 기념 특가 할인",   # promo
    "러닝화 신제품 출시 쿠폰 증정 이벤트",
])
def test_irrelevant_and_promo_items_are_dropped(title):
    assert parse_items([raw(title)], NOW) == []


def test_old_future_and_malformed_items_are_dropped():
    items = [raw("러닝화 신제품 출시", days_ago=61), raw("러닝화 신제품 출시 2", days_ago=-3),
             {"title": "러닝화 신제품 출시 3", "originallink": "https://a.com/1"},            # no date
             {**raw("러닝화 신제품 출시 4"), "pubDate": "not a date"},
             raw("러닝화 신제품 출시 5", url="javascript:alert(1)"),                         # unsafe link
             raw("러닝화 신제품 출시 6", days_ago=59)]
    assert [i.title for i in parse_items(items, NOW)] == ["러닝화 신제품 출시 6"]


def test_duplicates_by_title_and_by_url_are_removed():
    items = [raw("나이키 러닝화 신제품 출시", url="https://a.com/1"),
             raw("나이키  러닝화 <b>신제품</b> 출시!", url="https://b.com/2"),   # same title once normalised
             raw("아디다스 러닝화 신제품 출시", url="https://a.com/1")]          # same url
    assert [i.url for i in parse_items(items, NOW)] == ["https://a.com/1"]


def test_sorted_newest_first_and_capped():
    items = [raw(f"러닝화 신제품 출시 {n}", url=f"https://a.com/{n}", days_ago=n) for n in range(1, 15)]
    out = parse_items(list(reversed(items)), NOW)
    assert len(out) == shoe_news.MAX_ITEMS
    assert [i.url for i in out] == [f"https://a.com/{n}" for n in range(1, 9)]


# ── service: fetching, caching, failure ───────────────────────────────────────
class Upstream:
    """Fake Naver. Records requests; behaviour is switchable."""
    def __init__(self):
        self.requests, self.mode = [], "ok"

    def handler(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        if self.mode == "ok":
            n = len(self.requests)
            return httpx.Response(200, json={"items": [raw(f"러닝화 신제품 출시 {request.url.params['query']}", url=f"https://a.com/{n}")]})
        if self.mode == "401":
            return httpx.Response(401, json={"errorMessage": "Authentication failed"})
        if self.mode == "partial":
            if "워킹화" in request.url.params["query"]:
                return httpx.Response(200, json={"items": [raw("워킹화 신제품 출시")]})
            return httpx.Response(500)
        raise httpx.ConnectError("boom", request=request)


def make(upstream, clock, **kw):
    return NewsService("my-id", "my-secret", transport=httpx.MockTransport(upstream.handler), clock=clock, **kw)


class Clock:
    def __init__(self): self.t = NOW.timestamp()
    def __call__(self): return self.t


def run(coro): return asyncio.run(coro)


def test_without_keys_returns_empty_and_never_calls_naver():
    up = Upstream()
    svc = NewsService(None, "x", transport=httpx.MockTransport(up.handler))
    assert run(svc.get()) == [] and up.requests == []


def test_sends_credentials_and_expected_query():
    up, clock = Upstream(), Clock()
    run(make(up, clock).get())
    first = up.requests[0]
    assert first.headers["X-NCP-APIGW-API-KEY-ID"] == "my-id" and first.headers["X-NCP-APIGW-API-KEY"] == "my-secret"
    assert first.url.params["sort"] == "date" and first.url.params["display"] == "30"
    assert {r.url.params["query"] for r in up.requests} == set(shoe_news.QUERIES)


def test_second_call_within_ttl_is_served_from_cache_then_refreshes():
    up, clock = Upstream(), Clock()
    svc = make(up, clock, ttl=3600)
    run(svc.get()); calls = len(up.requests)
    run(svc.get()); run(svc.get())
    assert len(up.requests) == calls                      # no extra upstream traffic
    clock.t += 3601
    run(svc.get())
    assert len(up.requests) == calls * 2                  # refreshed after the ttl


def test_concurrent_requests_trigger_a_single_refresh():
    up, clock = Upstream(), Clock()
    svc = make(up, clock)
    async def many(): return await asyncio.gather(*[svc.get() for _ in range(20)])
    results = run(many())
    assert len(up.requests) == len(shoe_news.QUERIES) and all(r == results[0] for r in results)


def test_failure_serves_stale_data_and_backs_off():
    up, clock = Upstream(), Clock()
    svc = make(up, clock, ttl=100, retry_after=300, stale_ttl=1000)
    good = run(svc.get()); assert good
    up.mode = "down"; clock.t += 101
    calls = len(up.requests)
    assert run(svc.get()) == good                          # stale data, not an error
    after_first_failure = len(up.requests)
    assert after_first_failure > calls
    run(svc.get()); run(svc.get())
    assert len(up.requests) == after_first_failure        # backing off: no hammering a failing API
    clock.t += 301
    run(svc.get())
    assert len(up.requests) > after_first_failure         # tries again after the backoff


def test_stale_data_expires():
    up, clock = Upstream(), Clock()
    svc = make(up, clock, ttl=100, retry_after=10, stale_ttl=500)
    run(svc.get()); up.mode = "down"; clock.t += 600
    assert run(svc.get()) == []


def test_failure_with_no_data_returns_empty_not_an_error():
    up, clock = Upstream(), Clock(); up.mode = "down"
    assert run(make(up, clock).get()) == []


def test_partial_failure_still_returns_the_queries_that_worked():
    up, clock = Upstream(), Clock(); up.mode = "partial"
    assert [i.title for i in run(make(up, clock).get())] == ["워킹화 신제품 출시"]


def test_bad_credentials_do_not_leak_into_logs(caplog):
    up, clock = Upstream(), Clock(); up.mode = "401"
    with caplog.at_level(logging.DEBUG):
        assert run(make(up, clock).get()) == []
    assert "my-secret" not in caplog.text and "my-id" not in caplog.text


# ── endpoint ──────────────────────────────────────────────────────────────────
def test_endpoint_shape_and_cache_headers(monkeypatch):
    from fastapi.testclient import TestClient
    import main
    up, clock = Upstream(), Clock()
    monkeypatch.setattr(shoe_news, "service", make(up, clock))
    c = TestClient(main.app)
    r = c.get("/news")
    assert r.status_code == 200 and r.headers["cache-control"] == "public, max-age=600"
    body = r.json()
    assert body and set(body[0]) == {"title", "source", "url", "published_at"}

    monkeypatch.setattr(shoe_news, "service", NewsService(None, None))
    r = c.get("/news")
    assert r.status_code == 200 and r.json() == [] and r.headers["cache-control"] == "public, max-age=60"
