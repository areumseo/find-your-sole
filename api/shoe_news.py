"""Shoe launch news from the Naver Search API, cached on the server.

NAVER_CLIENT_ID and NAVER_CLIENT_SECRET come from the server's environment and
never reach the browser. Without them, or whenever Naver fails, /news returns an
empty list and the web app simply hides the widget.

Visitors never trigger a Naver call directly: results are cached for a few
hours, so the call count depends on the clock, not on traffic.
"""
from __future__ import annotations

import asyncio
import html
import logging
import os
import re
import time
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from typing import Callable, List, Optional
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Response
from pydantic import BaseModel

log = logging.getLogger("shoe_news")

# NAVER API HUB (Naver Cloud Platform). The old developers.naver.com endpoint
# (openapi.naver.com, X-Naver-Client-*) no longer accepts new keys.
NAVER_NEWS_URL = "https://naverapihub.apigw.ntruss.com/search/v1/news"
QUERIES = ["러닝화 신제품", "러닝화 출시", "운동화 신제품 출시", "워킹화 출시"]

SHOE_WORDS = ("신발", "운동화", "러닝화", "런닝화", "스니커즈", "워킹화", "슈즈", "shoe", "sneaker")
LAUNCH_WORDS = ("출시", "신제품", "공개", "선보", "신상", "런칭", "론칭", "발매", "첫선", "새 모델")
# Sale and promo posts match the queries but are not launch news.
PROMO_WORDS = ("할인", "특가", "쿠폰", "최저가", "세일", "이벤트", "증정", "프로모션", "행사", "마감")

MAX_AGE = timedelta(days=60)
MAX_ITEMS = 8


class NewsItem(BaseModel):
    title: str
    source: str
    url: str
    published_at: str  # ISO 8601, UTC


_TAG = re.compile(r"<[^>]+>")
_SPACES = re.compile(r"\s+")
_NON_WORD = re.compile(r"\W+")


def _clean(text: str) -> str:
    """Naver wraps matches in <b> and HTML-escapes the rest."""
    return _SPACES.sub(" ", html.unescape(_TAG.sub("", text))).strip()


def _source(original_link: str, link: str) -> str:
    host = urlparse(original_link or link).netloc.lower()
    host = host.removeprefix("www.")
    return "네이버 뉴스" if host.endswith("naver.com") else host


def parse_items(raw: List[dict], now: datetime) -> List[NewsItem]:
    """Turn raw API items into clean, relevant, de-duplicated news, newest first."""
    seen_titles, seen_urls, out = set(), set(), []
    for it in raw:
        title = _clean(it.get("title", ""))
        url = it.get("originallink") or it.get("link") or ""
        try:
            published = parsedate_to_datetime(it["pubDate"]).astimezone(timezone.utc)
        except (KeyError, TypeError, ValueError):
            continue
        lowered = title.lower()
        if (
            not title
            or not url.startswith(("http://", "https://"))
            or not any(w in lowered for w in SHOE_WORDS)
            or not any(w in lowered for w in LAUNCH_WORDS)
            or any(w in lowered for w in PROMO_WORDS)
            or now - published > MAX_AGE
            or published > now + timedelta(days=1)  # bad clocks in feeds
        ):
            continue
        key = _NON_WORD.sub("", lowered)
        if key in seen_titles or url in seen_urls:
            continue
        seen_titles.add(key)
        seen_urls.add(url)
        out.append(NewsItem(title=title, source=_source(it.get("originallink", ""), it.get("link", "")),
                            url=url, published_at=published.isoformat()))
    out.sort(key=lambda n: n.published_at, reverse=True)
    return out[:MAX_ITEMS]


