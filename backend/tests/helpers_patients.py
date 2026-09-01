"""Helpers partagés — patients de seed ou création à la demande."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi.testclient import TestClient


def unique_future_iso() -> str:
    seed = int(uuid4().hex[:8], 16)
    return datetime(
        2090 + (seed % 15),
        1 + (seed % 12),
        1 + (seed % 27),
        8 + (seed % 10),
        seed % 60,
        tzinfo=timezone.utc,
    ).isoformat()


def auth_headers(client: TestClient, email: str = "admin@sihia.health", password: str = "admin123") -> dict[str, str]:
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def ensure_patient_id(client: TestClient, headers: dict[str, str]) -> str:
    listed = client.get("/api/patients", headers=headers)
    assert listed.status_code == 200, listed.text
    patients = listed.json()
    if patients:
        return patients[0]["id"]

    created = client.post(
        "/api/patients",
        headers=headers,
        json={
            "firstName": "Test",
            "lastName": "Patient",
            "dob": "1990-01-15",
            "gender": "M",
            "phone": "+212600000000",
            "email": "test.patient@sihia.health",
            "address": "Casablanca",
            "bloodType": "O+",
            "allergies": [],
        },
    )
    assert created.status_code == 200
    return created.json()["id"]


def appointment_payload(
    client: TestClient,
    headers: dict[str, str],
    *,
    patient_id: str | None = None,
    doctor_id: str = "d-1",
    **overrides: object,
) -> dict:
    payload = {
        "patientId": patient_id or ensure_patient_id(client, headers),
        "doctorId": doctor_id,
        "date": unique_future_iso(),
        "durationMin": 30,
        "reason": "Test",
        "status": "scheduled",
    }
    payload.update(overrides)
    return payload
