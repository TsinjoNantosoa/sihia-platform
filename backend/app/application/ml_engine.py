"""Détection Prophet et source de données ML."""

from __future__ import annotations

from app.core.config import settings
from app.infrastructure.database import is_postgresql


def is_prophet_installed() -> bool:
    try:
        import prophet  # noqa: F401

        return True
    except ImportError:
        return False


def prophet_enabled() -> bool:
    return settings.ml_use_prophet and is_prophet_installed()


def ml_data_source() -> str:
    return "postgresql" if is_postgresql() else "sqlite"


def ml_engine_status() -> dict[str, str]:
    if prophet_enabled():
        return {
            "status": "ok",
            "model": "prophet",
            "fallback": "linear-regression",
            "installed": "true",
        }
    if is_prophet_installed():
        return {
            "status": "ok",
            "model": "linear-regression",
            "fallback": "linear-regression",
            "installed": "true",
            "note": "prophet disabled via ML_USE_PROPHET",
        }
    return {
        "status": "ok",
        "model": "linear-regression",
        "fallback": "linear-regression",
        "installed": "false",
    }
