"""Tests ml_features_daily consommée par MlForecastService."""

from __future__ import annotations

from datetime import date, timedelta

from app.application.ml_service import MlForecastService
from app.infrastructure.database import connect


def test_daily_counts_prefers_ml_features_daily(monkeypatch) -> None:
    today = date.today()
    start = today - timedelta(days=13)
    conn = connect()
    for i in range(14):
        day = (start + timedelta(days=i)).isoformat()
        conn.execute(
            "INSERT OR REPLACE INTO ml_features_daily (day, appointment_count, updated_at) VALUES (?,?,?)",
            (day, 3 + (i % 3), "2026-01-01T00:00:00Z"),
        )
    conn.commit()
    conn.close()

    service = MlForecastService()
    daily = service._daily_counts(lookback_days=14)
    assert len(daily) == 14
    assert all(count >= 0 for _, count in daily)

    monkeypatch.setattr(service, "_daily_counts_from_appointments", lambda _days: [])
    daily_from_features = service._daily_counts(lookback_days=14)
    assert len(daily_from_features) == 14
