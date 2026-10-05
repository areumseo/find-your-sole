import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ.setdefault("ANTHROPIC_API_KEY", "test")

import anthropic  # noqa: E402
import httpx  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import feedback  # noqa: E402
import main  # noqa: E402
import shoe_news  # noqa: E402
import startup_checks as sc  # noqa: E402


class FakeModels:
    def __init__(self, error=None):
        self.error = error

    def with_options(self, **kw):
        return self

    @property
    def models(self):
        return self

    def list(self, **kw):
        if self.error:
            raise self.error
        return []


def api_error(status, kind):
    request = httpx.Request("GET", "https://api.anthropic.com/v1/models")
    response = httpx.Response(status, request=request, json={"error": {"type": kind}})
    return anthropic.APIStatusError("x", response=response, body={"error": {"type": kind}})


@pytest.fixture(autouse=True)
def clean(monkeypatch):
    sc.results.clear()
    for var in ("ANTHROPIC_API_KEY", "DATABASE_URL", "ADMIN_TOKEN", "NAVER_CLIENT_ID", "NAVER_CLIENT_SECRET"):
        monkeypatch.delenv(var, raising=False)


def test_anthropic_key_states(monkeypatch, capsys):
    sc.check_anthropic(FakeModels())
    assert sc.results["anthropic"]["ok"] is False and "not set" in sc.results["anthropic"]["detail"]

    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-secret")
    sc.check_anthropic(FakeModels())
    assert sc.results["anthropic"] == {"ok": True, "detail": "key accepted"}

    sc.check_anthropic(FakeModels(api_error(401, "authentication_error")))
    assert sc.results["anthropic"] == {"ok": False, "detail": "HTTP 401 authentication_error"}

    sc.check_anthropic(FakeModels(RuntimeError("boom sk-ant-secret")))
    assert sc.results["anthropic"] == {"ok": False, "detail": "RuntimeError"}
    assert "sk-ant-secret" not in capsys.readouterr().out  # keys are never logged


def test_naver_states(monkeypatch):
    monkeypatch.setattr(shoe_news.service, "_id", None)
    sc.check_naver()
    assert sc.results["naver"]["ok"] is None

    monkeypatch.setattr(shoe_news.service, "_id", "id")
    monkeypatch.setattr(shoe_news.service, "_secret", "secret")
    for code, want in [(200, True), (401, False)]:
        monkeypatch.setattr(sc.httpx, "get", lambda *a, _c=code, **k: httpx.Response(_c, request=httpx.Request("GET", "https://x")))
        sc.check_naver()
        assert sc.results["naver"]["ok"] is want
    assert sc.results["naver"]["detail"] == "HTTP 401"

    def down(*a, **k):
        raise httpx.ConnectError("no route")

    monkeypatch.setattr(sc.httpx, "get", down)
    sc.check_naver()
    assert sc.results["naver"] == {"ok": False, "detail": "ConnectError"}


def test_database_states(monkeypatch, tmp_path):
    sc.check_database()
    assert sc.results["database"]["ok"] is None

    monkeypatch.setenv("DATABASE_URL", "sqlite:///x")
    monkeypatch.setattr(feedback.State, "store", feedback.SqlStore(f"sqlite:///{tmp_path}/ok.db"))
    sc.check_database()
    assert sc.results["database"] == {"ok": True, "detail": "connected"}

    class Broken(feedback.MemoryStore):
        def ping(self):
            raise ConnectionError("db down at postgres://user:password@host/db")

    monkeypatch.setattr(feedback.State, "store", Broken())
    sc.check_database()
    assert sc.results["database"] == {"ok": False, "detail": "ConnectionError"}  # the URL never leaks


def test_admin_token_states(monkeypatch):
    sc.check_admin()
    assert sc.results["admin"]["ok"] is None
    monkeypatch.setenv("ADMIN_TOKEN", "short")
    sc.check_admin()
    assert sc.results["admin"]["ok"] is False
    monkeypatch.setenv("ADMIN_TOKEN", "a-long-enough-token-1234")
    sc.check_admin()
    assert sc.results["admin"]["ok"] is True


def test_a_crashing_check_does_not_stop_the_others(monkeypatch):
    def crash():
        raise RuntimeError("bug")

    monkeypatch.setattr(sc, "check_naver", crash)
    sc.run_all(FakeModels())
    assert sc.results["naver"] == {"ok": False, "detail": "check crashed: RuntimeError"}
    assert set(sc.results) == {"anthropic", "naver", "database", "admin"}


def test_admin_status_endpoint_needs_the_token(monkeypatch):
    monkeypatch.setenv("ADMIN_TOKEN", "a-long-enough-token-1234")
    sc.results["anthropic"] = {"ok": True, "detail": "key accepted"}
    client = TestClient(main.app)
    assert client.get("/admin/status").status_code == 401
    res = client.get("/admin/status", headers={"Authorization": "Bearer a-long-enough-token-1234"})
    assert res.status_code == 200 and res.json()["anthropic"]["ok"] is True
