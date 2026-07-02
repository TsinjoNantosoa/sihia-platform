from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from threading import Lock
from time import time


@dataclass
class _Window:
    hits: deque[float] = field(default_factory=deque)


class ChatbotRateLimiter:
    def __init__(self, max_per_minute: int = 20) -> None:
        self.max_per_minute = max_per_minute
        self._lock = Lock()
        self._windows: dict[str, _Window] = {}

    def check(self, key: str) -> int | None:
        now = time()
        with self._lock:
            window = self._windows.setdefault(key, _Window())
            while window.hits and now - window.hits[0] > 60:
                window.hits.popleft()
            if len(window.hits) >= self.max_per_minute:
                retry = int(60 - (now - window.hits[0]))
                return max(retry, 1)
            window.hits.append(now)
            return None

    def reset(self) -> None:
        with self._lock:
            self._windows.clear()
