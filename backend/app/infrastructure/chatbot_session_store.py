from __future__ import annotations

import threading
from typing import Any


class ChatbotSessionStore:
    """In-memory chat sessions (dev/pilot). Replace with Redis in production."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._sessions: dict[str, list[dict[str, Any]]] = {}

    def get_messages(self, session_id: str) -> list[dict[str, Any]]:
        with self._lock:
            return list(self._sessions.get(session_id, []))

    def append(self, session_id: str, message: dict[str, Any]) -> None:
        with self._lock:
            self._sessions.setdefault(session_id, []).append(message)

    def clear(self, session_id: str) -> None:
        with self._lock:
            self._sessions.pop(session_id, None)

    def clear_all(self) -> None:
        with self._lock:
            self._sessions.clear()
