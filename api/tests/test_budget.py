import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ.setdefault("ANTHROPIC_API_KEY", "test")

import main  # noqa: E402


def run(budget, shoes=None):
    prefs = {"arch": "normal", "pronation": "neutral", "terrain": "로드", "use_case": ["데일리"], "cushion": "중간",
             "width": "보통", "weekly_km": 20, "budget": budget, "weight_kg": None}
    return main.run_recommendation(prefs, [], shoes)


def test_shoes_within_budget_come_first_then_flagged_ones():
    results = run(150_000)
    flags = [r.over_budget for r in results]
    assert flags == sorted(flags)  # all False first, then all True
    assert all(r.price <= 150_000 for r in results if not r.over_budget)
    assert all(r.price > 150_000 for r in results if r.over_budget)
    first_over = next((i for i, f in enumerate(flags) if f), len(flags))
    in_budget = results[:first_over]
    assert [r.score for r in in_budget] == sorted((r.score for r in in_budget), reverse=True)


def test_a_generous_budget_flags_nothing():
    assert not any(r.over_budget for r in run(1_000_000))


def test_a_tiny_budget_still_returns_results_all_flagged():
    results = run(10_000)
    assert len(results) > 0 and all(r.over_budget for r in results)


def test_budget_flag_is_in_the_api_response():
    from fastapi.testclient import TestClient

    res = TestClient(main.app).post("/recommend/expert", json={
        "arch": "normal", "pronation": "neutral", "terrain": "로드", "use_case": ["데일리"], "cushion": "중간",
        "width": "보통", "weekly_km": 20, "budget": 100_000}).json()
    assert all("over_budget" in r for r in res)
    assert res[0]["over_budget"] is False or all(r["over_budget"] for r in res)
