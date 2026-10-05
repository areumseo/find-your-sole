"""In-memory limits for the paid /explain endpoint.

Two guards: a per-client sliding window (stops one visitor hammering it) and a
global daily cap (a hard ceiling on spend however many visitors there are).
State lives in process memory, which is right for the single Render instance
this runs on; a restart simply resets the counters.
"""
from __future__ import annotations

import os
import time
from collections import deque
from datetime import datetime, timezone
from typing import Callable, Deque, Dict, Optional, Tuple


class ExplainLimiter:
    def __init__(
        self,
        per_client: int = 10,
        window_seconds: float = 600.0,
        daily_cap: int = 500,
        clock: Callable[[], float] = time.time,
    ):
        self.per_client, self.window, self.daily_cap, self._clock = per_client, window_seconds, daily_cap, clock
        self._hits: Dict[str, Deque[float]] = {}
        self._day: Optional[str] = None
        self._day_count = 0

    @classmethod
    def from_env(cls) -> "ExplainLimiter":
        return cls(
            per_client=int(os.environ.get("EXPLAIN_PER_CLIENT", 10)),
            window_seconds=float(os.environ.get("EXPLAIN_WINDOW_SECONDS", 600)),
            daily_cap=int(os.environ.get("EXPLAIN_DAILY_CAP", 500)),
        )

    def check(self, client: str) -> Tuple[bool, int]:
        """Record a request. Returns (allowed, retry_after_seconds)."""
        now = self._clock()
        today = datetime.fromtimestamp(now, timezone.utc).strftime("%Y-%m-%d")
        if today != self._day:
            self._day, self._day_count = today, 0
        if self._day_count >= self.daily_cap:
            return False, 3600

        hits = self._hits.setdefault(client, deque())
        while hits and now - hits[0] >= self.window:
            hits.popleft()
        if len(hits) >= self.per_client:
            return False, (max(1, int(self.window - (now - hits[0]))) if hits else int(self.window))

        hits.append(now)
        self._day_count += 1
        self._prune(now)
        return True, 0

    def _prune(self, now: float) -> None:
        # Keep memory bounded: drop clients with no recent hits.
        if len(self._hits) > 5000:
            for key in [k for k, d in self._hits.items() if not d or now - d[-1] >= self.window]:
                del self._hits[key]
