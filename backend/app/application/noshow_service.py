"""Score de risque d'absence (no-show) — heuristique déterministe.

Aide à la décision opérationnelle uniquement : ne constitue pas un diagnostic clinique.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any

from app.application.analytics_service import _parse_appt_date
from app.application.ml_engine import ml_data_source
from app.infrastructure.database import connect

_ACTIVE = frozenset({"scheduled", "confirmed"})
_HISTORY_STATUSES = frozenset({"completed", "noshow", "arrived", "cancelled"})
MODEL_NAME = "heuristic-noshow"
MODEL_VERSION = "heuristic-noshow-1.0"
DISCLAIMER = (
    "Score indicatif d'aide à la décision opérationnelle. "
    "Ne remplace pas le jugement du personnel soignant."
)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_dt(value: str) -> datetime | None:
    try:
        normalized = value.replace("Z", "+00:00")
        dt = datetime.fromisoformat(normalized)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        d = _parse_appt_date(value)
        if d is None:
            return None
        return datetime(d.year, d.month, d.day, tzinfo=timezone.utc)


def _clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


def _risk_level(score: float) -> str:
    if score >= 0.45:
        return "high"
    if score >= 0.25:
        return "medium"
    return "low"


class NoShowRiskService:
    """Calcule un score no-show à partir de l'historique RDV (sans modèle externe)."""

    def list_risks(
        self,
        *,
        horizon_days: int = 7,
        min_risk: float = 0.0,
        risk_level: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> dict[str, Any]:
        horizon_days = max(1, min(horizon_days, 60))
        min_risk = _clamp(min_risk)
        limit = max(1, min(limit, 200))
        offset = max(0, offset)
        level_filter = risk_level.lower().strip() if risk_level else None
        if level_filter and level_filter not in {"high", "medium", "low"}:
            level_filter = None

        now = _utc_now()
        today = now.date()
        end = today + timedelta(days=horizon_days)

        conn = connect()
        appointments = conn.execute("SELECT * FROM appointments").fetchall()
        reminder_rows = conn.execute(
            """
            SELECT appointment_id, COUNT(*) AS c
            FROM appointment_reminders
            WHERE status = 'sent'
            GROUP BY appointment_id
            """,
        ).fetchall()
        conn.close()

        reminders_sent = {r["appointment_id"]: int(r["c"]) for r in reminder_rows}
        patient_stats = self._patient_stats(appointments)
        facility_rate = self._facility_noshow_rate(appointments)

        items: list[dict[str, Any]] = []
        for row in appointments:
            if row["status"] not in _ACTIVE:
                continue
            appt_date = _parse_appt_date(row["date"])
            if appt_date is None or appt_date < today or appt_date > end:
                continue

            scored = self._score_appointment(
                row,
                patient_stats=patient_stats,
                reminders_sent=reminders_sent,
                facility_rate=facility_rate,
                today=today,
            )
            if scored["riskScore"] < min_risk:
                continue
            if level_filter and scored["riskLevel"] != level_filter:
                continue
            items.append(scored)

        items.sort(key=lambda x: (-x["riskScore"], x["date"], x["patientName"]))
        total = len(items)
        page = items[offset : offset + limit]

        high = sum(1 for i in items if i["riskLevel"] == "high")
        medium = sum(1 for i in items if i["riskLevel"] == "medium")
        low = sum(1 for i in items if i["riskLevel"] == "low")
        avg = round(sum(i["riskScore"] for i in items) / total, 3) if total else 0.0

        return {
            "items": page,
            "total": total,
            "limit": limit,
            "offset": offset,
            "horizonDays": horizon_days,
            "minRisk": min_risk,
            "model": MODEL_NAME,
            "model_version": MODEL_VERSION,
            "engine": "rules",
            "source": ml_data_source(),
            "generatedAt": now.isoformat(),
            "disclaimer": DISCLAIMER,
            "facilityNoshowRate": round(facility_rate, 3),
            "summary": {
                "high": high,
                "medium": medium,
                "low": low,
                "avgRisk": avg,
            },
        }

    def _patient_stats(self, appointments: list[dict]) -> dict[str, dict[str, int]]:
        stats: dict[str, dict[str, int]] = {}
        for row in appointments:
            if row["status"] not in _HISTORY_STATUSES and row["status"] != "noshow":
                # completed/arrived/cancelled/noshow count as history; ignore future active
                if row["status"] in _ACTIVE:
                    continue
            pid = row["patient_id"]
            bucket = stats.setdefault(pid, {"total": 0, "noshow": 0})
            if row["status"] in {"completed", "arrived", "noshow", "cancelled"}:
                bucket["total"] += 1
                if row["status"] == "noshow":
                    bucket["noshow"] += 1
        return stats

    def _facility_noshow_rate(self, appointments: list[dict]) -> float:
        total = 0
        noshow = 0
        for row in appointments:
            if row["status"] in {"completed", "arrived", "noshow"}:
                total += 1
                if row["status"] == "noshow":
                    noshow += 1
        if total == 0:
            return 0.12
        return noshow / total

    def _score_appointment(
        self,
        row: dict,
        *,
        patient_stats: dict[str, dict[str, int]],
        reminders_sent: dict[str, int],
        facility_rate: float,
        today: date,
    ) -> dict[str, Any]:
        pid = row["patient_id"]
        stats = patient_stats.get(pid, {"total": 0, "noshow": 0})
        past_total = stats["total"]
        past_noshow = stats["noshow"]
        patient_rate = (past_noshow / past_total) if past_total > 0 else facility_rate

        appt_date = _parse_appt_date(row["date"]) or today
        days_until = (appt_date - today).days
        reminder_count = reminders_sent.get(row["id"], 0)
        has_reminder = reminder_count > 0
        is_scheduled = row["status"] == "scheduled"

        factors: list[dict[str, Any]] = []
        score = 0.10

        hist_w = round(patient_rate * 0.55, 4)
        score += hist_w
        factors.append(
            {
                "code": "history",
                "weight": hist_w,
                "label": f"Historique patient ({past_noshow}/{past_total} absences)",
            }
        )

        base_w = round(facility_rate * 0.15, 4)
        score += base_w
        factors.append(
            {
                "code": "facility_baseline",
                "weight": base_w,
                "label": f"Taux établissement ({round(facility_rate * 100)}%)",
            }
        )

        if not has_reminder:
            rem_w = 0.15
            score += rem_w
            factors.append(
                {
                    "code": "no_reminder",
                    "weight": rem_w,
                    "label": "Aucun rappel envoyé",
                }
            )
        else:
            factors.append(
                {
                    "code": "reminder_sent",
                    "weight": -0.05,
                    "label": f"{reminder_count} rappel(s) déjà envoyé(s)",
                }
            )
            score -= 0.05

        if is_scheduled:
            st_w = 0.08
            score += st_w
            factors.append(
                {
                    "code": "unconfirmed",
                    "weight": st_w,
                    "label": "Statut encore planifié (non confirmé)",
                }
            )

        if days_until <= 1:
            prox_w = 0.06
            score += prox_w
            factors.append(
                {
                    "code": "imminent",
                    "weight": prox_w,
                    "label": "Rendez-vous imminent (≤ 24–48 h)",
                }
            )
        elif days_until >= 14:
            far_w = 0.04
            score += far_w
            factors.append(
                {
                    "code": "far",
                    "weight": far_w,
                    "label": "Rendez-vous lointain (≥ 14 j)",
                }
            )

        weekday = appt_date.weekday()
        if weekday in {0, 4}:  # lundi / vendredi
            wd_w = 0.03
            score += wd_w
            factors.append(
                {
                    "code": "weekday",
                    "weight": wd_w,
                    "label": "Jour à risque (lundi ou vendredi)",
                }
            )

        dt = _parse_dt(row["date"])
        if dt is not None and (dt.hour < 9 or dt.hour >= 17):
            hour_w = 0.03
            score += hour_w
            factors.append(
                {
                    "code": "hour",
                    "weight": hour_w,
                    "label": "Créneau tôt / tard",
                }
            )

        score = round(_clamp(score), 3)
        level = _risk_level(score)
        suggested = "remind" if not has_reminder else "confirm_or_call"

        return {
            "appointmentId": row["id"],
            "patientId": pid,
            "patientName": row["patient_name"],
            "doctorId": row["doctor_id"],
            "doctorName": row["doctor_name"],
            "date": row["date"],
            "status": row["status"],
            "reason": row.get("reason") or "",
            "riskScore": score,
            "riskLevel": level,
            "factors": factors,
            "suggestedAction": suggested,
            "reminderSent": has_reminder,
            "reminderCount": reminder_count,
            "patientNoshowRate": round(patient_rate, 3),
            "patientPastAppointments": past_total,
            "daysUntil": days_until,
        }
