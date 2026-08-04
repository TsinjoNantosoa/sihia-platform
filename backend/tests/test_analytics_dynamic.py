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
    assert "action" in alerts[0]
    assert alerts[0]["action"]["href"].startswith("/")
    assert not alerts[0]["action"]["href"].startswith("//")


def test_alerts_include_proactive_fields() -> None:
    """A1 — chaque alerte a une action ; les alertes proactives exposent suggestedActions."""
    from app.application.analytics_service import AnalyticsService

    service = AnalyticsService()
    built = service._build_alerts(90.0, 25, today_count=48, noshow_high=5)
    ids = {a["id"] for a in built}
    assert "al-occupancy" in ids
    assert "al-overload" in ids
    assert "al-noshow" in ids
    noshow = next(a for a in built if a["id"] == "al-noshow")
    assert noshow["action"]["href"] == "/prediction"
    assert isinstance(noshow.get("suggestedActions"), list)
    assert len(noshow["suggestedActions"]) >= 1

    res = client.get("/api/alerts", headers=_admin_headers())
    assert res.status_code == 200
    for alert in res.json():
        assert "id" in alert
        assert alert["action"]["href"].startswith("/")
