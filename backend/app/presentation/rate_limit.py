from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from threading import Lock
from time import time


@dataclass
class _AttemptWindow:
    failures: deque[float] = field(default_factory=deque)


_LOCK = Lock()
_WINDOW_SECONDS = 5 * 60
_MAX_FAILURES = 5
_STATE: dict[str, _AttemptWindow] = {}


def _cleanup(window: _AttemptWindow, now: float) -> None:
    while window.failures and now - window.failures[0] > _WINDOW_SECONDS:
        window.failures.popleft()


def check_login_allowed(key: str) -> int | None:
    """Retourne seconds_to_wait si bloqué, sinon None."""
    now = time()
    with _LOCK:
        window = _STATE.get(key)
        if window is None:
            return None
        _cleanup(window, now)
        if len(window.failures) < _MAX_FAILURES:
            return None
        retry_after = int(_WINDOW_SECONDS - (now - window.failures[0]))
        return max(retry_after, 1)


def register_login_failure(key: str) -> None:
    now = time()
    with _LOCK:
        window = _STATE.setdefault(key, _AttemptWindow())
        _cleanup(window, now)
        window.failures.append(now)


def reset_login_limiter(key: str) -> None:
    with _LOCK:
        _STATE.pop(key, None)


def reset_login_limiter_all() -> None:
    with _LOCK:
        _STATE.clear()
