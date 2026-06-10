"""Prévisions d'affluence (RDV/jour) à partir de l'historique en base."""

from __future__ import annotations

from datetime import date, timedelta

from app.application.analytics_service import AnalyticsService, _parse_appt_date, _utc_now
from app.application.ml_engine import ml_data_source, prophet_enabled


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
) -> tuple[list[int], float] | None:
    try:
        import pandas as pd
        from prophet import Prophet
    except ImportError:
        return None

    if len(daily) < 7:
        return None

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
    values = [max(0, round(v)) for v in tail]
    confidence = 0.9 if len(daily) >= 14 else 0.82
    return values, confidence


class MlForecastService:
    def __init__(self, analytics: AnalyticsService | None = None) -> None:
        self._analytics = analytics or AnalyticsService()

    def _daily_counts(self, lookback_days: int = 60) -> list[tuple[date, int]]:
        today = _utc_now().date()
        start = today - timedelta(days=lookback_days - 1)
        buckets: dict[date, int] = {start + timedelta(days=i): 0 for i in range(lookback_days)}

        for row in self._analytics._active_appointments():
            d = _parse_appt_date(row["date"])
            if d is None or d < start or d > today:
                continue
            buckets[d] = buckets.get(d, 0) + 1

        return sorted(buckets.items())

    def _build_response(
        self,
        daily: list[tuple[date, int]],
        horizon: int,
        recommendation: str,
    ) -> dict:
        today = _utc_now().date()
        history = [item for item in daily if item[0] <= today][-min(7, len(daily)) :]

        prophet_result = _try_prophet_forecast(daily, horizon) if prophet_enabled() else None
        if prophet_result:
            forecast_values, confidence = prophet_result
            model_name = "prophet"
        else:
            train = [c for _, c in daily[-21:]] or [0]
            forecast_values = _linear_forecast(train, horizon)
            confidence = 0.78 if len(daily) >= 14 else 0.65
            model_name = "linear-sqlite"

        points: list[dict] = []
        for d, count in history:
            points.append({"date": d.isoformat(), "actual": count})

        start_forecast = today + timedelta(days=1)
        peak_date = start_forecast.isoformat()
        peak_value = 0
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
            if value >= peak_value:
                peak_value = value
                peak_date = d.isoformat()

        return {
            "points": points,
            "model": model_name,
            "confidence": round(confidence, 2),
            "peak": {"date": peak_date, "value": peak_value},
            "recommendation": recommendation,
            "source": ml_data_source(),
            "historyDays": len(daily),
            "engine": "prophet" if model_name == "prophet" else "linear",
        }

    def predict_7d(self) -> dict:
        daily = self._daily_counts(lookback_days=45)
        return self._build_response(
            daily,
            horizon=7,
            recommendation="Renforcer l'effectif sur les jours de pic prévus (données RDV réelles).",
        )

    def predict_30d(self) -> dict:
        daily = self._daily_counts(lookback_days=60)
        body = self._build_response(
            daily,
            horizon=30,
            recommendation="Prévoir un renforcement progressif des effectifs sur les semaines à forte affluence.",
        )
        body["drift_score"] = round(min(0.15, len(daily) / 200), 2)
        return body
