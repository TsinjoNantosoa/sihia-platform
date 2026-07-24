"""Agrégations analytics calculées depuis la base (SQLite ou PostgreSQL)."""

from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

from app.infrastructure.database import connect, is_postgresql

DAILY_SLOT_CAPACITY = 48
BED_CAPACITY = 320
AVG_REVENUE_PER_APPOINTMENT = 275


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _meta() -> dict[str, str]:
    source = "postgresql" if is_postgresql() else "sqlite"
    return {"updatedAt": _utc_now().isoformat(), "source": source}


def _parse_appt_date(value: str) -> date | None:
    try:
        normalized = value.replace("Z", "+00:00")
        return datetime.fromisoformat(normalized).date()
    except ValueError:
        if len(value) >= 10:
            return date.fromisoformat(value[:10])
        return None


class AnalyticsService:
    def _active_appointments(self) -> list[dict]:
        conn = connect()
        rows = conn.execute(
            "SELECT * FROM appointments WHERE status != 'cancelled'",
        ).fetchall()
        conn.close()
        return rows

    def kpis(self) -> dict:
        today = _utc_now().date()
        yesterday = today - timedelta(days=1)
        week_start = today - timedelta(days=today.weekday())

        appts = self._active_appointments()
        today_appts = [a for a in appts if _parse_appt_date(a["date"]) == today]
        yesterday_appts = [a for a in appts if _parse_appt_date(a["date"]) == yesterday]
        this_week = [
            a for a in appts
            if (d := _parse_appt_date(a["date"])) is not None and week_start <= d < week_start + timedelta(days=7)
        ]

        patients_today = len({a["patient_id"] for a in today_appts})
        patients_yesterday = len({a["patient_id"] for a in yesterday_appts})
        if patients_yesterday > 0:
            trend = round(((patients_today - patients_yesterday) / patients_yesterday) * 100, 1)
        elif patients_today > 0:
            trend = 100.0
        else:
            trend = 0.0

        scheduled_today = len(today_appts)
        occupancy = min(100.0, round((scheduled_today / DAILY_SLOT_CAPACITY) * 100, 1))

        conn = connect()
        patient_total = conn.execute("SELECT COUNT(*) AS c FROM patients WHERE status='active'").fetchone()["c"]
        pending = conn.execute(
            "SELECT COUNT(*) AS c FROM appointments WHERE status='scheduled'",
        ).fetchone()["c"]
        conn.close()

        critical_count = sum(1 for a in self._build_alerts(occupancy, pending, len(today_appts)) if a["level"] == "critical")

        return {
            "patientsToday": patients_today,
            "patientsTrend": trend,
            "occupancy": occupancy,
            "occupancyCapacity": BED_CAPACITY,
            "appointments": len(this_week),
            "appointmentsCapacity": DAILY_SLOT_CAPACITY * 7,
            "criticalAlerts": critical_count,
            "activePatients": patient_total,
            **_meta(),
        }

    def monthly_revenue(self, period: str = "6m") -> list[dict]:
        n = 3 if period == "3m" else 12 if period == "12m" else 6
        today = _utc_now().date().replace(day=1)
        months: list[date] = []
        cursor = today
        for _ in range(n):
            months.append(cursor)
            cursor = (cursor.replace(day=1) - timedelta(days=1)).replace(day=1)
        months.reverse()

        counts: dict[str, int] = defaultdict(int)
        for appt in self._active_appointments():
            d = _parse_appt_date(appt["date"])
            if d is None:
                continue
            key = d.strftime("%Y-%m")
            counts[key] += 1

        labels_fr = ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Juil", "Aout", "Sep", "Oct", "Nov", "Dec"]
        return [
            {
                "label": labels_fr[m.month - 1],
                "value": counts.get(m.strftime("%Y-%m"), 0) * AVG_REVENUE_PER_APPOINTMENT,
                "appointments": counts.get(m.strftime("%Y-%m"), 0),
            }
            for m in months
        ]

    def admissions_by_dept(self) -> list[dict]:
        conn = connect()
        doctors = {r["id"]: r["specialty"] for r in conn.execute("SELECT id, specialty FROM doctors").fetchall()}
        conn.close()

        dept_counts: dict[str, int] = defaultdict(int)
        for appt in self._active_appointments():
            specialty = doctors.get(appt["doctor_id"], "Autre")
            dept_counts[specialty] += 1

        if not dept_counts:
            return [
                {"label": "Urgences", "value": 0},
                {"label": "Cardio", "value": 0},
                {"label": "Pediatrie", "value": 0},
            ]

        return [{"label": k, "value": v} for k, v in sorted(dept_counts.items(), key=lambda x: -x[1])]

    def satisfaction(self) -> list[dict]:
        conn = connect()
        rows = conn.execute("SELECT satisfaction FROM doctors").fetchall()
        conn.close()
        if not rows:
            return [{"label": "S1", "value": 0}]
        avg = sum(r["satisfaction"] for r in rows) / len(rows)
        base = round(avg * 20, 1)
        return [
            {"label": "S1", "value": max(0, min(100, round(base - 4, 1)))},
            {"label": "S2", "value": max(0, min(100, round(base, 1)))},
            {"label": "S3", "value": max(0, min(100, round(base + 3, 1)))},
        ]

    def _occupancy_rate(self) -> float:
        today = _utc_now().date()
        appts = self._active_appointments()
        today_appts = [a for a in appts if _parse_appt_date(a["date"]) == today]
        scheduled_today = len(today_appts)
        return min(100.0, round((scheduled_today / DAILY_SLOT_CAPACITY) * 100, 1))

    def _build_alerts(self, occupancy: float, pending: int, today_count: int = 0) -> list[dict]:
        now = _utc_now().isoformat()
        alerts: list[dict] = []

        if occupancy >= 85:
            alerts.append(
                {
                    "id": "al-occupancy",
                    "level": "critical",
                    "title": "Tension sur les lits",
                    "description": f"Le taux d'occupation atteint {occupancy}% (seuil 85%).",
                    "area": "Hospitalisation",
                    "createdAt": now,
                }
            )
        elif occupancy >= 70:
            alerts.append(
                {
                    "id": "al-occupancy-warn",
                    "level": "warning",
                    "title": "Occupation élevée",
                    "description": f"Occupation à {occupancy}% — surveillance recommandée.",
                    "area": "Hospitalisation",
                    "createdAt": now,
                }
            )

        if pending > 20:
            alerts.append(
                {
                    "id": "al-backlog",
                    "level": "warning",
                    "title": "File de rendez-vous",
                    "description": f"{pending} rendez-vous planifiés en attente de confirmation.",
                    "area": "Accueil",
                    "createdAt": now,
                }
            )
        elif pending > 0:
            alerts.append(
                {
                    "id": "al-pending",
                    "level": "info",
                    "title": "Rendez-vous à confirmer",
                    "description": f"{pending} rendez-vous encore au statut planifié.",
                    "area": "Accueil",
                    "createdAt": now,
                }
            )

        if today_count > 0:
            alerts.append(
                {
                    "id": "al-today-appts",
                    "level": "info",
                    "title": "Rendez-vous du jour",
                    "description": f"{today_count} rendez-vous prévus aujourd'hui.",
                    "area": "Planning",
                    "createdAt": now,
                }
            )

        if not alerts:
            alerts.append(
                {
                    "id": "al-ok",
                    "level": "info",
                    "title": "Situation stable",
                    "description": "Aucune alerte critique détectée sur les indicateurs actuels.",
                    "area": "Général",
                    "createdAt": now,
                }
            )
        return alerts

    def alerts(self, level_filter: str | None = None) -> list[dict]:
        occupancy = self._occupancy_rate()
        today = _utc_now().date()
        appts = self._active_appointments()
        pending = sum(1 for a in appts if a["status"] == "scheduled")
        today_count = sum(1 for a in appts if _parse_appt_date(a["date"]) == today)
        alerts = self._build_alerts(occupancy, pending, today_count)
        if level_filter:
            return [a for a in alerts if a["level"] == level_filter]
        return alerts

