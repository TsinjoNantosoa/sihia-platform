from fastapi.testclient import TestClient

from app.core.metrics import metrics
from app.main import app

client = TestClient(app)


def test_health_ok():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_health_details_reports_sqlite_and_metrics():
    res = client.get("/health/details")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] in {"ok", "degraded"}
    assert body["components"]["database"]["type"] == "sqlite"
    assert body["components"]["database"]["status"] == "ok"
    assert body["components"]["ml_engine"]["model"] in {"prophet", "linear-regression"}
    assert body["components"]["auth"]["algorithm"] == "HS256"
    assert "metrics" in body
    assert "http_requests" in body["metrics"]


def test_reminders_status_endpoint() -> None:
    login = client.post("/api/auth/login", json={"email": "admin@sihia.health", "password": "admin123"})
    token = login.json()["access_token"]
    res = client.get(
        "/api/admin/reminders/status",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["email"]["mode"] in {"log", "smtp"}
    assert "ready" in body["email"]
    assert body["hoursBefore"] >= 1


def test_health_details_includes_reminders() -> None:
    res = client.get("/health/details")
    assert res.status_code == 200
    reminders = res.json()["components"]["reminders"]
    assert reminders["email"]["mode"] in {"log", "smtp"}
    assert reminders["sms"]["mode"] in {"log", "twilio"}


def test_forbidden_increments_metrics() -> None:
    metrics.reset()

    login = client.post("/api/auth/login", json={"email": "staff@sihia.health", "password": "staff123"})
    assert login.status_code == 200
    token = login.json()["access_token"]
    res = client.get(
        "/api/rbac/users",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403
    assert metrics.snapshot()["auth_forbidden"] == 1
