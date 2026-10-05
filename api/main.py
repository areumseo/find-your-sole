import json
import os
from contextlib import asynccontextmanager
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import anthropic
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:  # started from api/ (`uvicorn main:app`)
    import startup_checks
    import catalog_prices
    from feedback import router as feedback_router
    from rate_limit import ExplainLimiter
    from shoe_news import router as news_router
except ModuleNotFoundError:  # started from the repo root (`uvicorn api.main:app`)
    from api import startup_checks, catalog_prices
    from api.feedback import router as feedback_router
    from api.rate_limit import ExplainLimiter
    from api.shoe_news import router as news_router

# ── 데이터 로드 ─────────────────────────────────────────────
SHOES = json.loads(
    (Path(__file__).parent.parent / "shoes_data.json").read_text(encoding="utf-8")
)

CUSHION_ORDER = {"낮음": 1, "중간": 2, "높음": 3, "최고": 4}

# ── Claude 클라이언트 ─────────────────────────────────────────
client = anthropic.Anthropic()  # ANTHROPIC_API_KEY 환경변수 필요

@asynccontextmanager
async def lifespan(_app: FastAPI):
    # In the background, so a slow or failing check never delays the app coming up.
    startup_checks.start_in_background(client)
    yield


app = FastAPI(title="Find Your Sole API", lifespan=lifespan)

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
    allow_headers=["Content-Type", "Authorization"],
    expose_headers=["X-News-Updated"],  # lets the web app show when the news was refreshed
)

app.include_router(news_router)
app.include_router(feedback_router)
app.include_router(startup_checks.router)

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
    price_source: Optional[str] = None  # "kr_list" or "estimate"
    price_usd: Optional[int] = None  # overseas list price, shown when the KRW price is an estimate
    brand_url: Optional[str] = None  # the brand's official (Korean) site, linked from the brand name
    weight_g: Optional[int] = None
    drop_mm: Optional[int] = None
    cushion: str
    terrain: List[str]
    arch: List[str]
    pronation: List[str]
    use_case: List[str]
    weekly_km: str
    width: str
    tags: List[str]
    score: int
    over_budget: bool = False  # only confirmed Korean prices can exceed the budget
    budget_status: str = "unknown"  # within / unknown / over
    naver_url: str
    source_url: Optional[str] = None
    specs_checked_at: Optional[str] = None
    weight_note: Optional[str] = None
    sale_price: Optional[int] = None
    sale_price_max: Optional[int] = None
    sale_available: Optional[bool] = None
    sale_checked_at: Optional[str] = None
    sale_source_url: Optional[str] = None


# ── 점수 계산 ─────────────────────────────────────────────────
def compute_score(shoe: Dict, prefs: Dict) -> int:
    score = shoe["score_base"]

    if prefs["arch"] in shoe["arch"]:
        score += 15
    elif shoe["arch"]:
        score -= 20

    if prefs["pronation"] in shoe["pronation"]:
        score += 15
    elif shoe["pronation"]:
        score -= 25

    use_match = len(set(prefs["use_case"]) & set(shoe["use_case"]))
    score += use_match * 10

    if prefs["terrain"] in shoe["terrain"]:
        score += 10
    else:
        score -= 30

    if shoe.get("price_source") == "kr_list":
        if shoe["price"] <= prefs["budget"]:
            score += 5
        else:
            over_ratio = (shoe["price"] - prefs["budget"]) / max(prefs["budget"], 1)
            score -= int(over_ratio * 30)

    if prefs["width"] == "넓음" and shoe["width"] == "좁음":
        score -= 20
    elif prefs["width"] == "좁음" and shoe["width"] == "넓음":
        score -= 10
    elif prefs["width"] == shoe["width"]:
        score += 5

    if shoe["cushion"] in CUSHION_ORDER:
        cushion_diff = abs(CUSHION_ORDER.get(prefs["cushion"], 2) - CUSHION_ORDER[shoe["cushion"]])
        score -= cushion_diff * 8

    km_map = {"10이상": 10, "20이상": 20, "30이상": 30, "40이상": 40}
    req_km = km_map.get(shoe["weekly_km"])
    if req_km is not None:
        score += 5 if prefs["weekly_km"] >= req_km else -10

    # 체중 → 쿠션 보정
    weight = prefs.get("weight_kg")
    if weight is not None and shoe["cushion"] in CUSHION_ORDER:
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


