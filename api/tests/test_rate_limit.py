import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ.setdefault("ANTHROPIC_API_KEY", "test")

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402
from rate_limit import ExplainLimiter  # noqa: E402


class Clock:
    def __init__(self):
        self.now = 1_800_000_000.0

    def __call__(self):
        return self.now


def test_per_client_window_blocks_then_recovers():
    clock = Clock()
    lim = ExplainLimiter(per_client=3, window_seconds=60, daily_cap=100, clock=clock)
    assert all(lim.check("a")[0] for _ in range(3))
    ok, retry = lim.check("a")
    assert not ok and 1 <= retry <= 60
    assert lim.check("b")[0]  # another client is unaffected
    clock.now += 61
    assert lim.check("a")[0]


def test_daily_cap_blocks_everyone_until_next_day():
    clock = Clock()
    lim = ExplainLimiter(per_client=100, window_seconds=60, daily_cap=3, clock=clock)
    assert lim.check("a")[0] and lim.check("b")[0] and lim.check("c")[0]
    assert not lim.check("d")[0]
    clock.now += 86_400
    assert lim.check("d")[0]


def test_blocked_requests_do_not_count():
    lim = ExplainLimiter(per_client=1, window_seconds=60, daily_cap=2, clock=Clock())
    assert lim.check("a")[0]
    for _ in range(5):
        assert not lim.check("a")[0]
    assert lim.check("b")[0]  # blocked attempts did not burn the daily cap


def test_endpoint_returns_429_with_retry_after(monkeypatch):
    monkeypatch.setattr(main, "explain_limiter", ExplainLimiter(per_client=0))
    client = TestClient(main.app)
    body = {"shoe": {"name": "x"}, "prefs": {}}
    res = client.post("/explain", json=body)
    assert res.status_code == 429 and "retry-after" in res.headers
