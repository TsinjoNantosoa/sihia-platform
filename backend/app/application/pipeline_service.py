"""Pipelines données SIH IA (import patients, refresh analytics, features ML)."""

from __future__ import annotations

import csv
import json
import re
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from app.application.analytics_service import AnalyticsService, _parse_appt_date, _utc_now
from app.core.config import settings
from app.infrastructure.database import connect
from app.infrastructure.pipeline_repository import PipelineRepository

DAG_IDS = ("patient_import", "analytics_refresh", "ml_features", "sihia_daily")
_EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
_PHONE = re.compile(r"^\+?[0-9]{9,15}$")


def _imports_dir() -> Path:
    raw = settings.pipeline_import_dir.strip()
    path = Path(raw)
    if not path.is_absolute():
        path = Path(__file__).resolve().parents[3] / path
    path.mkdir(parents=True, exist_ok=True)
    return path


class PipelineService:
    def __init__(self, repo: PipelineRepository | None = None, analytics: AnalyticsService | None = None) -> None:
        self.repo = repo or PipelineRepository()
        self.analytics = analytics or AnalyticsService()

    def status(self) -> dict[str, Any]:
        dags: list[dict[str, Any]] = []
        stale_threshold = _utc_now() - timedelta(hours=settings.pipeline_stale_hours)
        alerts: list[str] = []

        for dag_id in DAG_IDS:
            if dag_id == "sihia_daily":
                continue
            latest = self.repo.latest_by_dag(dag_id)
            item: dict[str, Any] = {"dagId": dag_id, "lastRun": None}
            if latest:
                item["lastRun"] = {
                    "id": latest["id"],
                    "status": latest["status"],
                    "startedAt": latest["started_at"],
                    "finishedAt": latest.get("finished_at"),
                    "metrics": latest.get("metrics", {}),
                    "error": latest.get("error"),
                }
                finished = latest.get("finished_at") or latest["started_at"]
                try:
                    finished_dt = datetime.fromisoformat(finished.replace("Z", "+00:00"))
                    if finished_dt.tzinfo is None:
                        finished_dt = finished_dt.replace(tzinfo=timezone.utc)
                    if finished_dt < stale_threshold:
                        alerts.append(f"{dag_id}: donnees non mises a jour > {settings.pipeline_stale_hours}h")
                except ValueError:
                    pass
                metrics = latest.get("metrics") or {}
                error_rate = metrics.get("errorRate")
                if isinstance(error_rate, (int, float)) and error_rate > 0.05:
                    alerts.append(f"{dag_id}: taux erreur import > 5%")
                if latest["status"] == "failed":
                    alerts.append(f"{dag_id}: dernier run en echec")
            else:
                alerts.append(f"{dag_id}: jamais execute")
            dags.append(item)

        kpis_snap = self.repo.latest_snapshot("kpis")
        ml_rows = self.repo.ml_features_count()
        overall = "ok"
        if alerts:
            overall = "degraded" if all(
                d.get("lastRun", {}) and d["lastRun"].get("status") == "success" for d in dags if d.get("lastRun")
            ) else "degraded"

        return {
            "status": overall,
            "dags": dags,
            "snapshots": {"kpis": kpis_snap},
            "mlFeaturesDays": ml_rows,
            "alerts": alerts,
        }

    def run(self, dag_id: str) -> dict[str, Any]:
        if dag_id not in DAG_IDS:
            raise ValueError(f"DAG inconnu: {dag_id}")
        if dag_id == "sihia_daily":
            return self._run_daily()
        return self._run_single(dag_id)

    def _run_daily(self) -> dict[str, Any]:
        results = []
        for step in ("patient_import", "analytics_refresh", "ml_features"):
            results.append(self._run_single(step))
        return {"dagId": "sihia_daily", "steps": results}

    def _run_single(self, dag_id: str) -> dict[str, Any]:
        run_id = self.repo.start_run(dag_id)
        try:
            if dag_id == "patient_import":
                metrics = self._patient_import()
            elif dag_id == "analytics_refresh":
                metrics = self._analytics_refresh()
            elif dag_id == "ml_features":
                metrics = self._ml_features()
            else:
                raise ValueError(f"DAG inconnu: {dag_id}")
            self.repo.finish_run(run_id, status="success", metrics=metrics)
            return {"dagId": dag_id, "runId": run_id, "status": "success", "metrics": metrics}
        except Exception as exc:  # noqa: BLE001 — pipeline job boundary
            self.repo.finish_run(run_id, status="failed", metrics={}, error=str(exc))
            raise

    def _patient_import(self) -> dict[str, Any]:
        imports = _imports_dir()
        files = sorted(imports.glob("*.csv"))
        if not files:
            return {
                "filesProcessed": 0,
                "rowsRead": 0,
                "rowsLoaded": 0,
                "rowsSkipped": 0,
                "errorRate": 0.0,
                "message": f"Aucun CSV dans {imports}",
            }

        rows_read = 0
        rows_loaded = 0
        rows_skipped = 0
        errors: list[str] = []

        for path in files:
            loaded, skipped, read_count, file_errors = self._import_patients_csv(path)
            rows_read += read_count
            rows_loaded += loaded
            rows_skipped += skipped
            errors.extend(file_errors)

        error_rate = round(len(errors) / rows_read, 4) if rows_read else 0.0
        return {
            "filesProcessed": len(files),
            "rowsRead": rows_read,
            "rowsLoaded": rows_loaded,
            "rowsSkipped": rows_skipped,
            "errorRate": error_rate,
            "errors": errors[:20],
            "importDir": str(imports),
        }

    def _import_patients_csv(self, path: Path) -> tuple[int, int, int, list[str]]:
        loaded = 0
        skipped = 0
        errors: list[str] = []
        rows_read = 0

        with path.open(encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            for index, row in enumerate(reader, start=2):
                rows_read += 1
                ok, reason = self._validate_patient_row(row)
                if not ok:
                    skipped += 1
                    errors.append(f"{path.name}:{index} {reason}")
                    continue
                if self._upsert_patient(row):
                    loaded += 1
                else:
                    skipped += 1
                    errors.append(f"{path.name}:{index} upsert echoue")

        return loaded, skipped, rows_read, errors

    def _validate_patient_row(self, row: dict[str, str]) -> tuple[bool, str]:
        required = ["record_number", "first_name", "last_name", "dob", "gender", "phone", "address", "blood_type"]
        for field in required:
            if not (row.get(field) or "").strip():
                return False, f"champ requis manquant: {field}"
        gender = row["gender"].strip().upper()
        if gender not in {"M", "F"}:
            return False, "gender invalide"
        if not _PHONE.match(re.sub(r"[\s\-()]", "", row["phone"].strip())):
            return False, "telephone invalide"
        email = (row.get("email") or "").strip()
        if email and not _EMAIL.match(email):
            return False, "email invalide"
        try:
            date.fromisoformat(row["dob"].strip()[:10])
        except ValueError:
            return False, "dob invalide"
        return True, ""

    def _upsert_patient(self, row: dict[str, str]) -> bool:
        record_number = row["record_number"].strip()
        conn = connect()
        existing = conn.execute(
            "SELECT id FROM patients WHERE record_number=?",
            (record_number,),
        ).fetchone()
        allergies_raw = (row.get("allergies") or "").strip()
        allergies = json.dumps([a.strip() for a in allergies_raw.split("|") if a.strip()])
        status = (row.get("status") or "active").strip() or "active"
        values = (
            row["first_name"].strip(),
            row["last_name"].strip(),
            row["dob"].strip()[:10],
            row["gender"].strip().upper(),
            row["phone"].strip(),
            (row.get("email") or "").strip() or None,
            row["address"].strip(),
            row["blood_type"].strip(),
            allergies,
            (row.get("insurance") or "").strip() or None,
            status,
        )
        if existing:
            conn.execute(
                """
                UPDATE patients SET
                    first_name=?, last_name=?, dob=?, gender=?, phone=?, email=?,
                    address=?, blood_type=?, allergies=?, insurance=?, status=?
                WHERE record_number=?
                """,
                (*values, record_number),
            )
        else:
            patient_id = f"p-{uuid4().hex[:8]}"
            conn.execute(
                """
                INSERT INTO patients (
                    id, record_number, first_name, last_name, dob, gender, phone, email,
                    address, blood_type, allergies, insurance, status, last_visit
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,NULL)
                """,
                (patient_id, record_number, *values),
            )
        conn.commit()
        conn.close()
        return True

    def _analytics_refresh(self) -> dict[str, Any]:
        keys = {
            "kpis": self.analytics.kpis(),
            "revenue_6m": self.analytics.monthly_revenue("6m"),
            "admissions_dept": self.analytics.admissions_by_dept(),
            "satisfaction": self.analytics.satisfaction(),
            "alerts": self.analytics.alerts(),
        }
        for key, payload in keys.items():
            self.repo.save_snapshot(key, payload)
        return {"snapshotsWritten": len(keys), "keys": list(keys.keys())}

    def _ml_features(self) -> dict[str, Any]:
        conn = connect()
        rows = conn.execute(
            "SELECT date FROM appointments WHERE status != 'cancelled'",
        ).fetchall()
        conn.close()

        counts: dict[str, int] = defaultdict(int)
        for row in rows:
            d = _parse_appt_date(row["date"])
            if d is None:
                continue
            counts[d.isoformat()] += 1

        cutoff = (_utc_now().date() - timedelta(days=90)).isoformat()
        now_iso = _utc_now().isoformat()
        written = 0
        for day, count in counts.items():
            if day >= cutoff:
                self.repo.upsert_ml_feature(day, count, now_iso)
                written += 1

        return {"daysWritten": written, "totalDays": len(counts)}
