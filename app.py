import json
import streamlit as st
import pandas as pd
from urllib.parse import quote

st.set_page_config(page_title="Find Your Sole", page_icon="👟", layout="wide")

@st.cache_data
def load_shoes():
    with open("shoes_data.json", encoding="utf-8") as f:
        return json.load(f)

SHOES = load_shoes()
CUSHION_ORDER = {"낮음": 1, "중간": 2, "높음": 3, "최고": 4}

TAG_COLORS = {
    "데일리":   "#0ea5e9",
    "입문":     "#22c55e",
    "장거리":   "#a855f7",
    "스피드":   "#f97316",
    "레이스":   "#eab308",
    "회복런":   "#ec4899",
    "트레일":   "#84cc16",
    "산악":     "#78716c",
    "부상방지": "#ef4444",
}

def use_case_tags(use_cases):
    tags = []
    for uc in use_cases:
        color = TAG_COLORS.get(uc, "#6b7280")
        tags.append(
            f'<span style="background-color:{color};color:white;padding:2px 10px;'
            f'border-radius:999px;font-size:0.8rem;font-weight:600;margin-right:4px">{uc}</span>'
        )
    return st.markdown(" ".join(tags), unsafe_allow_html=True)


def compute_score(shoe, prefs):
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


def map_beginner_to_prefs(answers):
    """초심자 답변을 점수 로직용 prefs로 변환"""
    terrain_map = {
        "공원 / 도로": "로드",
        "산 / 흙길": "트레일",
    }
    terrain = terrain_map[answers["terrain"]]

    pain = answers["pain"]
    if pain == "없음":
        pronation, arch = "neutral", "normal"
        cushion = "중간"
    elif pain == "발바닥 (족저근막염 등)":
        pronation, arch = "mild_overpronation", "flat"
        cushion = "높음"
    elif pain in ("무릎", "발목"):
        pronation, arch = "mild_overpronation", "normal"
        cushion = "높음"
    else:
        pronation, arch = "overpronation", "flat"
        cushion = "최고"

    width = "넓음" if answers["wide_foot"] else "보통"

    freq = answers["frequency"]
    if freq == "이제 막 시작했어요":
        use_case = ["입문", "데일리"]
        weekly_km = 10
    elif freq == "6개월 미만":
        use_case = ["데일리", "회복런"]
        weekly_km = 15
    elif freq == "1년 미만":
        use_case = ["데일리", "장거리"]
        weekly_km = 25
    else:  # 2년 이상
        use_case = ["데일리", "장거리", "스피드"]
        weekly_km = 40

    return {
        "arch": arch,
        "pronation": pronation,
        "terrain": terrain,
        "use_case": use_case,
        "cushion": cushion,
        "width": width,
        "weekly_km": weekly_km,
        "budget": answers["budget"],
    }


def metric_card(label, value, is_best=False):
    color = "#f97316" if is_best else "#ffffff"
    st.markdown(
        f'<div style="margin-bottom:12px">'
        f'<div style="font-size:0.8rem;color:#888">{label}</div>'
        f'<div style="font-size:1.4rem;font-weight:700;color:{color}">{value}</div>'
        f'</div>',
        unsafe_allow_html=True,
    )


def show_comparison(selected_shoes):
    st.markdown("---")
    st.subheader("📊 선택 신발 비교")

    best_price = min(s["price"] for s in selected_shoes)
    best_weight = min(s["weight_g"] for s in selected_shoes)
    best_score = max(s["추천점수"] for s in selected_shoes)
    best_cushion = max(CUSHION_ORDER.get(s["cushion"], 0) for s in selected_shoes)

    cols = st.columns(len(selected_shoes))
    for col, shoe in zip(cols, selected_shoes):
        with col:
            st.markdown(f"**{shoe['name']}**")
            st.caption(shoe["brand"])
            metric_card("가격", f"{shoe['price']:,}원", shoe["price"] == best_price)
            metric_card("쿠션", shoe["cushion"], CUSHION_ORDER.get(shoe["cushion"], 0) == best_cushion)
            metric_card("무게", f"{shoe['weight_g']}g", shoe["weight_g"] == best_weight)
            metric_card("드롭", f"{shoe['drop_mm']}mm")
            metric_card("발볼", shoe["width"])
            metric_card("추천점수", str(shoe["추천점수"]), shoe["추천점수"] == best_score)
            st.write("**용도**")
            use_case_tags(shoe["use_case"])
            st.write("**특징**")
            st.caption(" | ".join(shoe["tags"]))
            naver_url = f"https://search.shopping.naver.com/search/all?query={quote(shoe['name'])}"
            st.link_button("네이버 쇼핑 →", naver_url)


