import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ.setdefault("ANTHROPIC_API_KEY", "test")

import main  # noqa: E402


def run(budget, shoes=None):
    prefs = {"arch": "normal", "pronation": "neutral", "terrain": "로드", "use_case": ["데일리"], "cushion": "중간",
             "width": "보통", "weekly_km": 20, "budget": budget, "weight_kg": None}
    return main.run_recommendation(prefs, [], shoes)


def test_korean_prices_first_within_then_over_then_unknown():
    results = run(150_000)
    order = {"within": 0, "over": 1, "unknown": 2}
    assert [(order[r.budget_status], -r.score, r.id) for r in results] == sorted(
        (order[r.budget_status], -r.score, r.id) for r in results)
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
    assert results[0].id == 904 and results[1].id == 905
    unpriced = results[2:]
    assert all(r.budget_status == "unknown" and not r.over_budget for r in unpriced)
    assert len({r.score for r in unpriced}) == 1


def test_results_carry_the_brands_official_site():
    results = run(1_000_000)
    assert results and all(r.brand_url and r.brand_url.startswith("https://") for r in results)
    by_id = {s["id"]: s for s in main.SHOES}
    assert all(r.brand_url == by_id[r.id]["url"] for r in results)


def test_overseas_priced_model_comes_after_korean_priced_ones_even_with_better_fit():
    base = dict(main.SHOES[0])
    known = {**base, "id": 910, "price_source": "kr_list", "price": 120000, "score_base": 60}
    unknown = {**base, "id": 911, "price_source": "estimate", "price": 999999, "score_base": 90}
    over = {**base, "id": 912, "price_source": "kr_list", "price": 160000, "score_base": 100}
    results = run(150000, [known, over, unknown])
    assert [r.id for r in results] == [910, 912, 911]
    assert results[0].budget_status == "within"
    assert results[1].over_budget
    assert results[2].budget_status == "unknown" and not results[2].over_budget


def test_equal_scores_in_a_group_keep_stable_id_order():
    base = dict(main.SHOES[0])
    known = {**base, "id": 920, "price_source": "kr_list", "price": 120000, "score_base": 60}
    unknown = {**base, "id": 921, "price_source": "estimate", "score_base": 65}
    other = {**unknown, "id": 922, "brand": "Other"}
    results = run(150000, [other, unknown, known])
    assert len({r.score for r in results}) == 1
    assert [r.id for r in results] == [920, 921, 922]


def test_fifteen_man_budget_opens_with_confirmed_affordable_shoes_in_both_running_modes():
    beginner = main.recommend_beginner(main.BeginnerPrefs(frequency="이제 막 시작했어요", terrain="공원 / 도로", pain="없음", wide_foot=False, budget=150000))
    expert = main.recommend_expert(main.ExpertPrefs(arch="normal", pronation="neutral", terrain="로드", use_case=["데일리"], cushion="중간", width="보통", weekly_km=30, budget=150000))
    for results in [beginner, expert]:
        assert results[0].budget_status == "within"
        statuses = [r.budget_status for r in results]
        assert statuses == sorted(statuses, key={"within": 0, "over": 1, "unknown": 2}.get)
