import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional

import anthropic
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:  # started from api/ (`uvicorn main:app`)
    from rate_limit import ExplainLimiter
    from shoe_news import router as news_router
except ModuleNotFoundError:  # started from the repo root (`uvicorn api.main:app`)
    from api.rate_limit import ExplainLimiter
    from api.shoe_news import router as news_router

# ── 데이터 로드 ─────────────────────────────────────────────
SHOES = json.loads(
    (Path(__file__).parent.parent / "shoes_data.json").read_text(encoding="utf-8")
)

CUSHION_ORDER = {"낮음": 1, "중간": 2, "높음": 3, "최고": 4}

# ── Claude 클라이언트 ─────────────────────────────────────────
client = anthropic.Anthropic()  # ANTHROPIC_API_KEY 환경변수 필요

app = FastAPI(title="Find Your Sole API")

# Browsers may only call this API from these origins. Native apps (the iOS app)
# send no Origin header, so CORS does not apply to them. To allow another site,
# e.g. a Render preview URL, set ALLOWED_ORIGINS to a comma-separated list; those
# are added to the defaults below.
#
# Note this is hygiene, not protection: anything that is not a browser (curl,
# a script) can still call the API, and /explain spends Anthropic credits.
DEFAULT_ORIGINS = [
    "https://findyoursole.app",
    "https://www.findyoursole.app",
    # local development: vite dev server and vite preview
    "http://localhost:5173",
    "http://localhost:4173",
]
EXTRA_ORIGINS = [
    o.strip().rstrip("/") for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=DEFAULT_ORIGINS + EXTRA_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
    expose_headers=["X-News-Updated"],  # lets the web app show when the news was refreshed
)

app.include_router(news_router)

explain_limiter = ExplainLimiter.from_env()


def client_ip(request: Request) -> str:
    # Behind Render's proxy the caller is the first X-Forwarded-For entry.
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ── 요청/응답 모델 ────────────────────────────────────────────
class BeginnerPrefs(BaseModel):
    mode: str = "beginner"
    frequency: str
    terrain: str
    pain: str
    wide_foot: bool
    budget: int
    weight_kg: Optional[int] = None   # 60 미만 / 60~80 / 80 이상
    brand_filter: List[str] = []


class ExpertPrefs(BaseModel):
    mode: str = "expert"
    arch: str
    pronation: str
    terrain: str
    use_case: List[str]
    cushion: str
    width: str
    weekly_km: int
    budget: int
    weight_kg: Optional[int] = None
    brand_filter: List[str] = []


class ComfortPrefs(BaseModel):
    mode: str = "comfort"
    where: str          # 출퇴근 · 통학 / 서서 일하는 직장 / 여행 · 산책 / 매일 편하게
    hours: str          # 2시간 미만 / 2~5시간 / 5시간 이상
    pain: List[str] = []  # 없음 / 발바닥 · 뒤꿈치 / 무릎 / 발목 / 발가락 · 발볼
    wide_foot: bool = False
    budget: int
    brand_filter: List[str] = []


class ExplainRequest(BaseModel):
    shoe: Dict
    prefs: Dict
    locale: str = "ko"


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

    # 체중 → 쿠션 보정
    weight = prefs.get("weight_kg")
    if weight is not None:
        shoe_cushion_val = CUSHION_ORDER.get(shoe["cushion"], 2)
        if weight >= 80 and shoe_cushion_val >= 3:
            score += 10
        elif weight >= 80 and shoe_cushion_val <= 1:
            score -= 10
        elif weight < 60 and shoe_cushion_val <= 2:
            score += 5

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
        "weight_kg": data.weight_kg,
    }


def map_comfort_to_prefs(data: ComfortPrefs) -> dict:
    """Turn the everyday-comfort answers into the preferences compute_score reads."""
    cushion_level = {"2시간 미만": 2, "2~5시간": 3, "5시간 이상": 4}.get(data.hours, 2)
    pains = [p for p in data.pain if p != "없음"]

    arch, pronation = "normal", "neutral"
    if "발바닥 · 뒤꿈치" in pains:
        arch, pronation = "flat", "mild_overpronation"
        cushion_level = max(cushion_level, 3)
    if "무릎" in pains:
        cushion_level = max(cushion_level, 3)
    if "발목" in pains:
        pronation = "mild_overpronation"
    if len(pains) >= 2:
        cushion_level = max(cushion_level, 4)

    use_case = ["데일리"]
    if data.where in ("서서 일하는 직장", "여행 · 산책"):
        use_case.append("장거리")

    wide = data.wide_foot or "발가락 · 발볼" in pains
    return {
        "arch": arch,
        "pronation": pronation,
        "terrain": "로드",
        "use_case": use_case,
        "cushion": {2: "중간", 3: "높음", 4: "최고"}[cushion_level],
        "width": "넓음" if wide else "보통",
        "weekly_km": 40,  # everyday walking is not a weekly-mileage question
        "budget": data.budget,
        "weight_kg": None,
    }


