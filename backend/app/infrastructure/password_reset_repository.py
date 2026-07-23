"""Stockage des codes de réinitialisation mot de passe (hash SHA-256)."""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from app.infrastructure.database import connect

MAX_VERIFY_ATTEMPTS = 5


def hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _generate_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def _parse_iso(value: str) -> datetime:
    normalized = value.replace("Z", "+00:00")
    dt = datetime.fromisoformat(normalized)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


class PasswordResetRepository:
    def create(self, user_id: str, *, expires_minutes: int) -> str:
        """Invalidate previous codes and create a new one. Returns the raw 6-digit code."""
        now = _utc_now()
        conn = connect()
        conn.execute(
            "UPDATE password_reset_tokens SET used_at=? WHERE user_id=? AND used_at IS NULL",
            (_iso(now), user_id),
        )
        raw_code = _generate_code()
        reset_id = f"prt-{secrets.token_hex(8)}"
        conn.execute(
            """
            INSERT INTO password_reset_tokens
              (id, user_id, token_hash, attempts, created_at, expires_at, used_at)
            VALUES (?, ?, ?, 0, ?, ?, NULL)
            """,
            (
                reset_id,
                user_id,
                hash_reset_token(raw_code),
                _iso(now),
                _iso(now + timedelta(minutes=expires_minutes)),
            ),
        )
        conn.commit()
        conn.close()
        return raw_code

    def get_active_for_user(self, user_id: str) -> dict[str, Any] | None:
        conn = connect()
        row = conn.execute(
            """
            SELECT * FROM password_reset_tokens
            WHERE user_id=? AND used_at IS NULL
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (user_id,),
        ).fetchone()
        conn.close()
        return row

    def register_failed_attempt(self, reset_id: str, attempts: int) -> None:
        conn = connect()
        new_attempts = attempts + 1
        if new_attempts >= MAX_VERIFY_ATTEMPTS:
            conn.execute(
                "UPDATE password_reset_tokens SET attempts=?, used_at=? WHERE id=?",
                (new_attempts, _iso(_utc_now()), reset_id),
            )
        else:
            conn.execute(
                "UPDATE password_reset_tokens SET attempts=? WHERE id=?",
                (new_attempts, reset_id),
            )
        conn.commit()
        conn.close()

    def mark_used(self, reset_id: str) -> None:
        conn = connect()
        conn.execute(
            "UPDATE password_reset_tokens SET used_at=? WHERE id=?",
            (_iso(_utc_now()), reset_id),
        )
        conn.commit()
        conn.close()

    @staticmethod
    def is_expired(row: dict[str, Any]) -> bool:
        return _parse_iso(row["expires_at"]) <= _utc_now()
