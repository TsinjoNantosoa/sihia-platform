from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _doctor_headers() -> dict[str, str]:
    res = client.post("/api/auth/login", json={"email": "dr.benali@sihia.health", "password": "demo1234"})
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_overlapping_appointments_return_409() -> None:
    headers = _doctor_headers()
    base = {
        "patientId": "p-test",
        "patientName": "Test Patient",
        "doctorId": "d-1",
        "doctorName": "Dr. Diallo",
        "reason": "Consultation",
        "status": "scheduled",
        "durationMin": 60,
    }
    first = client.post(
        "/api/appointments",
        headers=headers,
        json={**base, "date": "2026-12-01T10:00:00"},
    )
    assert first.status_code == 200
    appt_id = first.json()["id"]

    overlap = client.post(
        "/api/appointments",
        headers=headers,
        json={**base, "date": "2026-12-01T10:30:00", "durationMin": 30},
    )
    assert overlap.status_code == 409

    client.post(f"/api/appointments/{appt_id}/cancel", headers=headers)


def test_timezone_aware_appointment_can_coexist_with_naive_seed_dates() -> None:
    headers = _doctor_headers()
    response = client.post(
        "/api/appointments",
        headers=headers,
        json={
            "patientId": "p-timezone-test",
            "patientName": "Timezone Test",
            "doctorId": "d-8",
            "doctorName": "Dr. Ziani",
            "reason": "Validation UTC",
            "status": "scheduled",
            "durationMin": 30,
            "date": "2098-12-20T09:00:00+00:00",
        },
    )
    assert response.status_code == 200
    client.post(f"/api/appointments/{response.json()['id']}/cancel", headers=headers)
