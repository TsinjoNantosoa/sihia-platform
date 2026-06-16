from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _token(email: str = "admin@sihia.health", password: str = "admin123") -> str:
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]


def test_ml_metrics_returns_mae_mape() -> None:
    headers = {"Authorization": f"Bearer {_token()}"}
    res = client.get("/api/ml/metrics", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["model"] in {"prophet", "linear-sqlite"}
    assert body["model_version"].endswith("-1.0")
    assert body["holdoutDays"] == 7
    assert body["targetMapePercent"] == 15
    assert body["source"] in {"sqlite", "postgresql"}
    assert "generatedAt" in body
    assert body["status"] in {"ok", "degraded", "insufficient_data"}
    if body["status"] != "insufficient_data":
        assert isinstance(body["mae"], (int, float))
        assert isinstance(body["mape"], (int, float))
        assert body["mae"] >= 0
        assert body["mape"] >= 0
        assert body["samples"] == 7
        assert isinstance(body["withinTarget"], bool)


def test_staff_cannot_access_ml_metrics() -> None:
    token = _token("staff@sihia.health", "staff123")
    res = client.get("/api/ml/metrics", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
