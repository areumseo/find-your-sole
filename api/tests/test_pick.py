import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ.setdefault("ANTHROPIC_API_KEY", "test")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402

KST = timezone(timedelta(hours=9))


@pytest.fixture(autouse=True)
def no_real_ai(monkeypatch):
    """Never call Claude from tests; start each test with an empty comment cache."""
    main._pick_comments.clear()
    monkeypatch.setattr(main, "generate_pick_comment", lambda shoe, locale: "")


def test_pick_is_stable_within_a_day_and_changes_next_day():
    morning = datetime(2026, 10, 5, 0, 5, tzinfo=KST)
    night = datetime(2026, 10, 5, 23, 55, tzinfo=KST)
    assert main.pick_of_the_day(morning)["id"] == main.pick_of_the_day(night)["id"]
    ids = {main.pick_of_the_day(morning + timedelta(days=d))["id"] for d in range(14)}
    assert len(ids) >= 10  # a fortnight of picks is varied


def test_pick_endpoint_shape_and_locale():
    client = TestClient(main.app)
    ko = client.get("/pick").json()
    assert {"name", "brand", "price", "reason", "naver_url"} <= ko.keys()
    assert ko["naver_url"].startswith("https://search.shopping.naver.com/")
    en = client.get("/pick?locale=en").json()
    assert en["name"] == ko["name"] and "cushioning" in en["reason"]
    assert client.get("/pick").headers["cache-control"] == "public, max-age=1800"


def test_news_exposes_last_refresh_time(monkeypatch):
    import shoe_news

    item = shoe_news.NewsItem(title="t", source="s", url="https://e.com", published_at="2026-10-05T00:00:00+00:00")

    async def fake_get():
        return [item]

    monkeypatch.setattr(shoe_news.service, "get", fake_get)
    monkeypatch.setattr(shoe_news.service, "updated_at", 1_790_000_000.0)
    res = TestClient(main.app).get("/news")
    assert res.headers["x-news-updated"] == "2026-09-21T14:13:20Z"


def test_price_source_and_usd_reach_the_clients():
    client = TestClient(main.app)
    est = next(s for s in main.SHOES if s.get("price_source") == "estimate")
    res = client.post("/recommend/expert", json={
        "arch": "normal", "pronation": "neutral", "terrain": "로드", "use_case": ["데일리"],
        "cushion": "중간", "width": "보통", "weekly_km": 20, "budget": 1_000_000,
    }).json()
    assert all("price_source" in r for r in res)
    pick = client.get("/pick").json()
    assert "price_source" in pick and "price_usd" in pick
    assert isinstance(est["price_usd"], int)


def test_pick_only_comes_from_everyday_road_shoes():
    start = datetime(2026, 10, 1, 12, tzinfo=KST)
    for d in range(120):
        shoe = main.pick_of_the_day(start + timedelta(days=d))
        assert "로드" in shoe["terrain"]
        assert "데일리" in shoe["use_case"] or "walking" in shoe.get("categories", [])


def test_ai_comment_is_generated_once_per_day_and_language(monkeypatch):
    calls = []

    def fake(shoe, locale):
        calls.append(locale)
        return f"솔이 코멘트 ({locale})"

    monkeypatch.setattr(main, "generate_pick_comment", fake)
    client = TestClient(main.app)
    for _ in range(3):
        assert client.get("/pick").json()["reason"] == "솔이 코멘트 (ko)"
    assert client.get("/pick?locale=en").json()["reason"] == "솔이 코멘트 (en)"
    assert calls == ["ko", "en"]


def test_pick_falls_back_to_the_plain_sentence_when_ai_fails(monkeypatch):
    def boom(shoe, locale):
        raise RuntimeError("api down")

    monkeypatch.setattr(main, "generate_pick_comment", boom)
    reason = TestClient(main.app).get("/pick").json()["reason"]
    assert "쿠션은" in reason
    # The failure is remembered for the day instead of retrying on every visit.
    monkeypatch.setattr(main, "generate_pick_comment", lambda shoe, locale: pytest.fail("retried"))
    assert TestClient(main.app).get("/pick").json()["reason"] == reason
