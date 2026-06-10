from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _token() -> str:
    res = client.post("/api/auth/login", json={"email": "admin@sihia.health", "password": "admin123"})
    assert res.status_code == 200
    return res.json()["access_token"]


def test_predict_7d_uses_sqlite_history() -> None:
    headers = {"Authorization": f"Bearer {_token()}"}
    res = client.get("/api/ml/predict-7d", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["source"] == "sqlite"
    assert body["model"] in {"prophet", "linear-sqlite"}
    assert body["engine"] in {"prophet", "linear"}
    assert body["horizon"] == 7
    assert len(body["points"]) >= 7
    assert "peak" in body
    assert any("forecast" in p for p in body["points"])


def test_predict_30d_horizon() -> None:
    headers = {"Authorization": f"Bearer {_token()}"}
    res = client.get("/api/ml/predict-30d", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["horizon"] == 30
    assert body["source"] == "sqlite"
    assert body["engine"] in {"prophet", "linear"}
    forecast_points = [p for p in body["points"] if "forecast" in p]
    assert len(forecast_points) >= 30


def test_staff_cannot_access_ml() -> None:
    login = client.post("/api/auth/login", json={"email": "staff@sihia.health", "password": "staff123"})
    token = login.json()["access_token"]
    res = client.get("/api/ml/predict-7d", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
