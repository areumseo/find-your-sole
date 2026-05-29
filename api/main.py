import json
from pathlib import Path
from typing import Dict, List, Optional

import anthropic
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── 데이터 로드 ─────────────────────────────────────────────
SHOES = json.loads(
    (Path(__file__).parent.parent / "shoes_data.json").read_text(encoding="utf-8")
)

CUSHION_ORDER = {"낮음": 1, "중간": 2, "높음": 3, "최고": 4}

# ── Claude 클라이언트 ─────────────────────────────────────────
client = anthropic.Anthropic()  # ANTHROPIC_API_KEY 환경변수 필요

app = FastAPI(title="Find Your Sole API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── 요청/응답 모델 ────────────────────────────────────────────
class BeginnerPrefs(BaseModel):
    mode: str = "beginner"
    frequency: str       # "이제 막 시작했어요" | "6개월 미만" | "1년 미만"
    terrain: str         # "공원 / 도로" | "산 / 흙길"
    pain: str            # "없음" | "무릎" | "발목" | "발바닥 (족저근막염 등)" | "여러 곳이 불편해요"
    wide_foot: bool
    budget: int
    brand_filter: List[str] = []


class ExpertPrefs(BaseModel):
    mode: str = "expert"
    arch: str            # "normal" | "flat" | "high"
    pronation: str       # "neutral" | "mild_overpronation" | "overpronation"
    terrain: str         # "로드" | "트레일"
    use_case: List[str]
    cushion: str         # "낮음" | "중간" | "높음" | "최고"
    width: str           # "보통" | "넓음" | "좁음"
    weekly_km: int
    budget: int
    brand_filter: List[str] = []


class ExplainRequest(BaseModel):
    shoe: Dict
    prefs: Dict          # 점수 계산에 쓴 prefs 그대로


class ShoeResult(BaseModel):
    id: int
    name: str
    brand: str
    price: int
    weight_g: int
    drop_mm: int
    cushion: str
    terrain: List[str]
    arch: List[str]
    pronation: List[str]
    use_case: List[str]
    weekly_km: str
    width: str
    tags: List[str]
    score: int
    naver_url: str


# ── 점수 계산 ─────────────────────────────────────────────────
def compute_score(shoe: Dict, prefs: Dict) -> int:
    score = shoe["score_base"]

    if prefs["arch"] in shoe["arch"]:
        score += 15
    else:
        score -= 20

    if prefs["pronation"] in shoe["pronation"]:
        score += 15
    else:
        score -= 25

    use_match = len(set(prefs["use_case"]) & set(shoe["use_case"]))
    score += use_match * 10

    if prefs["terrain"] in shoe["terrain"]:
        score += 10
    else:
        score -= 30

    if shoe["price"] <= prefs["budget"]:
        score += 5
    else:
        over_ratio = (shoe["price"] - prefs["budget"]) / prefs["budget"]
        score -= int(over_ratio * 30)

    if prefs["width"] == "넓음" and shoe["width"] == "좁음":
        score -= 20
    elif prefs["width"] == "좁음" and shoe["width"] == "넓음":
        score -= 10
    elif prefs["width"] == shoe["width"]:
        score += 5

    cushion_diff = abs(
        CUSHION_ORDER.get(prefs["cushion"], 2) - CUSHION_ORDER.get(shoe["cushion"], 2)
    )
    score -= cushion_diff * 8

    km_map = {"10이상": 10, "20이상": 20, "30이상": 30, "40이상": 40}
    req_km = km_map.get(shoe["weekly_km"], 10)
    if prefs["weekly_km"] >= req_km:
        score += 5
    else:
        score -= 10

    return score


def map_beginner_to_prefs(data: BeginnerPrefs) -> dict:
    terrain = "로드" if data.terrain == "공원 / 도로" else "트레일"

    if data.pain == "없음":
        pronation, arch, cushion = "neutral", "normal", "중간"
    elif data.pain == "발바닥 (족저근막염 등)":
        pronation, arch, cushion = "mild_overpronation", "flat", "높음"
    elif data.pain in ("무릎", "발목"):
        pronation, arch, cushion = "mild_overpronation", "normal", "높음"
    else:
        pronation, arch, cushion = "overpronation", "flat", "최고"

    width = "넓음" if data.wide_foot else "보통"

    if data.frequency == "이제 막 시작했어요":
        use_case, weekly_km = ["입문", "데일리"], 10
    elif data.frequency == "6개월 미만":
        use_case, weekly_km = ["데일리", "회복런"], 15
    else:
        use_case, weekly_km = ["데일리", "장거리"], 25

    return {
        "arch": arch,
        "pronation": pronation,
        "terrain": terrain,
        "use_case": use_case,
        "cushion": cushion,
        "width": width,
        "weekly_km": weekly_km,
        "budget": data.budget,
    }


def run_recommendation(prefs: Dict, brand_filter: List[str]) -> List[ShoeResult]:
    results = []
    for shoe in SHOES:
        if brand_filter and shoe["brand"] not in brand_filter:
            continue
        score = compute_score(shoe, prefs)
        from urllib.parse import quote
        naver_url = f"https://search.shopping.naver.com/search/all?query={quote(shoe['name'])}"
        results.append(ShoeResult(**{**shoe, "score": score, "naver_url": naver_url}))

    results.sort(key=lambda x: x.score, reverse=True)
    return results[:10]


# ── 엔드포인트 ────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "shoes_count": len(SHOES)}


@app.post("/recommend/beginner", response_model=List[ShoeResult])
def recommend_beginner(data: BeginnerPrefs):
    prefs = map_beginner_to_prefs(data)
    return run_recommendation(prefs, data.brand_filter)


@app.post("/recommend/expert", response_model=List[ShoeResult])
def recommend_expert(data: ExpertPrefs):
    prefs = {
        "arch": data.arch,
        "pronation": data.pronation,
        "terrain": data.terrain,
        "use_case": data.use_case,
        "cushion": data.cushion,
        "width": data.width,
        "weekly_km": data.weekly_km,
        "budget": data.budget,
    }
    return run_recommendation(prefs, data.brand_filter)


@app.post("/explain")
def explain_shoe(req: ExplainRequest):
    """
    왜 이 신발이 나한테 맞는지 Claude Haiku가 자연어로 설명.
    사용자가 직접 탭할 때만 호출 → 비용 최소화.
    """
    shoe = req.shoe
    prefs = req.prefs

    system_prompt = (
        "당신은 러닝화 전문가입니다. "
        "사용자의 발 유형, 러닝 스타일, 예산에 맞게 "
        "왜 특정 신발이 잘 맞는지 3~4문장으로 친근하게 설명해 주세요. "
        "전문 용어는 괄호로 간단히 풀어서 설명하세요. "
        "마크다운 문법(**, #, - 등)은 절대 사용하지 마세요. 일반 텍스트로만 작성하세요."
    )

    user_message = f"""
신발 정보:
- 이름: {shoe['name']} ({shoe['brand']})
- 쿠션: {shoe['cushion']}, 드롭: {shoe['drop_mm']}mm, 무게: {shoe['weight_g']}g
- 발볼: {shoe['width']}, 지면: {', '.join(shoe['terrain'])}
- 용도: {', '.join(shoe['use_case'])}
- 특징: {', '.join(shoe['tags'])}

사용자 정보:
- 발 아치: {prefs.get('arch', '정보 없음')}
- 프로네이션: {prefs.get('pronation', '정보 없음')}
- 주요 지면: {prefs.get('terrain', '정보 없음')}
- 선호 쿠션: {prefs.get('cushion', '정보 없음')}
- 발볼: {prefs.get('width', '정보 없음')}
- 주간 러닝: {prefs.get('weekly_km', 0)}km
- 예산: {prefs.get('budget', 0):,}원

이 신발이 이 사용자에게 왜 잘 맞는지 설명해 주세요.
"""

    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=500,
        system=[
            {
                "type": "text",
                "text": system_prompt,
                "cache_control": {"type": "ephemeral"},  # 시스템 프롬프트 캐싱
            }
        ],
        messages=[{"role": "user", "content": user_message}],
    )

    explanation = next(
        (block.text for block in response.content if block.type == "text"), ""
    )
    return {"explanation": explanation}
