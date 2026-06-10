from datetime import date, timedelta

from app.application import ml_engine, ml_service
from app.core.config import settings


def test_ml_data_source_sqlite() -> None:
    assert ml_engine.ml_data_source() == "sqlite"


def test_prophet_disabled_falls_back_to_linear(monkeypatch) -> None:
    monkeypatch.setattr(settings, "ml_use_prophet", False)
    monkeypatch.setattr(ml_engine, "is_prophet_installed", lambda: True)

    daily = [(date(2026, 1, 1) + timedelta(days=i), i % 5) for i in range(14)]
    result = ml_service._try_prophet_forecast(daily, horizon=7)

    assert result is None


def test_prophet_forecast_returns_values_when_available(monkeypatch) -> None:
    class FakeProphet:
        def __init__(self, **kwargs):
            self.kwargs = kwargs

        def fit(self, _frame):
            return self

        def make_future_dataframe(self, periods: int):
            import pandas as pd

            return pd.DataFrame({"ds": [f"2026-01-{i:02d}" for i in range(1, periods + 1)]})

        def predict(self, future):
            import pandas as pd

            return pd.DataFrame({"yhat": [10 + i for i in range(len(future))]})

    import sys
    import types

    monkeypatch.setattr(settings, "ml_use_prophet", True)
    fake_prophet = types.ModuleType("prophet")
    fake_prophet.Prophet = FakeProphet
    monkeypatch.setitem(sys.modules, "prophet", fake_prophet)

    daily = [(date(2026, 1, 1) + timedelta(days=i), 3 + (i % 4)) for i in range(14)]
    values, confidence = ml_service._try_prophet_forecast(daily, horizon=7)

    assert len(values) == 7
    assert all(v >= 0 for v in values)
    assert confidence >= 0.8
