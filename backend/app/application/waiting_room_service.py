"""File d'attente / salle d'attente du jour."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.application.analytics_service import _parse_appt_date
from app.application.use_cases import AppointmentsService
from app.infrastructure.database import connect


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class WaitingRoomService:
    def __init__(self, appointments: AppointmentsService) -> None:
        self.appointments = appointments

    def snapshot(self) -> dict[str, Any]:
        today = _utc_now().date()
        conn = connect()
        rows = conn.execute(
            """
            SELECT id, patient_id, patient_name, doctor_id, doctor_name, date, status, reason, duration_min
            FROM appointments
            WHERE status IN ('scheduled', 'confirmed', 'arrived')
            ORDER BY date ASC
            """,
        ).fetchall()
        conn.close()

        waiting: list[dict[str, Any]] = []
        in_progress: list[dict[str, Any]] = []
        upcoming: list[dict[str, Any]] = []

        for row in rows:
            d = _parse_appt_date(row["date"])
            if d != today:
                continue
            item = {
                "appointmentId": row["id"],
                "patientId": row["patient_id"],
                "patientName": row["patient_name"],
                "doctorId": row["doctor_id"],
                "doctorName": row["doctor_name"],
                "date": row["date"],
                "status": row["status"],
                "reason": row["reason"],
                "durationMin": row["duration_min"],
            }
            if row["status"] == "arrived":
                in_progress.append(item)
            elif row["status"] == "confirmed":
                waiting.append(item)
            else:
                upcoming.append(item)

        return {
            "date": today.isoformat(),
            "waiting": waiting,
            "inProgress": in_progress,
            "upcoming": upcoming,
            "counts": {
                "waiting": len(waiting),
                "inProgress": len(in_progress),
                "upcoming": len(upcoming),
            },
            "generatedAt": _utc_now().isoformat(),
        }

    def call_next(self, doctor_id: str | None = None) -> dict[str, Any]:
        snap = self.snapshot()
        queue = snap["waiting"]
        if doctor_id:
            queue = [q for q in queue if q["doctorId"] == doctor_id]
        if not queue:
            return {"called": None, "message": "Aucun patient en attente"}
        nxt = queue[0]
        updated = self.appointments.transition_status(nxt["appointmentId"], "arrived")
        return {
            "called": {
                "appointmentId": updated.id,
                "patientId": updated.patient_id,
                "patientName": updated.patient_name,
                "doctorName": updated.doctor_name,
                "status": updated.status,
            },
            "message": f"Appel de {updated.patient_name}",
        }