def is_running_candidate(shoe: Dict, terrain: str) -> bool:
    """Fit comes before budget: a running search only sees running shoes made for the chosen terrain."""
    return "running" in shoe.get("categories", []) and terrain in shoe["terrain"]


def run_recommendation(prefs: Dict, brand_filter: List[str], shoes: Optional[List[Dict]] = None) -> List[ShoeResult]:
    results = []
    for shoe in catalog_prices.enrich(SHOES if shoes is None else shoes):
        if brand_filter and shoe["brand"] not in brand_filter:
            continue
        score = compute_score(shoe, prefs)
        from urllib.parse import quote
        naver_url = f"https://search.shopping.naver.com/search/all?query={quote(shoe['name'])}"
        known = shoe.get("price_source") == "kr_list"
        over = known and shoe["price"] > prefs["budget"]
        status = "over" if over else "within" if known else "unknown"
        results.append(ShoeResult(**{**shoe, "score": score, "naver_url": naver_url,
                                    "over_budget": over, "budget_status": status,
                                    "brand_url": shoe.get("url")}))

    # Shoes within the budget come first (best score first); shoes above it follow, flagged,
    # so a 150,000 KRW budget does not open with 200,000 KRW shoes.
    # Estimates cannot establish affordability: keep them separate from confirmed prices.
    order = {"within": 0, "unknown": 1, "over": 2}
    results.sort(key=lambda x: (order[x.budget_status], -x.score))
    return results[:10]


# ── 엔드포인트 ────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "shoes_count": len(SHOES)}


KST = timezone(timedelta(hours=9))


def is_pick_candidate(shoe: Dict) -> bool:
    """Road shoes people wear day to day: everyday running, walking and daily. No trail or race shoes."""
    return "로드" in shoe["terrain"] and ("데일리" in shoe["use_case"] or "walking" in shoe.get("categories", []))


def pick_of_the_day(now: Optional[datetime] = None) -> Dict:
    """One shoe per Korean calendar day, the same for everyone (no randomness, no storage)."""
    today = (now or datetime.now(KST)).astimezone(KST).date()
    ordered = sorted((s for s in SHOES if is_pick_candidate(s)), key=lambda s: s["id"])
    # A prime stride shuffles the order so consecutive days are not neighbours in the file.
    return ordered[(today.toordinal() * 7919) % len(ordered)]



def metric_fact(value, unit):
    return f"{value}{unit}" if value is not None else "unknown / 미확인"

CUSHION_EN = {"낮음": "Low", "중간": "Medium", "높음": "High", "최고": "Max"}


def pick_reason(shoe: Dict, locale: str) -> str:
    """Plain data-driven sentence; used when the AI comment is unavailable."""
    if shoe['cushion'] == '미확인' or shoe['weight_g'] is None or shoe['drop_mm'] is None:
        weight = shoe.get('weight_g')
        weight_en = f" Published weight: {weight}g at the reference size." if weight is not None else " Weight is not confirmed."
        weight_ko = f" 무게는 기준 사이즈에서 {weight}g이에요." if weight is not None else " 무게도 미확인이에요."
        return ("Some specs are not confirmed." + weight_en + " Check the official product information and fit."
                if locale == 'en' else f"쿠션은 {shoe['cushion']}이에요." + weight_ko + " 공식 제품 정보와 착화감을 확인해 주세요.")
    if locale == "en":
        # Tags are Korean in the data, so the English sentence sticks to numbers and mapped words.
        cushion = CUSHION_EN.get(shoe["cushion"], "")
        return f"{cushion + ' c' if cushion else 'C'}ushioning at {metric_fact(shoe.get('weight_g'), 'g')}, {metric_fact(shoe.get('drop_mm'), 'mm')} drop."
    tag = shoe["tags"][0] if shoe.get("tags") else ""
    return f"쿠션은 {shoe['cushion']}, 무게는 {metric_fact(shoe.get('weight_g'), 'g')}" + (f", 특징은 \"{tag}\"이에요." if tag else "이에요.")