def show_results(prefs, brand_filter):
    scored = []
    for shoe in SHOES:
        if brand_filter and shoe["brand"] not in brand_filter:
            continue
        s = compute_score(shoe, prefs)
        scored.append({**shoe, "추천점수": s})

    scored.sort(key=lambda x: x["추천점수"], reverse=True)
    top = scored[:10]

    if "compare_set" not in st.session_state:
        st.session_state.compare_set = set()

    st.subheader(f"추천 결과 상위 {len(top)}개")
    st.caption("오른쪽 화살표 버튼을 누르면 상세 내용이 표시됩니다.\n최대 3개까지 선택해서 비교할 수도 있습니다. 결과는 페이지 하단에서 확인하세요.")

    rank_icon = ["🥇", "🥈", "🥉"] + ["▪️"] * 7
    for i, shoe in enumerate(top):
        checked = shoe["id"] in st.session_state.compare_set
        col_check, col_expand = st.columns([0.07, 0.93])
        with col_check:
            toggle = st.checkbox("", value=checked, key=f"cmp_{shoe['id']}")
            if toggle and shoe["id"] not in st.session_state.compare_set:
                if len(st.session_state.compare_set) < 3:
                    st.session_state.compare_set.add(shoe["id"])
                    st.rerun()
            elif not toggle and shoe["id"] in st.session_state.compare_set:
                st.session_state.compare_set.discard(shoe["id"])
                st.rerun()
        with col_expand:
            with st.expander(f"{rank_icon[i]} {shoe['name']} — {shoe['price']:,}원  |  점수: {shoe['추천점수']}"):
                c1, c2, c3 = st.columns(3)
                with c1:
                    st.metric("쿠션", shoe["cushion"])
                    st.metric("지면", " / ".join(shoe["terrain"]))
                    st.metric("발볼", shoe["width"])
                with c2:
                    st.metric("드롭", f"{shoe['drop_mm']}mm")
                    st.metric("무게", f"{shoe['weight_g']}g")
                    st.metric("가격", f"{shoe['price']:,}원")
                with c3:
                    st.metric("추천점수", shoe["추천점수"])
                    st.write("**용도**")
                    use_case_tags(shoe["use_case"])
                st.write("**특징**")
                st.write(" | ".join(shoe["tags"]))
                naver_url = f"https://search.shopping.naver.com/search/all?query={quote(shoe['name'])}"
                st.link_button("네이버 쇼핑에서 보기 →", naver_url)

    selected_shoes = [s for s in top if s["id"] in st.session_state.compare_set]
    if len(selected_shoes) >= 2:
        show_comparison(selected_shoes)

    st.markdown("---")
    st.subheader("전체 비교 테이블")
    col_labels = {
        "name": "신발 이름", "brand": "브랜드", "price": "가격",
        "cushion": "쿠션", "terrain": "지면", "width": "발볼",
        "drop_mm": "드롭(mm)", "weight_g": "무게(g)", "추천점수": "추천점수",
    }
    df = pd.DataFrame(top)[list(col_labels.keys())]
    df.columns = list(col_labels.values())
    df["지면"] = df["지면"].apply(lambda x: " / ".join(x) if isinstance(x, list) else x)
    df["가격"] = df["가격"].apply(lambda x: f"{x:,}원")
    df.index = range(1, len(df) + 1)
    st.dataframe(df, use_container_width=True)


def beginner_mode():
    st.markdown("---")

    with st.sidebar:
        st.header("기본 정보")

        frequency = st.radio(
            "러닝 경험이 어느 정도인가요?",
            options=["이제 막 시작했어요", "6개월 미만", "1년 미만"],
        )

        terrain = st.radio(
            "어디서 주로 뛸 예정인가요?",
            options=["공원 / 도로", "산 / 흙길"],
        )

        pain = st.selectbox(
            "뛸 때 불편하거나 아픈 부위가 있나요?",
            options=["없음", "무릎", "발목", "발바닥 (족저근막염 등)", "여러 곳이 불편해요"],
        )

        wide_foot = st.checkbox("발볼이 넓은 편이에요 (신발이 자주 꽉 끼는 편)")

        budget = st.slider("예산", min_value=50000, max_value=400000, value=180000, step=10000,
                           format="%d원")

        st.markdown("---")
        brand_filter = st.multiselect(
            "브랜드 필터 (비워두면 전체)",
            options=sorted(set(s["brand"] for s in SHOES)),
        )

        searched = st.button("검색", use_container_width=True, type="primary")
        if searched:
            answers = {
                "frequency": frequency,
                "terrain": terrain,
                "pain": pain,
                "wide_foot": wide_foot,
                "budget": budget,
            }
            st.session_state.beginner_prefs = map_beginner_to_prefs(answers)
            st.session_state.beginner_brand_filter = brand_filter

    if "beginner_prefs" in st.session_state:
        show_results(st.session_state.beginner_prefs, st.session_state.beginner_brand_filter)
    else:
        st.info("왼쪽에서 정보를 입력하고 검색 버튼을 눌러주세요.")