class NewsService:
    def __init__(
        self,
        client_id: Optional[str],
        client_secret: Optional[str],
        *,
        ttl: float = 3 * 3600,
        stale_ttl: float = 24 * 3600,
        retry_after: float = 300,
        transport: Optional[httpx.AsyncBaseTransport] = None,
        clock: Callable[[], float] = time.time,
    ) -> None:
        # Pasted env values often carry stray whitespace/quotes; Naver rejects them with 401.
        self._id = client_id.strip().strip("'\"") if client_id else client_id
        self._secret = client_secret.strip().strip("'\"") if client_secret else client_secret
        self.ttl, self.stale_ttl, self.retry_after = ttl, stale_ttl, retry_after
        self._transport, self._clock = transport, clock
        self._items: Optional[List[NewsItem]] = None
        self._fresh_until = 0.0
        self._stale_until = 0.0
        self.updated_at: Optional[float] = None  # when the items were last fetched from Naver
        self._lock = asyncio.Lock()
        if not self.enabled:
            log.warning("NAVER_CLIENT_ID / NAVER_CLIENT_SECRET not set; /news will return an empty list")
        else:
            # Lengths only, never the values: lets you spot swapped or truncated keys.
            log.warning("naver keys loaded: id_len=%d secret_len=%d", len(self._id), len(self._secret))

    @classmethod
    def from_env(cls) -> "NewsService":
        return cls(os.environ.get("NAVER_CLIENT_ID"), os.environ.get("NAVER_CLIENT_SECRET"),
                   ttl=float(os.environ.get("NEWS_TTL_SECONDS", 3 * 3600)))

    @property
    def enabled(self) -> bool:
        return bool(self._id and self._secret)

    async def get(self) -> List[NewsItem]:
        if not self.enabled:
            return []
        if self._items is not None and self._clock() < self._fresh_until:
            return self._items
        async with self._lock:  # one refresh at a time; others wait and reuse it
            now = self._clock()
            if self._items is not None and now < self._fresh_until:
                return self._items
            try:
                items = await self._fetch()
            except Exception as exc:  # noqa: BLE001 - never let news take the API down
                # Log the type only: the message can echo the request, which carries the secret.
                log.warning("news refresh failed (%s); backing off %ss", type(exc).__name__, int(self.retry_after))
                self._fresh_until = now + self.retry_after
                if self._items is None or now >= self._stale_until:
                    self._items = []
                return self._items
            self._items = items
            self.updated_at = now
            self._fresh_until = now + self.ttl
            self._stale_until = now + self.stale_ttl
            return items

    async def _fetch(self) -> List[NewsItem]:
        headers = {"X-NCP-APIGW-API-KEY-ID": self._id, "X-NCP-APIGW-API-KEY": self._secret}
        async with httpx.AsyncClient(timeout=6.0, transport=self._transport) as client:
            results = await asyncio.gather(
                *[client.get(NAVER_NEWS_URL, params={"query": q, "display": 30, "sort": "date"}, headers=headers)
                  for q in QUERIES],
                return_exceptions=True,
            )
        raw: List[dict] = []
        failures = 0
        for r in results:
            try:
                if isinstance(r, Exception):
                    raise r
                r.raise_for_status()
                raw.extend(r.json().get("items", []))
            except Exception as exc:  # noqa: BLE001
                failures += 1
                # Log the cause (never the keys) so a bad key / disabled API is diagnosable.
                if isinstance(exc, httpx.HTTPStatusError):
                    log.warning("naver news query failed: HTTP %s %s", exc.response.status_code, exc.response.text[:200])
                else:
                    log.warning("naver news query failed: %s: %s", type(exc).__name__, exc)
        if failures == len(QUERIES):
            raise RuntimeError("all news queries failed")
        return parse_items(raw, datetime.fromtimestamp(self._clock(), timezone.utc))


router = APIRouter()
service = NewsService.from_env()


@router.get("/news", response_model=List[NewsItem])
async def news(response: Response):
    items = await service.get()
    # An empty list means "disabled or failing"; let clients retry sooner.
    response.headers["Cache-Control"] = "public, max-age=600" if items else "public, max-age=60"
    if items and service.updated_at:
        stamp = datetime.fromtimestamp(service.updated_at, timezone.utc)
        response.headers["X-News-Updated"] = stamp.strftime("%Y-%m-%dT%H:%M:%SZ")
    return items
