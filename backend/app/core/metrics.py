"""Compteurs en mémoire pour health / observabilité (pilote)."""

from __future__ import annotations

from dataclasses import dataclass, field
from threading import Lock


@dataclass
class AppMetrics:
    http_requests: int = 0
    http_errors_5xx: int = 0
    auth_forbidden: int = 0
    auth_unauthorized: int = 0
    _lock: Lock = field(default_factory=Lock, repr=False)

    def inc(self, name: str, amount: int = 1) -> None:
        with self._lock:
            current = getattr(self, name, 0)
            setattr(self, name, current + amount)

    def snapshot(self) -> dict[str, int]:
        with self._lock:
            return {
                "http_requests": self.http_requests,
                "http_errors_5xx": self.http_errors_5xx,
                "auth_forbidden": self.auth_forbidden,
                "auth_unauthorized": self.auth_unauthorized,
            }

    def reset(self) -> None:
        with self._lock:
            self.http_requests = 0
            self.http_errors_5xx = 0
            self.auth_forbidden = 0
            self.auth_unauthorized = 0


metrics = AppMetrics()
