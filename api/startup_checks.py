"""Checks run once at startup (in the background) so a wrong or missing key shows up in the
Render logs right after a deploy, not weeks later as a feature that quietly does nothing.

Each check records ok=True (works), ok=False (configured but failing) or ok=None (not
configured). Only the kind of failure is logged, never a key, URL or response body.
The latest results are also available to the admin at GET /admin/status.
"""
from __future__ import annotations

import os
import threading
from typing import Callable, Dict

import anthropic
import httpx
from fastapi import APIRouter, Depends

try:  # started from api/ (`uvicorn main:app`)
    import feedback
    import shoe_news
except ModuleNotFoundError:  # started from the repo root (`uvicorn api.main:app`)
    from api import feedback, shoe_news

results: Dict[str, Dict] = {}
router = APIRouter()


def _record(name: str, ok, detail: str) -> None:
    results[name] = {"ok": ok, "detail": detail}
    state = {True: "OK", False: "FAILED", None: "skipped"}[ok]
    print(f"startup check {name}: {state} ({detail})")


def check_anthropic(client: anthropic.Anthropic) -> None:
    if not os.environ.get("ANTHROPIC_API_KEY"):
        return _record("anthropic", False, "ANTHROPIC_API_KEY is not set")
    try:
        # Listing models is free and proves the key is accepted.
        client.with_options(timeout=10.0, max_retries=0).models.list(limit=1)
        _record("anthropic", True, "key accepted")
    except anthropic.APIStatusError as exc:
        body = getattr(exc, "body", None)
        kind = body.get("error", {}).get("type", "") if isinstance(body, dict) and isinstance(body.get("error"), dict) else ""
        _record("anthropic", False, f"HTTP {exc.status_code} {kind}".strip())
    except Exception as exc:  # noqa: BLE001
        _record("anthropic", False, type(exc).__name__)


def check_naver() -> None:
    service = shoe_news.service
    if not service.enabled:
        return _record("naver", None, "NAVER_CLIENT_ID / NAVER_CLIENT_SECRET not set; news is off")
    try:
        res = httpx.get(
            shoe_news.NAVER_NEWS_URL, params={"query": "러닝화", "display": 1},
            headers={"X-NCP-APIGW-API-KEY-ID": service._id, "X-NCP-APIGW-API-KEY": service._secret}, timeout=8.0,
        )
        _record("naver", res.status_code == 200, "keys accepted" if res.status_code == 200 else f"HTTP {res.status_code}")
    except Exception as exc:  # noqa: BLE001
        _record("naver", False, type(exc).__name__)


def check_database() -> None:
    if not os.environ.get("DATABASE_URL", "").strip():
        return _record("database", None, "DATABASE_URL not set; feedback is kept in memory and lost on restart")
    try:
        feedback.get_store().ping()
        _record("database", True, "connected")
    except Exception as exc:  # noqa: BLE001
        _record("database", False, type(exc).__name__)


def check_admin() -> None:
    token = os.environ.get("ADMIN_TOKEN", "")
    if not token:
        _record("admin", None, "ADMIN_TOKEN not set; the admin page is off")
    elif len(token) < 16:
        _record("admin", False, "ADMIN_TOKEN is shorter than 16 characters")
    else:
        _record("admin", True, "token set")


def run_all(client: anthropic.Anthropic) -> None:
    steps: Dict[str, Callable[[], None]] = {
        "anthropic": lambda: check_anthropic(client), "naver": check_naver,
        "database": check_database, "admin": check_admin,
    }
    for name, step in steps.items():
        try:
            step()
        except Exception as exc:  # noqa: BLE001 - a check must never take the app down
            _record(name, False, f"check crashed: {type(exc).__name__}")


def start_in_background(client: anthropic.Anthropic) -> threading.Thread:
    thread = threading.Thread(target=run_all, args=(client,), name="startup-checks", daemon=True)
    thread.start()
    return thread


@router.get("/admin/status", dependencies=[Depends(feedback.require_admin)])
def status():
    return results
