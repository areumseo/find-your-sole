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
    order = {"within": 0, "unknown": 1, "over": 2}
    assert [(order[r.budget_status], -r.score) for r in results] == sorted(
        (order[r.budget_status], -r.score) for r in results)
    assert all(r.price_source == "kr_list" and r.price <= 150_000
               for r in results if r.budget_status == "within")
    assert all(r.price_source == "kr_list" and r.price > 150_000
               for r in results if r.over_budget)
    assert all(not r.over_budget for r in results if r.budget_status == "unknown")


def test_a_generous_budget_flags_nothing():
    assert not any(r.over_budget for r in run(1_000_000))


def test_a_tiny_budget_keeps_unknown_prices_separate():
    results = run(10_000)
    assert results and all(r.budget_status in ("unknown", "over") for r in results)


def test_budget_flag_is_in_the_api_response():
    from fastapi.testclient import TestClient

    res = TestClient(main.app).post("/recommend/expert", json={
        "arch": "normal", "pronation": "neutral", "terrain": "로드", "use_case": ["데일리"], "cushion": "중간",
        "width": "보통", "weekly_km": 20, "budget": 100_000}).json()
    assert all("over_budget" in r for r in res)
    assert res[0]["over_budget"] is False or all(r["over_budget"] for r in res)


def test_estimates_do_not_claim_affordability_or_affect_price_score():
    base = dict(main.SHOES[0])
    cheap = {**base, "id": 901, "price_source": "estimate", "price": 1000}
    costly = {**base, "id": 902, "price_source": "estimate", "price": 900000}
    unknown = {**base, "id": 903, "price_source": None, "price": 1000}
    known = {**base, "id": 904, "price_source": "kr_list", "price": 150000}
    over = {**base, "id": 905, "price_source": "kr_list", "price": 150001}
    results = run(150000, [over, cheap, costly, unknown, known])
    assert results[0].id == 904 and results[-1].id == 905
    middle = results[1:4]
    assert all(r.budget_status == "unknown" and not r.over_budget for r in middle)
    assert len({r.score for r in middle}) == 1


def test_results_carry_the_brands_official_site():
    results = run(1_000_000)
    assert results and all(r.brand_url and r.brand_url.startswith("https://") for r in results)
    by_id = {s["id"]: s for s in main.SHOES}
    assert all(r.brand_url == by_id[r.id]["url"] for r in results)
