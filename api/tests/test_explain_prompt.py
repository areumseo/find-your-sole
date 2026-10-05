import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ.setdefault("ANTHROPIC_API_KEY", "test")

import main  # noqa: E402

SHOE = {"name": "Hoka Clifton 10", "brand": "Hoka", "cushion": "높음", "drop_mm": 8, "weight_g": 277, "width": "보통",
        "terrain": ["로드"], "use_case": ["데일리"], "tags": ["가볍고 푹신함"],
        "price": 179000, "price_source": "estimate", "price_usd": 150}
COMFORT = {"mode": "comfort", "where": "출퇴근 · 통학", "hours": "2~5시간", "pain": "", "width": "보통", "budget": 150000}
EXPERT = {"mode": "expert", "arch": "normal", "pronation": "neutral", "terrain": "로드", "cushion": "중간",
          "width": "보통", "weekly_km": 20, "budget": 150000}


def test_comfort_search_is_explained_as_everyday_walking_not_running():
    system, user = main.build_explain_prompts(SHOE, COMFORT, "ko")
    assert system.startswith("당신은 편하게 걷고 서 있는 신발 전문가")
    assert "아니라 출퇴근, 걷기, 오래 서 있는" in system
    assert "출퇴근 · 통학" in user and "2~5시간" in user
    assert "주간 러닝" not in user and "프로네이션" not in user


def test_running_searches_keep_the_running_prompt():
    system, user = main.build_explain_prompts(SHOE, EXPERT, "ko")
    assert system.startswith("당신은 러닝화 전문가")
    assert "프로네이션" in user and "주간 러닝" in user
    system, _ = main.build_explain_prompts(SHOE, {"mode": "beginner", "budget": 1}, "ko")
    assert system.startswith("당신은 러닝화 전문가")


def test_prompts_without_a_mode_fall_back_like_before():
    legacy = {k: v for k, v in EXPERT.items() if k != "mode"}
    assert main.build_explain_prompts(SHOE, legacy, "ko")[0].startswith("당신은 러닝화 전문가")


def test_only_confirmed_korean_prices_are_stated_as_prices():
    estimate = main.build_explain_prompts(SHOE, EXPERT, "ko")[1]
    assert "국내 정가 미확인 (해외 정가 $150)" in estimate and "179,000" not in estimate
    confirmed = main.build_explain_prompts({**SHOE, "price_source": "kr_list", "price": 189000}, EXPERT, "ko")[1]
    assert "189,000원 (국내 정가)" in confirmed
    unknown = main.build_explain_prompts({k: v for k, v in SHOE.items() if k not in ("price_source", "price_usd")}, EXPERT, "ko")[1]
    assert "가격: 정보 없음" in unknown


def test_system_prompt_forbids_inventing_price_fit():
    system, _ = main.build_explain_prompts(SHOE, EXPERT, "ko")
    assert "지어내지 마세요" in system and "단정하지 마세요" in system and "넘으면 솔직하게" in system


def test_english_prompts_follow_the_same_rules():
    system, user = main.build_explain_prompts(SHOE, COMFORT, "en")
    assert system.startswith("You are a walking and everyday shoe expert") and "not for running" in system
    assert "not confirmed in Korea (US list price $150)" in user
    system, user = main.build_explain_prompts({**SHOE, "price_source": "kr_list", "price": 189000}, EXPERT, "en")
    assert system.startswith("You are a running shoe expert") and "₩189,000 (Korean list price)" in user
