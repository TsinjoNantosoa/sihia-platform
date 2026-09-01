"""Prévisions d'affluence (RDV/jour) à partir de l'historique en base."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from app.application.analytics_service import AnalyticsService, _parse_appt_date, _utc_now
from app.application.ml_engine import ml_data_source, prophet_enabled
from app.infrastructure.database import connect

MIN_OBSERVED_DAYS = 7
MIN_NON_ZERO_DAYS = 3


def _linear_forecast(values: list[int], horizon: int) -> list[int]:
    n = len(values)
    if n == 0:
        return [0] * horizon
    if n == 1:
        return [values[0]] * horizon

    xs = list(range(n))
    mean_x = sum(xs) / n
    mean_y = sum(values) / n
    num = sum((xs[i] - mean_x) * (values[i] - mean_y) for i in range(n))
    den = sum((x - mean_x) ** 2 for x in xs) or 1.0
    slope = num / den
    intercept = mean_y - slope * mean_x

    out: list[int] = []
    for h in range(1, horizon + 1):
        x = (n - 1) + h
        out.append(max(0, round(intercept + slope * x)))
    return out


def _try_prophet_forecast(
    daily: list[tuple[date, int]],
    horizon: int,
) -> list[int] | None:
    if not prophet_enabled():
        return None
    try:
        import pandas as pd
        from prophet import Prophet
    except ImportError:
        return None

    if len(daily) < MIN_OBSERVED_DAYS:
        return None

    try:
        frame = pd.DataFrame({"ds": [d.isoformat() for d, _ in daily], "y": [c for _, c in daily]})
        model = Prophet(
            daily_seasonality=False,
            weekly_seasonality=True,
            yearly_seasonality=False,
        )
        model.fit(frame)
        future = model.make_future_dataframe(periods=horizon)
        forecast = model.predict(future)
        tail = forecast.tail(horizon)["yhat"].tolist()
        return [max(0, round(v)) for v in tail]
    except Exception:
        return None


def _mae(actual: list[int], predicted: list[int]) -> float | None:
    if not actual or len(actual) != len(predicted):
        return None
    return sum(abs(a - p) for a, p in zip(actual, predicted, strict=False)) / len(actual)


def _mape(actual: list[int], predicted: list[int]) -> float | None:
    pairs = [(a, p) for a, p in zip(actual, predicted, strict=False) if a > 0]
    if not pairs:
        return None
    return sum(abs(a - p) / a for a, p in pairs) / len(pairs) * 100.0


def _series_stats(daily: list[tuple[date, int]]) -> dict[str, int]:
    calendar_days = len(daily)
    non_zero_days = sum(1 for _, count in daily if count > 0)
    sample_count = sum(count for _, count in daily)
    appointment_count = sample_count
    return {
        "calendar_days": calendar_days,
        "observed_days": non_zero_days,
        "non_zero_days": non_zero_days,
        "sample_count": sample_count,
        "appointment_count": appointment_count,
    }


def _has_sufficient_forecast_data(stats: dict[str, int]) -> bool:
    return (
        stats["calendar_days"] >= MIN_OBSERVED_DAYS
        and stats["non_zero_days"] >= MIN_NON_ZERO_DAYS
        and stats["sample_count"] > 0
    )


def _confidence_from_stats(stats: dict[str, int], model_name: str) -> float | None:
    if not _has_sufficient_forecast_data(stats):
        return None
    nz = stats["non_zero_days"]
    if model_name == "prophet":
        if nz >= 14:
            return 0.90
        if nz >= MIN_NON_ZERO_DAYS:
            return 0.82
        return None
    # linear fallback
    if nz >= 14:
        return 0.78
    if nz >= MIN_NON_ZERO_DAYS:
        return 0.65
    return None


def _forecast_from_daily(
    daily: list[tuple[date, int]],
    horizon: int,
) -> tuple[list[int], str, float | None]:
    stats = _series_stats(daily)
    if not _has_sufficient_forecast_data(stats):
        return [], "unavailable", None

    forecast_values = _try_prophet_forecast(daily, horizon) if prophet_enabled() else None
    if forecast_values:
        confidence = _confidence_from_stats(stats, "prophet")
        return forecast_values, "prophet", confidence

    train = [c for _, c in daily[-21:]] or [0]
    forecast_values = _linear_forecast(train, horizon)
    confidence = _confidence_from_stats(stats, "linear-sqlite")
    return forecast_values, "linear-sqlite", confidence


def _insufficient_response(
    daily: list[tuple[date, int]],
    horizon: int,
    recommendation: str,
) -> dict[str, Any]:
    today = _utc_now().date()
    history = [item for item in daily if item[0] <= today][-min(7, len(daily)) :]
    points: list[dict] = [{"date": d.isoformat(), "actual": count} for d, count in history]
    stats = _series_stats(daily)
    now = _utc_now()
    return {
        "points": points,
        "model": "unavailable",
        "model_version": "unavailable",
        "confidence": None,
        "peak": None,
        "recommendation": recommendation,
        "source": ml_data_source(),
        "historyDays": stats["calendar_days"],
        "engine": "unavailable",
        "horizon": horizon,
        "generatedAt": now.isoformat(),
        "status": "insufficient_data",
        "stats": stats,
    }


class MlForecastService:
    def __init__(self, analytics: AnalyticsService | None = None) -> None:
        self._analytics = analytics or AnalyticsService()

    def _daily_counts_from_ml_features(self, lookback_days: int) -> list[tuple[date, int]] | None:
        """Utilise ml_features_daily (remplie par le DAG pipeline) si suffisamment peuplée."""
        today = _utc_now().date()
        start = today - timedelta(days=lookback_days - 1)
        conn = connect()
        try:
            rows = conn.execute(
                """
                SELECT day, appointment_count FROM ml_features_daily
                WHERE day >= ? AND day <= ?
                ORDER BY day
                """,
                (start.isoformat(), today.isoformat()),
            ).fetchall()
        except Exception:
            return None
        finally:
            conn.close()

        if len(rows) < MIN_OBSERVED_DAYS:
            return None

        by_day: dict[date, int] = {}
        for row in rows:
            try:
                day = date.fromisoformat(str(row["day"])[:10])
                by_day[day] = int(row["appointment_count"])
            except (ValueError, TypeError):
                continue

        if len(by_day) < MIN_OBSERVED_DAYS:
            return None

        return [
            (start + timedelta(days=i), by_day.get(start + timedelta(days=i), 0))
            for i in range(lookback_days)
        ]

    def _daily_counts_from_appointments(self, lookback_days: int) -> list[tuple[date, int]]:
        today = _utc_now().date()
        start = today - timedelta(days=lookback_days - 1)
        buckets: dict[date, int] = {start + timedelta(days=i): 0 for i in range(lookback_days)}

        for row in self._analytics._active_appointments():
            d = _parse_appt_date(row["date"])
            if d is None or d < start or d > today:
                continue
            buckets[d] = buckets.get(d, 0) + 1

        return sorted(buckets.items())

    def _daily_counts(self, lookback_days: int = 60) -> list[tuple[date, int]]:
        features = self._daily_counts_from_ml_features(lookback_days)
        if features is not None:
            return features
        return self._daily_counts_from_appointments(lookback_days)

    def _build_response(
        self,
        daily: list[tuple[date, int]],
        horizon: int,
        recommendation: str,
    ) -> dict[str, Any]:
        stats = _series_stats(daily)
        if not _has_sufficient_forecast_data(stats):
            return _insufficient_response(daily, horizon, recommendation)

        today = _utc_now().date()
        history = [item for item in daily if item[0] <= today][-min(7, len(daily)) :]

        forecast_values, model_name, confidence = _forecast_from_daily(daily, horizon)
        if not forecast_values or confidence is None:
            return _insufficient_response(daily, horizon, recommendation)

        points: list[dict] = []
        for d, count in history:
            points.append({"date": d.isoformat(), "actual": count})

        start_forecast = today + timedelta(days=1)
        peak_date: str | None = None
        peak_value: int | None = None
        for i, value in enumerate(forecast_values):
            d = start_forecast + timedelta(days=i)
            margin = max(3, round(value * 0.08))
            points.append(
                {
                    "date": d.isoformat(),
                    "forecast": value,
                    "upper": value + margin,
                    "lower": max(0, value - margin),
                },
            )
            if peak_value is None or value > peak_value:
                peak_value = value
                peak_date = d.isoformat()

        now = _utc_now()

        return {
            "points": points,
            "model": model_name,
            "model_version": f"{model_name}-1.0",
            "confidence": round(confidence, 2),
            "peak": {"date": peak_date, "value": peak_value} if peak_date and peak_value is not None else None,
            "recommendation": recommendation,
            "source": ml_data_source(),
            "historyDays": stats["calendar_days"],
            "engine": "prophet" if model_name == "prophet" else "linear",
            "horizon": horizon,
            "generatedAt": now.isoformat(),
            "status": "ok",
            "stats": stats,
        }

    def predict_7d(self) -> dict[str, Any]:
        daily = self._daily_counts(lookback_days=45)
        return self._build_response(
            daily,
            horizon=7,
            recommendation="Renforcer l'effectif sur les jours de pic prévus (données RDV réelles).",
        )

    def predict_30d(self) -> dict[str, Any]:
        daily = self._daily_counts(lookback_days=60)
        body = self._build_response(
            daily,
            horizon=30,
            recommendation="Prévoir un renforcement progressif des effectifs sur les semaines à forte affluence.",
        )
        if body.get("status") == "ok":
            stats = body.get("stats") or {}
            body["drift_score"] = round(min(0.15, stats.get("non_zero_days", 0) / 200), 2)
        return body

    def metrics(self, holdout_days: int = 7) -> dict[str, Any]:
        lookback_days = 60
        daily = self._daily_counts(lookback_days=lookback_days)
        now = _utc_now()
        stats = _series_stats(daily)
        min_train_days = 14

        insufficient = {
            "model": "unavailable",
            "model_version": "unavailable",
            "engine": "unavailable",
            "mae": None,
            "mape": None,
            "holdoutDays": holdout_days,
            "samples": 0,
            "historyDays": stats["calendar_days"],
            "source": ml_data_source(),
            "generatedAt": now.isoformat(),
            "status": "insufficient_data",
            "targetMapePercent": 15,
            "withinTarget": None,
            "stats": stats,
        }

        if not _has_sufficient_forecast_data(stats) or len(daily) < holdout_days + min_train_days:
            return insufficient

        train = daily[:-holdout_days]
        test = daily[-holdout_days:]
        actuals = [count for _, count in test]
        forecast_values, model_name, _ = _forecast_from_daily(train, holdout_days)

        if not forecast_values:
            return insufficient

        mae = _mae(actuals, forecast_values)
        mape = _mape(actuals, forecast_values)

        if mae is None or mape is None:
            return insufficient

        within_target = mape <= 15.0
        engine = "prophet" if model_name == "prophet" else "linear"

        return {
            "model": model_name,
            "model_version": f"{model_name}-1.0",
            "engine": engine,
            "mae": round(mae, 2),
            "mape": round(mape, 2),
            "holdoutDays": holdout_days,
            "samples": len([a for a in actuals if a > 0]),
            "historyDays": stats["calendar_days"],
            "source": ml_data_source(),
            "generatedAt": now.isoformat(),
            "status": "ok" if within_target else "degraded",
            "targetMapePercent": 15,
            "withinTarget": within_target,
            "stats": stats,
        }
