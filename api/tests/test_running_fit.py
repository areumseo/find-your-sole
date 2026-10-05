from fastapi.testclient import TestClient

from api import main

client = TestClient(main.app)
BY_ID = {s["id"]: s for s in main.SHOES}

BEGINNER = {"frequency": "이제 막 시작했어요", "terrain": "공원 / 도로", "pain": "없음", "wide_foot": False, "budget": 150000}
EXPERT = {"arch": "normal", "pronation": "neutral", "terrain": "트레일", "use_case": ["데일리"], "cushion": "중간",
          "width": "보통", "weekly_km": 20, "budget": 150000}


def test_beginner_results_are_running_road_shoes_only():
    res = client.post("/recommend/beginner", json=BEGINNER).json()
    assert res
    for r in res:
        shoe = BY_ID[r["id"]]
        assert "running" in shoe["categories"] and "로드" in shoe["terrain"]


def test_trail_search_sees_only_running_trail_shoes():
    res = client.post("/recommend/expert", json=EXPERT).json()
    assert res
    for r in res:
        shoe = BY_ID[r["id"]]
        assert "running" in shoe["categories"] and "트레일" in shoe["terrain"]


def test_walking_only_shoes_never_appear_in_running_results():
    walking_only = {i for i, s in BY_ID.items() if "running" not in s["categories"]}
    for path, body in (("beginner", BEGINNER), ("expert", {**EXPERT, "terrain": "로드"})):
        ids = {r["id"] for r in client.post(f"/recommend/{path}", json=body).json()}
        assert not ids & walking_only
