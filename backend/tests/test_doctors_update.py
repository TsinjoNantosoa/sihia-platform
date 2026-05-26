from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

WEEK = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
DEFAULT_SCHEDULE = [{"day": d, "slots": ["09:00", "11:00"] if d in ("Lun", "Mer", "Ven") else []} for d in WEEK]


def _token(email: str, password: str) -> str:
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]


def test_manager_can_update_doctor_availability_and_schedule() -> None:
    headers = {"Authorization": f"Bearer {_token('manager@sihia.health', 'manager123')}"}

    updated = client.patch(
        "/api/doctors/d-1",
        headers=headers,
        json={"availability": "busy", "schedule": DEFAULT_SCHEDULE},
    )
    assert updated.status_code == 200
    body = updated.json()
    assert body["availability"] == "busy"
    assert body["weeklyAppointments"] == 6

    fetched = client.get("/api/doctors/d-1", headers=headers)
    assert fetched.json()["availability"] == "busy"

    client.patch(
        "/api/doctors/d-1",
        headers=headers,
        json={"availability": "available"},
    )


def test_doctor_role_cannot_update_doctors() -> None:
    headers = {"Authorization": f"Bearer {_token('dr.benali@sihia.health', 'demo1234')}"}
    denied = client.patch(
        "/api/doctors/d-1",
        headers=headers,
        json={"availability": "off"},
    )
    assert denied.status_code == 403
    assert denied.json()["code"] == "FORBIDDEN"


def test_admin_token_includes_doctors_update_permission() -> None:
    import base64
    import json

    token = _token("admin@sihia.health", "admin123")
    payload_b64 = token.split(".")[1]
    padding = "=" * (-len(payload_b64) % 4)
    claims = json.loads(base64.urlsafe_b64decode(payload_b64 + padding))
    assert "doctors:update" in claims["permissions"]
