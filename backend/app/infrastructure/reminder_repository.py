"""Persistance des rappels de rendez-vous."""

from __future__ import annotations

from typing import Any

from app.domain.models import AppointmentReminder
from app.infrastructure.database import connect


def _row_to_reminder(row: dict[str, Any]) -> AppointmentReminder:
    return AppointmentReminder(
        id=row["id"],
        appointment_id=row["appointment_id"],
        channel=row["channel"],
        kind=row["kind"],
        status=row["status"],
        recipient=row["recipient"],
        message=row["message"],
        sent_at=row["sent_at"],
        error=row.get("error"),
    )


class ReminderRepository:
    def list_for_appointment(self, appointment_id: str) -> list[AppointmentReminder]:
        conn = connect()
        rows = conn.execute(
            "SELECT * FROM appointment_reminders WHERE appointment_id=? ORDER BY sent_at DESC",
            (appointment_id,),
        ).fetchall()
        conn.close()
        return [_row_to_reminder(r) for r in rows]

    def has_auto_reminder(self, appointment_id: str, channel: str) -> bool:
        conn = connect()
        row = conn.execute(
            """
            SELECT 1 FROM appointment_reminders
            WHERE appointment_id=? AND channel=? AND kind='auto' AND status='sent'
            LIMIT 1
            """,
            (appointment_id, channel),
        ).fetchone()
        conn.close()
        return row is not None

    def create(self, reminder: AppointmentReminder) -> AppointmentReminder:
        conn = connect()
        conn.execute(
            """
            INSERT INTO appointment_reminders
            (id, appointment_id, channel, kind, status, recipient, message, sent_at, error)
            VALUES (?,?,?,?,?,?,?,?,?)
            """,
            (
                reminder.id,
                reminder.appointment_id,
                reminder.channel,
                reminder.kind,
                reminder.status,
                reminder.recipient,
                reminder.message,
                reminder.sent_at,
                reminder.error,
            ),
        )
        conn.commit()
        conn.close()
        return reminder

    def summaries_for(self, appointment_ids: list[str]) -> dict[str, dict[str, Any]]:
        if not appointment_ids:
            return {}
        placeholders = ",".join("?" for _ in appointment_ids)
        conn = connect()
        rows = conn.execute(
            f"""
            SELECT appointment_id, channel, status, sent_at
            FROM appointment_reminders
            WHERE appointment_id IN ({placeholders})
            ORDER BY sent_at DESC
            """,
            appointment_ids,
        ).fetchall()
        conn.close()

        summaries: dict[str, dict[str, Any]] = {}
        for row in rows:
            appt_id = row["appointment_id"]
            bucket = summaries.setdefault(
                appt_id,
                {"email": "none", "sms": "none", "lastSentAt": None},
            )
            channel = row["channel"]
            if bucket[channel] == "none" and row["status"] == "sent":
                bucket[channel] = "sent"
            elif bucket[channel] == "none" and row["status"] == "failed":
                bucket[channel] = "failed"
            if bucket["lastSentAt"] is None:
                bucket["lastSentAt"] = row["sent_at"]
        return summaries
