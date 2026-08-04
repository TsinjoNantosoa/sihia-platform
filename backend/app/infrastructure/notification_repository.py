"""Persistance lectures et préférences de notifications."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.infrastructure.database import connect


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class NotificationRepository:
    def list_read_ids(self, user_id: str) -> set[str]:
        conn = connect()
        rows = conn.execute(
            "SELECT alert_id FROM user_notification_reads WHERE user_id=?",
            (user_id,),
        ).fetchall()
        conn.close()
        return {r["alert_id"] for r in rows}

    def mark_read(self, user_id: str, alert_ids: list[str]) -> int:
        if not alert_ids:
            return 0
        now = _utc_now_iso()
        conn = connect()
        count = 0
        for alert_id in alert_ids:
            existing = conn.execute(
                "SELECT 1 FROM user_notification_reads WHERE user_id=? AND alert_id=? LIMIT 1",
                (user_id, alert_id),
            ).fetchone()
            if existing:
                continue
            conn.execute(
                "INSERT INTO user_notification_reads (user_id, alert_id, read_at) VALUES (?,?,?)",
                (user_id, alert_id, now),
            )
            count += 1
        conn.commit()
        conn.close()
        return count

    def get_prefs(self, user_id: str) -> dict[str, Any]:
        conn = connect()
        row = conn.execute(
            "SELECT * FROM user_notification_prefs WHERE user_id=?",
            (user_id,),
        ).fetchone()
        conn.close()
        if not row:
            return {
                "alertsEnabled": True,
                "remindersEnabled": True,
                "weeklyDigestEnabled": False,
                "updatedAt": None,
            }
        return {
            "alertsEnabled": bool(row["alerts_enabled"]),
            "remindersEnabled": bool(row["reminders_enabled"]),
            "weeklyDigestEnabled": bool(row["weekly_digest_enabled"]),
            "updatedAt": row["updated_at"],
        }

    def upsert_prefs(
        self,
        user_id: str,
        *,
        alerts_enabled: bool | None = None,
        reminders_enabled: bool | None = None,
        weekly_digest_enabled: bool | None = None,
    ) -> dict[str, Any]:
        current = self.get_prefs(user_id)
        next_alerts = current["alertsEnabled"] if alerts_enabled is None else alerts_enabled
        next_reminders = current["remindersEnabled"] if reminders_enabled is None else reminders_enabled
        next_weekly = current["weeklyDigestEnabled"] if weekly_digest_enabled is None else weekly_digest_enabled
        now = _utc_now_iso()
        conn = connect()
        existing = conn.execute(
            "SELECT 1 FROM user_notification_prefs WHERE user_id=? LIMIT 1",
            (user_id,),
        ).fetchone()
        if existing:
            conn.execute(
                """
                UPDATE user_notification_prefs
                SET alerts_enabled=?, reminders_enabled=?, weekly_digest_enabled=?, updated_at=?
                WHERE user_id=?
                """,
                (int(next_alerts), int(next_reminders), int(next_weekly), now, user_id),
            )
        else:
            conn.execute(
                """
                INSERT INTO user_notification_prefs
                (user_id, alerts_enabled, reminders_enabled, weekly_digest_enabled, updated_at)
                VALUES (?,?,?,?,?)
                """,
                (user_id, int(next_alerts), int(next_reminders), int(next_weekly), now),
            )
        conn.commit()
        conn.close()
        return {
            "alertsEnabled": next_alerts,
            "remindersEnabled": next_reminders,
            "weeklyDigestEnabled": next_weekly,
            "updatedAt": now,
        }