def is_comfort_candidate(shoe: Dict) -> bool:
    """Shoes tagged for walking or everyday wear (a running shoe can be both)."""
    return bool({"walking", "daily"} & set(shoe.get("categories", [])))


def run_recommendation(prefs: Dict, brand_filter: List[str], shoes: Optional[List[Dict]] = None) -> List[ShoeResult]:
    results = []
    for shoe in (SHOES if shoes is None else shoes):
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


KST = timezone(timedelta(hours=9))


def pick_of_the_day(now: Optional[datetime] = None) -> Dict:
    """One shoe per Korean calendar day, the same for everyone (no randomness, no storage)."""
    today = (now or datetime.now(KST)).astimezone(KST).date()
    ordered = sorted(SHOES, key=lambda s: s["id"])
    # A prime stride shuffles the order so consecutive days are not neighbours in the file.
    return ordered[(today.toordinal() * 7919) % len(ordered)]


def pick_reason(shoe: Dict, locale: str) -> str:
    tag = shoe["tags"][0] if shoe.get("tags") else ""
    if locale == "en":
        return f"{shoe['cushion']} cushioning at {shoe['weight_g']}g" + (f", known for: {tag}." if tag else ".")
    return f"쿠션은 {shoe['cushion']}, 무게는 {shoe['weight_g']}g" + (f", 특징은 \"{tag}\"이에요." if tag else "이에요.")


@app.get("/pick")
def pick(response: Response, locale: str = "ko"):
    from urllib.parse import quote

    shoe = pick_of_the_day()
    response.headers["Cache-Control"] = "public, max-age=1800"
    return {
        "name": shoe["name"],
        "brand": shoe["brand"],
        "price": shoe["price"],
        "weight_g": shoe["weight_g"],
        "cushion": shoe["cushion"],
        "categories": shoe.get("categories", []),
        "reason": pick_reason(shoe, locale),
        "naver_url": f"https://search.shopping.naver.com/search/all?query={quote(shoe['name'])}",
    }


@app.post("/recommend/beginner", response_model=List[ShoeResult])
def recommend_beginner(data: BeginnerPrefs):
    prefs = map_beginner_to_prefs(data)
    return run_recommendation(prefs, data.brand_filter)


@app.post("/recommend/comfort", response_model=List[ShoeResult])
def recommend_comfort(data: ComfortPrefs):
    prefs = map_comfort_to_prefs(data)
    candidates = [s for s in SHOES if is_comfort_candidate(s)]
    return run_recommendation(prefs, data.brand_filter, candidates)


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
        "weight_kg": data.weight_kg,
    }
    return run_recommendation(prefs, data.brand_filter)


@app.post("/explain")
def explain_shoe(req: ExplainRequest, request: Request):
    """
    왜 이 신발이 나한테 맞는지 Claude Haiku가 자연어로 설명.
    사용자가 직접 탭할 때만 호출 → 비용 최소화.
    """
    allowed, retry_after = explain_limiter.check(client_ip(request))
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Too many explanation requests. Please try again later.",
            headers={"Retry-After": str(retry_after)},
        )

    shoe = req.shoe
    prefs = req.prefs

    if req.locale == "en":
        system_prompt = (
            "You are a running shoe expert. "
            "Explain in 3-4 friendly sentences why this specific shoe is a great match "
            "for the user based on their foot type, running style, and budget. "
            "Briefly clarify technical terms in parentheses when needed. "
            "Do not use markdown syntax (**, #, - etc). Plain text only."
        )
    else:
        system_prompt = (
            "당신은 러닝화 전문가입니다. "
            "사용자의 발 유형, 러닝 스타일, 예산에 맞게 "
            "왜 특정 신발이 잘 맞는지 3~4문장으로 친근하게 설명해 주세요. "
            "전문 용어는 괄호로 간단히 풀어서 설명하세요. "
            "마크다운 문법(**, #, - 등)은 절대 사용하지 마세요. 일반 텍스트로만 작성하세요."
        )

    if req.locale == "en":
        user_message = f"""
Shoe info:
- Name: {shoe['name']} ({shoe['brand']})
- Cushion: {shoe['cushion']}, Drop: {shoe['drop_mm']}mm, Weight: {shoe['weight_g']}g
- Width: {shoe['width']}, Terrain: {', '.join(shoe['terrain'])}
- Use case: {', '.join(shoe['use_case'])}
- Tags: {', '.join(shoe['tags'])}

User info:
- Foot arch: {prefs.get('arch', 'unknown')}
- Pronation: {prefs.get('pronation', 'unknown')}
- Main terrain: {prefs.get('terrain', 'unknown')}
- Cushion preference: {prefs.get('cushion', 'unknown')}
- Foot width: {prefs.get('width', 'unknown')}
- Weekly km: {prefs.get('weekly_km', 0)}km
- Budget: ₩{prefs.get('budget', 0):,}

Please explain why this shoe is a great match for this user.
"""
    else:
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
