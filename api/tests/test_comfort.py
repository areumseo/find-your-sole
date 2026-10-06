import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ.setdefault("ANTHROPIC_API_KEY", "test")

import main  # noqa: E402


def prefs(**kw):
    base = dict(where="매일 편하게", hours="2시간 미만", pain=["없음"], wide_foot=False, budget=150000)
    return main.ComfortPrefs(**{**base, **kw})


def test_longer_standing_means_more_cushion():
    assert main.map_comfort_to_prefs(prefs())["cushion"] == "중간"
    assert main.map_comfort_to_prefs(prefs(hours="2~5시간"))["cushion"] == "높음"
    assert main.map_comfort_to_prefs(prefs(hours="5시간 이상"))["cushion"] == "최고"


def test_pain_raises_cushion_and_sets_foot_type():
    m = main.map_comfort_to_prefs(prefs(pain=["발바닥 · 뒤꿈치"]))
    assert m["arch"] == "flat" and m["pronation"] == "mild_overpronation" and m["cushion"] == "높음"
    assert main.map_comfort_to_prefs(prefs(pain=["무릎", "발목"]))["cushion"] == "최고"


def test_toe_pain_means_wide():
    assert main.map_comfort_to_prefs(prefs(pain=["발가락 · 발볼"]))["width"] == "넓음"
    assert main.map_comfort_to_prefs(prefs(wide_foot=True))["width"] == "넓음"


def test_where_adds_long_use_case():
    assert "장거리" not in main.map_comfort_to_prefs(prefs(where="출퇴근 · 통학"))["use_case"]
    assert "장거리" in main.map_comfort_to_prefs(prefs(where="서서 일하는 직장"))["use_case"]


def test_endpoint_returns_ranked_candidates():
    res = main.recommend_comfort(prefs(hours="5시간 이상"))
    assert 0 < len(res) <= 10
    # Korean prices first (within, then over budget), overseas-only prices last; best score first in each group.
    order = {"within": 0, "over": 1, "unknown": 2}
    assert [(order[r.budget_status], -r.score, r.id) for r in res] == sorted((order[r.budget_status], -r.score, r.id) for r in res)
    by_id = {s["id"]: s for s in main.SHOES}
    assert all({"walking", "daily"} & set(by_id[r.id]["categories"]) for r in res)  # only walking/daily shoes


def test_every_walking_or_daily_shoe_can_be_recommended():
    candidates = [s for s in main.SHOES if main.is_comfort_candidate(s)]
    assert len(candidates) >= 15
    assert not main.is_comfort_candidate({"categories": ["running"]})
