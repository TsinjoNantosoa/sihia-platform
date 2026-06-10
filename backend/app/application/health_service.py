"""État réel des composants pour /health/details."""

from __future__ import annotations

import time
from datetime import datetime, timezone

from sqlalchemy import text

from app.application.ml_engine import ml_engine_status
from app.application.pipeline_service import PipelineService
from app.core.config import settings
from app.infrastructure.database import get_engine, is_postgresql, sqlalchemy_url


def database_kind() -> str:
    if is_postgresql():
        return "postgresql"
    return "sqlite"


def check_database() -> dict:
    started = time.perf_counter()
    kind = database_kind()
    try:
        with get_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
        latency_ms = round((time.perf_counter() - started) * 1000, 1)
        return {
            "status": "ok",
            "type": kind,
            "latency_ms": latency_ms,
        }
    except Exception as exc:  # noqa: BLE001 — health probe
        return {
            "status": "error",
            "type": kind,
            "message": str(exc),
        }


def pipeline_status() -> dict:
    try:
        summary = PipelineService().status()
        return {
            "status": "ok",
            "freshness": summary.get("status", "ok"),
            "mlFeaturesDays": summary.get("mlFeaturesDays", 0),
            "alerts": summary.get("alerts", []),
        }
    except Exception as exc:  # noqa: BLE001 — health probe
        return {"status": "error", "message": str(exc)}


def build_health_details() -> dict:
    db = check_database()
    pipeline = pipeline_status()
    overall = "ok" if db.get("status") == "ok" else "degraded"

    return {
        "status": overall,
        "version": "0.1.0",
        "environment": settings.environment,
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        "components": {
            "api": {"status": "ok"},
            "database": db,
            "ml_engine": ml_engine_status(),
            "pipeline": pipeline,
            "auth": {"status": "ok", "algorithm": settings.jwt_algorithm},
        },
        "config": {
            "database_url_scheme": sqlalchemy_url().split("://", 1)[0],
        },
    }
