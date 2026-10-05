import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ.setdefault("ANTHROPIC_API_KEY", "test")

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402

KST = timezone(timedelta(hours=9))


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