# SOL-E's daily comment is written by Claude at most once per day per language and
# kept in memory, so the cost is two tiny calls a day however many people visit.
_pick_comments: Dict[Tuple[str, str], str] = {}
_pick_comment_lock = threading.Lock()


def pick_comment(shoe: Dict, locale: str, today: str) -> str:
    key = (today, locale)
    with _pick_comment_lock:
        if key in _pick_comments:
            return _pick_comments[key]
        # Drop yesterday's entries so the dict never grows.
        for old in [k for k in _pick_comments if k[0] != today]:
            del _pick_comments[old]
        try:
            text = generate_pick_comment(shoe, locale)
        except Exception as exc:  # noqa: BLE001 - never let a comment take /pick down
            print(f"pick comment failed ({type(exc).__name__}); using the plain sentence")
            text = ""
        # A failure is cached too, so an outage is retried tomorrow, not on every visit.
        _pick_comments[key] = text or pick_reason(shoe, locale)
        return _pick_comments[key]


def generate_pick_comment(shoe: Dict, locale: str) -> str:
    facts = (
        f"{shoe['name']} ({shoe['brand']}); cushion {shoe['cushion']}, weight {metric_fact(shoe.get('weight_g'), 'g')}, "
        f"drop {metric_fact(shoe.get('drop_mm'), 'mm')}, width {shoe['width']}; features: {', '.join(shoe.get('tags', []))}; "
        f"uses: {', '.join(shoe.get('use_case', []))}; weight reference: {shoe.get('weight_note', 'unspecified')}"
    )
    if locale == "en":
        system = (
            "You are SOL-E, a friendly little ghost who helps people pick shoes. "
            "Write ONE or TWO short, warm sentences (max 200 characters) saying who today's pick suits and why. "
            "Use only the facts given; do not invent specs or prices. Unknown specs do not establish fit, support or pain relief. Plain text, no markdown, no emoji."
        )
    else:
        system = (
            "당신은 신발 고르는 걸 도와주는 작은 유령 '솔이'입니다. "
            "오늘의 추천 신발이 어떤 사람에게 왜 잘 맞는지 따뜻한 존댓말(~해요)로 한두 문장, 100자 이내로 써 주세요. "
            "주어진 정보만 쓰고 수치나 가격을 지어내지 마세요. None과 미확인은 알 수 없는 정보예요. 발볼이나 쿠션이 사용자에게 맞거나 통증을 완화한다고 단정하지 마세요. 마크다운과 이모지는 쓰지 마세요."
        )
    # Short timeout and no retries: this runs while a visitor waits on /pick.
    response = client.with_options(timeout=15.0, max_retries=0).messages.create(
        model="claude-haiku-4-5",
        max_tokens=200,
        system=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": facts}],
    )
    return next((b.text for b in response.content if b.type == "text"), "").strip()


@app.get("/pick")
def pick(response: Response, locale: str = "ko"):
    from urllib.parse import quote

    locale = "en" if locale == "en" else "ko"
    today = datetime.now(KST).date().isoformat()
    shoe = pick_of_the_day()
    response.headers["Cache-Control"] = "public, max-age=1800"
    return {
        "name": shoe["name"],
        "brand": shoe["brand"],
        "brand_url": shoe.get("url"),
        "price": shoe["price"],
        "price_source": shoe.get("price_source"),
        "price_usd": shoe.get("price_usd"),
        "weight_g": shoe["weight_g"],
        "cushion": shoe["cushion"],
        "categories": shoe.get("categories", []),
        "reason": pick_comment(shoe, locale, today),
        "naver_url": f"https://search.shopping.naver.com/search/all?query={quote(shoe['name'])}",
    }


@app.post("/recommend/beginner", response_model=List[ShoeResult])
def recommend_beginner(data: BeginnerPrefs):
    prefs = map_beginner_to_prefs(data)
    candidates = [s for s in SHOES if is_running_candidate(s, prefs["terrain"])]
    return run_recommendation(prefs, data.brand_filter, candidates)


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
    candidates = [s for s in SHOES if is_running_candidate(s, data.terrain)]
    return run_recommendation(prefs, data.brand_filter, candidates)


