import base64
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ.setdefault("ANTHROPIC_API_KEY", "test")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import feedback  # noqa: E402
import main  # noqa: E402
from rate_limit import ExplainLimiter  # noqa: E402

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 32
GIF = b"GIF89a" + b"\x00" * 32
WEBP = b"RIFF\x24\x00\x00\x00WEBPVP8 " + b"\x00" * 24
ADMIN = {"Authorization": "Bearer secret-token"}


def b64(data: bytes) -> str:
    return base64.b64encode(data).decode()


@pytest.fixture(params=["memory", "sqlite"])
def client(request, tmp_path, monkeypatch):
    store = feedback.MemoryStore() if request.param == "memory" else feedback.SqlStore(f"sqlite:///{tmp_path}/fb.db")
    monkeypatch.setattr(feedback.State, "store", store)
    monkeypatch.setattr(feedback.State, "send_limiter", ExplainLimiter(per_client=100, daily_cap=1000))
    monkeypatch.setattr(feedback.State, "admin_limiter", ExplainLimiter(per_client=10, daily_cap=1000))
    monkeypatch.setenv("ADMIN_TOKEN", "secret-token")
    return TestClient(main.app)


def test_message_is_trimmed_and_validated(client):
    assert client.post("/feedback", json={"message": "   hello  ", "context": " 홈 "}).status_code == 201
    assert client.post("/feedback", json={"message": "   "}).status_code == 422
    assert client.post("/feedback", json={"message": "x" * 2001}).status_code == 422
    assert client.post("/feedback", json={"message": "x" * 2000}).status_code == 201
    rows = client.get("/admin/feedback", headers=ADMIN).json()
    assert [r["message"][:5] for r in rows] == ["xxxxx", "hello"]  # newest first, trimmed
    assert rows[1]["context"] == "홈"


def test_context_is_cut_to_200_characters(client):
    client.post("/feedback", json={"message": "hi", "context": "c" * 500})
    assert len(client.get("/admin/feedback", headers=ADMIN).json()[0]["context"]) == 200


@pytest.mark.parametrize("data,mime", [(PNG, "image/png"), (JPEG, "image/jpeg"), (GIF, "image/gif"), (WEBP, "image/webp")])
def test_screenshot_types_are_detected_from_the_bytes(client, data, mime):
    res = client.post("/feedback", json={"message": "see", "screenshot": f"data:image/x;base64,{b64(data)}"})
    assert res.status_code == 201
    shot = client.get(f"/admin/feedback/{res.json()['id']}/screenshot", headers=ADMIN)
    assert shot.status_code == 200 and shot.headers["content-type"] == mime and shot.content == data


def test_non_images_and_bad_base64_are_rejected(client):
    assert client.post("/feedback", json={"message": "m", "screenshot": b64(b"<html>not an image</html>")}).status_code == 422
    assert client.post("/feedback", json={"message": "m", "screenshot": "%%%not-base64%%%"}).status_code == 422


def test_oversized_screenshot_gets_413(client):
    big = PNG + b"\x00" * 1_500_000
    assert client.post("/feedback", json={"message": "m", "screenshot": b64(big)}).status_code == 413


def test_list_never_carries_the_screenshot_itself(client):
    client.post("/feedback", json={"message": "with", "screenshot": b64(PNG)})
    client.post("/feedback", json={"message": "without"})
    rows = client.get("/admin/feedback", headers=ADMIN).json()
    assert [r["has_screenshot"] for r in rows] == [False, True]
    assert all("screenshot" not in r for r in rows)
    assert client.get(f"/admin/feedback/{rows[0]['id']}/screenshot", headers=ADMIN).status_code == 404


def test_resolve_toggles(client):
    fid = client.post("/feedback", json={"message": "bug"}).json()["id"]
    assert client.post(f"/admin/feedback/{fid}/resolve", headers=ADMIN).json()["resolved"] is True
    assert client.get("/admin/feedback", headers=ADMIN).json()[0]["resolved"] is True
    assert client.post(f"/admin/feedback/{fid}/resolve", headers=ADMIN).json()["resolved"] is False
    assert client.post("/admin/feedback/9999/resolve", headers=ADMIN).status_code == 404


def test_admin_needs_the_token(client, monkeypatch):
    assert client.get("/admin/feedback").status_code == 401
    assert client.get("/admin/feedback", headers={"Authorization": "Bearer nope"}).status_code == 401
    assert client.get("/admin/feedback", headers={"Authorization": "secret-token"}).status_code == 401
    monkeypatch.delenv("ADMIN_TOKEN")
    assert client.get("/admin/feedback", headers=ADMIN).status_code == 404  # admin is off without a token


def test_admin_guessing_is_slowed_down(client, monkeypatch):
    monkeypatch.setattr(feedback.State, "admin_limiter", ExplainLimiter(per_client=3, daily_cap=1000))
    codes = [client.get("/admin/feedback", headers={"Authorization": "Bearer wrong"}).status_code for _ in range(5)]
    assert codes == [401, 401, 401, 429, 429]


def test_senders_are_rate_limited_per_ip(client, monkeypatch):
    monkeypatch.setattr(feedback.State, "send_limiter", ExplainLimiter(per_client=2, daily_cap=1000))
    ok = lambda ip: client.post("/feedback", json={"message": "m"}, headers={"x-forwarded-for": ip}).status_code  # noqa: E731
    assert [ok("1.1.1.1"), ok("1.1.1.1"), ok("1.1.1.1")] == [201, 201, 429]
    assert ok("2.2.2.2") == 201


def test_honeypot_is_silently_dropped(client):
    assert client.post("/feedback", json={"message": "buy now", "website": "http://spam"}).status_code == 201
    assert client.get("/admin/feedback", headers=ADMIN).json() == []


def test_postgres_urls_use_the_psycopg_driver(tmp_path):
    captured = {}

    import sqlalchemy

    real = sqlalchemy.create_engine

    def fake(url, **kw):
        captured["url"] = url
        return real(f"sqlite:///{tmp_path}/x.db")

    sqlalchemy.create_engine = fake
    try:
        feedback.SqlStore("postgres://u:p@host/db")
    finally:
        sqlalchemy.create_engine = real
    assert captured["url"] == "postgresql+psycopg://u:p@host/db"
