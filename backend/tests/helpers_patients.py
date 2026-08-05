"""Helpers partagés — patients de seed ou création à la demande."""

from __future__ import annotations

from fastapi.testclient import TestClient


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
    assert created.status_code in {200, 201}, created.text
    return created.json()["id"]
