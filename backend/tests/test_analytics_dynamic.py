from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _admin_headers() -> dict[str, str]:
    res = client.post("/api/auth/login", json={"email": "admin@sihia.health", "password": "admin123"})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_kpis_include_freshness_metadata() -> None:
    res = client.get("/api/analytics/kpis", headers=_admin_headers())
    assert res.status_code == 200
    data = res.json()
    assert "updatedAt" in data
    assert data.get("source") == "sqlite"
    assert isinstance(data["patientsToday"], int)
    assert isinstance(data["occupancy"], (int, float))


def test_rbac_users_from_database() -> None:
    res = client.get("/api/rbac/users", headers=_admin_headers())
    assert res.status_code == 200
    users = res.json()
    emails = {u["email"] for u in users}
    assert "admin@sihia.health" in emails
    assert "staff@sihia.health" in emails


def test_alerts_is_non_empty_list() -> None:
    res = client.get("/api/alerts", headers=_admin_headers())
    assert res.status_code == 200
    alerts = res.json()
    assert len(alerts) >= 1
    assert "level" in alerts[0]