def price_fact(shoe: Dict, locale: str) -> str:
    """The price as the explanation may state it: only a confirmed Korean list price counts as known."""
    en = locale == "en"
    source, price, usd = shoe.get("price_source"), shoe.get("price"), shoe.get("price_usd")
    if source == "kr_list" and price:
        return f"₩{price:,} (Korean list price)" if en else f"{price:,}원 (국내 정가)"
    if source == "estimate" and usd:
        return (f"not confirmed in Korea (US list price ${usd})" if en else f"국내 정가 미확인 (해외 정가 ${usd})")
    return "unknown" if en else "정보 없음"


def build_explain_prompts(shoe: Dict, prefs: Dict, locale: str):
    """System prompt and user message for /explain. The wording follows how the person searched:
    a comfort search (walking, commute, standing) must not be explained as running."""
    en = locale == "en"
    mode = prefs.get("mode") or ("expert" if prefs.get("arch") else "beginner")
    comfort = mode == "comfort"
    shoe_lines_ko = (
        f"- 이름: {shoe['name']} ({shoe['brand']})\n"
        f"- 쿠션: {shoe['cushion']}, 드롭: {metric_fact(shoe.get('drop_mm'), 'mm')}, 무게: {metric_fact(shoe.get('weight_g'), 'g')}\n"
        f"- 발볼: {shoe['width']}, 지면: {', '.join(shoe.get('terrain', []))}\n"
        f"- 용도: {', '.join(shoe.get('use_case', []))}\n"
        f"- 특징: {', '.join(shoe.get('tags', []))}\n"
        f"- 가격: {price_fact(shoe, 'ko')}"
    )
    shoe_lines_en = (
        f"- Name: {shoe['name']} ({shoe['brand']})\n"
        f"- Cushion: {shoe['cushion']}, Drop: {metric_fact(shoe.get('drop_mm'), 'mm')}, Weight: {metric_fact(shoe.get('weight_g'), 'g')}\n"
        f"- Width: {shoe['width']}, Terrain: {', '.join(shoe.get('terrain', []))}\n"
        f"- Use case: {', '.join(shoe.get('use_case', []))}\n"
        f"- Tags: {', '.join(shoe.get('tags', []))}\n"
        f"- Price: {price_fact(shoe, 'en')}"
    )
    if shoe.get('weight_note'):
        shoe_lines_ko += f"\n- 무게 측정 기준: {shoe['weight_note']}"
        shoe_lines_en += f"\n- Weight measurement basis: {shoe['weight_note']}"
    budget = prefs.get("budget", 0)

    if en:
        rules = (
            "Use only the facts given; do not invent specs or claims. None and 미확인 mean unknown, not zero or normal. Do not claim unknown cushioning, width or support matches the user or relieves pain. "
            "Mention price or budget only if the price is a known Korean list price; if it says not confirmed or unknown, "
            "do not claim it fits the budget. If the price is above the budget, say so honestly. "
            "Briefly clarify technical terms in parentheses when needed. Do not use markdown syntax (**, #, - etc). Plain text only."
        )
        if comfort:
            system = ("You are a walking and everyday shoe expert. In 3-4 friendly sentences, explain why this specific shoe suits "
                      "the user's day: where they wear it, how long they are on their feet, any foot discomfort and foot width. "
                      "Even if it is a running shoe, explain it for commuting, walking or standing comfort, not for running. " + rules)
            user = (f"Shoe info:\n{shoe_lines_en}\n\nUser situation:\n- Where: {prefs.get('where', 'unknown')}\n"
                    f"- Time on feet per day: {prefs.get('hours', 'unknown')}\n- Discomfort: {prefs.get('pain', 'none')}\n"
                    f"- Wide feet: {prefs.get('width', 'unknown')}\n- Budget: ₩{budget:,}\n\nExplain why this shoe suits this user.")
        else:
            system = ("You are a running shoe expert. In 3-4 friendly sentences, explain why this specific shoe suits the user's "
                      "foot type, running style and budget. " + rules)
            user = (f"Shoe info:\n{shoe_lines_en}\n\nUser info:\n- Foot arch: {prefs.get('arch', 'unknown')}\n"
                    f"- Pronation: {prefs.get('pronation', 'unknown')}\n- Main terrain: {prefs.get('terrain', 'unknown')}\n"
                    f"- Cushion preference: {prefs.get('cushion', 'unknown')}\n- Foot width: {prefs.get('width', 'unknown')}\n"
                    f"- Pain: {prefs.get('pain', 'unknown')}\n- Running experience: {prefs.get('frequency', 'unknown')}\n"
                    f"- Weekly km: {prefs.get('weekly_km', 'unknown')}\n- Budget: ₩{budget:,}\n\nExplain why this shoe suits this user.")
        return system, user

    rules = (
        "주어진 정보에 없는 사실은 지어내지 마세요. None과 미확인은 정보가 없다는 뜻이며 정상 발볼이나 중간 쿠션으로 추정하지 마세요. 미확인 특성이 사용자에게 맞거나 통증을 완화한다고 단정하지 마세요. "
        "가격은 '국내 정가'로 확인된 경우에만 예산과 비교해 말하고, '미확인'이나 '정보 없음'이면 예산에 맞는다고 단정하지 마세요. "
        "가격이 예산을 넘으면 솔직하게 말하세요. 전문 용어는 괄호로 간단히 풀어서 설명하세요. "
        "마크다운 문법(**, #, - 등)은 절대 사용하지 마세요. 일반 텍스트로만 작성하세요."
    )
    if comfort:
        system = ("당신은 편하게 걷고 서 있는 신발 전문가입니다. 사용자가 이 신발을 어디서 신는지, 하루에 얼마나 걷거나 서 있는지, "
                  "불편한 부위와 발볼에 맞춰 왜 이 신발이 잘 맞는지 3~4문장으로 친근하게 설명해 주세요. "
                  "러닝화라도 '러닝'이 아니라 출퇴근, 걷기, 오래 서 있는 상황에서 편한 이유로 설명하세요. " + rules)
        pain = prefs.get("pain") or "없음"
        user = (f"신발 정보:\n{shoe_lines_ko}\n\n사용자 상황:\n- 주로 신는 곳: {prefs.get('where', '정보 없음')}\n"
                f"- 하루 걷거나 서 있는 시간: {prefs.get('hours', '정보 없음')}\n- 불편한 부위: {pain}\n"
                f"- 발볼: {prefs.get('width', '정보 없음')}\n- 예산: {budget:,}원\n\n이 신발이 이 사용자에게 왜 잘 맞는지 설명해 주세요.")
    else:
        system = ("당신은 러닝화 전문가입니다. 사용자의 발 유형, 러닝 스타일, 예산에 맞게 왜 특정 신발이 잘 맞는지 "
                  "3~4문장으로 친근하게 설명해 주세요. " + rules)
        user = (f"신발 정보:\n{shoe_lines_ko}\n\n사용자 정보:\n- 발 아치: {prefs.get('arch', '정보 없음')}\n"
                f"- 프로네이션: {prefs.get('pronation', '정보 없음')}\n- 주요 지면: {prefs.get('terrain', '정보 없음')}\n"
                f"- 선호 쿠션: {prefs.get('cushion', '정보 없음')}\n- 발볼: {prefs.get('width', '정보 없음')}\n"
                f"- 불편한 부위: {prefs.get('pain', '정보 없음')}\n- 러닝 경험: {prefs.get('frequency', '정보 없음')}\n"
                f"- 주간 러닝: {prefs.get('weekly_km', '정보 없음')}km\n- 예산: {budget:,}원\n\n이 신발이 이 사용자에게 왜 잘 맞는지 설명해 주세요.")
    return system, user


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

    system_prompt, user_message = build_explain_prompts(req.shoe, req.prefs, req.locale)

    try:
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
    except anthropic.APIStatusError as exc:
        # Log why (status + Anthropic's error type, never the key) so a bad key,
        # missing credit or wrong model name shows up in the Render logs.
        detail = getattr(exc, "body", None)
        kind = detail.get("error", {}).get("type") if isinstance(detail, dict) and isinstance(detail.get("error"), dict) else ""
        print(f"explain failed: Anthropic HTTP {exc.status_code} {kind}")
        raise HTTPException(status_code=502, detail="The explanation service is unavailable right now.")
    except anthropic.APIError as exc:
        print(f"explain failed: {type(exc).__name__}")
        raise HTTPException(status_code=502, detail="The explanation service is unavailable right now.")

    explanation = next(
        (block.text for block in response.content if block.type == "text"), ""
    )
    return {"explanation": explanation}