def expert_mode():
    st.markdown("---")

    with st.sidebar:
        st.header("상세 정보 입력")

        arch = st.selectbox(
            "발 아치 유형",
            options=["normal", "flat", "high"],
            format_func=lambda x: {"normal": "일반 (보통)", "flat": "평발", "high": "높은 아치"}[x],
        )

        pronation = st.selectbox(
            "발 착지 패턴 (프로네이션)",
            options=["neutral", "mild_overpronation", "overpronation"],
            format_func=lambda x: {
                "neutral": "중립 (일반)",
                "mild_overpronation": "약한 안쪽 회전",
                "overpronation": "심한 안쪽 회전 (오버프로네이션)",
            }[x],
        )

        terrain = st.selectbox(
            "주로 뛰는 지면",
            options=["로드", "트레일"],
            format_func=lambda x: {"로드": "로드 (도로/트랙)", "트레일": "트레일 (산/흙길)"}[x],
        )

        use_case = st.multiselect(
            "러닝 목적 (복수 선택)",
            options=["데일리", "장거리", "스피드", "레이스", "회복런", "입문", "트레일", "산악", "부상방지"],
            default=["데일리"],
        )

        cushion = st.select_slider(
            "선호 쿠션감",
            options=["낮음", "중간", "높음", "최고"],
            value="중간",
        )

        width = st.selectbox(
            "발볼 너비",
            options=["보통", "넓음", "좁음"],
            format_func=lambda x: {"보통": "보통", "넓음": "넓음 (발볼이 넓은 편)", "좁음": "좁음"}[x],
        )

        weekly_km = st.slider("주간 러닝 거리 (km)", min_value=0, max_value=100, value=20, step=5)

        budget = st.slider("예산", min_value=50000, max_value=400000, value=200000, step=10000,
                           format="%d원")

        st.markdown("---")
        brand_filter = st.multiselect(
            "브랜드 필터 (비워두면 전체)",
            options=sorted(set(s["brand"] for s in SHOES)),
        )

        searched = st.button("검색", use_container_width=True, type="primary")
        if searched:
            if not use_case:
                st.warning("러닝 목적을 하나 이상 선택해 주세요.")
            else:
                st.session_state.expert_prefs = {
                    "arch": arch,
                    "pronation": pronation,
                    "terrain": terrain,
                    "use_case": use_case,
                    "cushion": cushion,
                    "width": width,
                    "weekly_km": weekly_km,
                    "budget": budget,
                }
                st.session_state.expert_brand_filter = brand_filter

    if "expert_prefs" in st.session_state:
        show_results(st.session_state.expert_prefs, st.session_state.expert_brand_filter)
    else:
        st.info("왼쪽에서 조건을 설정하고 검색 버튼을 눌러주세요.")


def main():
    st.title("👟 Find Your Sole")
    st.caption("내 발과 러닝 스타일에 맞는 신발을 찾아보세요.")
    st.markdown("---")

    if "mode" not in st.session_state:
        st.session_state.mode = None

    if "prev_mode" not in st.session_state:
        st.session_state.prev_mode = None
    if st.session_state.prev_mode != st.session_state.mode:
        st.session_state.pop("beginner_prefs", None)
        st.session_state.pop("expert_prefs", None)
        st.session_state.pop("compare_set", None)
        st.session_state.prev_mode = st.session_state.mode

    if st.session_state.mode is None:
        st.markdown("### 러닝 경험이 어느 정도인가요?")
        st.markdown("경험에 맞는 방식으로 추천해 드려요.")
        st.markdown("")

        col1, col2 = st.columns(2, gap="large")
        with col1:
            st.markdown("#### 🌱 러닝 초심자 (입문~1년)")
            st.markdown("전문 용어 없이\n간단한 질문 몇 가지만 답하면\n딱 맞는 신발을 추천해 드려요.")
            st.markdown("")
            if st.button("시작하기", key="btn_beginner", use_container_width=True, type="primary"):
                st.session_state.mode = "beginner"
                st.rerun()

        with col2:
            st.markdown("#### 🏃 러닝 경험자 (1년 이상)")
            st.markdown("아치, 프로네이션, 쿠션 등\n세부 조건을 직접 설정해서\n정밀하게 추천받을 수 있어요.")
            st.markdown("")
            if st.button("시작하기", key="btn_expert", use_container_width=True):
                st.session_state.mode = "expert"
                st.rerun()
        return

    # 모드 전환 버튼
    mode_label = "🌱 초심자 모드" if st.session_state.mode == "beginner" else "🏃 경험자 모드"
    col_title, col_switch = st.columns([4, 1])
    with col_title:
        st.markdown(f"### {mode_label}로 추천 중")
    with col_switch:
        if st.button("모드 변경"):
            st.session_state.mode = None
            st.rerun()

    st.markdown("")

    if st.session_state.mode == "beginner":
        beginner_mode()
    else:
        expert_mode()


if __name__ == "__main__":
    main()
