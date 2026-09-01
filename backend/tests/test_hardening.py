"""Tests ciblés — backend hardening."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app

client = TestClient(app)


def _token(email: str = "admin@sihia.health", password: str = "admin123") -> str:
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]


def test_patient_history_get_does_not_seed_data() -> None:
    headers = {"Authorization": f"Bearer {_token()}"}
    created = client.post(
        "/api/patients",
        headers=headers,
        json={
            "firstName": "Harden",
            "lastName": "Test",
            "dob": "1990-01-01",
            "gender": "M",
            "phone": "+212600999888",
            "address": "1 rue Test",
            "bloodType": "O+",
            "allergies": [],
        },
    )
    assert created.status_code in (200, 201)
    patient_id = created.json()["id"]

    history1 = client.get(f"/api/patients/{patient_id}/history", headers=headers)
    assert history1.status_code == 200
    assert history1.json() == []

    history2 = client.get(f"/api/patients/{patient_id}/history", headers=headers)
    assert history2.status_code == 200
    assert history2.json() == []


def test_suspended_user_cannot_refresh() -> None:
    admin = _token()
    headers = {"Authorization": f"Bearer {admin}"}

    created = client.post(
        "/api/rbac/users",
        headers=headers,
        json={
            "name": "Refresh Block",
            "email": "refresh.block@sihia.health",
            "password": "refreshblk1",
            "role": "staff",
        },
    )
    assert created.status_code in (200, 201)
    user_id = created.json()["id"]

    login = client.post(
        "/api/auth/login",
        json={"email": "refresh.block@sihia.health", "password": "refreshblk1"},
    )
    assert login.status_code == 200
    refresh_token = login.json()["refresh_token"]

    suspend = client.patch(
        f"/api/rbac/users/{user_id}",
        headers=headers,
        json={"status": "suspended"},
    )
    assert suspend.status_code == 200

    refresh = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert refresh.status_code in (401, 403)

    client.delete(f"/api/rbac/users/{user_id}", headers=headers)


def test_new_patient_last_visit_null() -> None:
    headers = {"Authorization": f"Bearer {_token()}"}
    created = client.post(
        "/api/patients",
        headers=headers,
        json={
            "firstName": "NoVisit",
            "lastName": "Yet",
            "dob": "1985-06-15",
            "gender": "F",
            "phone": "+212600111999",
            "address": "2 rue Test",
            "bloodType": "A+",
            "allergies": [],
        },
    )
    assert created.status_code in (200, 201)
    assert created.json()["lastVisit"] is None


def test_appointment_rejects_invalid_patient_id() -> None:
    headers = {"Authorization": f"Bearer {_token()}"}
    res = client.post(
        "/api/appointments",
        headers=headers,
        json={
            "patientId": "p-does-not-exist",
            "patientName": "Fake",
            "doctorId": "d-1",
            "doctorName": "Dr Fake",
            "date": "2030-06-01T10:00:00Z",
            "durationMin": 30,
            "reason": "Test",
            "status": "completed",
        },
    )
    assert res.status_code == 404


def test_appointment_forces_scheduled_status() -> None:
    headers = {"Authorization": f"Bearer {_token()}"}
    patients = client.get("/api/patients", headers=headers)
    patient = patients.json()[0]
    res = client.post(
        "/api/appointments",
        headers=headers,
        json={
            "patientId": patient["id"],
            "patientName": "Ignored",
            "doctorId": "d-1",
            "doctorName": "Ignored",
            "date": "2030-07-01T11:00:00Z",
            "durationMin": 30,
            "reason": "Status test",
            "status": "completed",
        },
    )
    assert res.status_code == 200
    assert res.json()["status"] == "scheduled"


def test_ml_insufficient_data_returns_null_confidence(monkeypatch) -> None:
    """Sans RDV historiques, la confiance ne doit pas être artificielle."""
    from app.application import ml_service as ml_mod

    def _empty_daily(self, lookback_days: int = 60):
        from datetime import date, timedelta
        from app.application.analytics_service import _utc_now

        today = _utc_now().date()
        start = today - timedelta(days=lookback_days - 1)
        return [(start + timedelta(days=i), 0) for i in range(lookback_days)]

    monkeypatch.setattr(ml_mod.MlForecastService, "_daily_counts", _empty_daily)
    headers = {"Authorization": f"Bearer {_token()}"}
    res = client.get("/api/ml/predict-7d", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body.get("status") == "insufficient_data"
    assert body.get("confidence") is None
    assert body.get("peak") is None


def test_seed_demo_data_disabled_by_default() -> None:
    assert settings.seed_demo_data is False or settings.environment != "production"
