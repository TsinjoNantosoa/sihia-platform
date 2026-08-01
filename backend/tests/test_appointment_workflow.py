from datetime import datetime, timezone
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _headers(email: str = "dr.benali@sihia.health", password: str = "demo1234") -> dict[str, str]:
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _create_appointment(headers: dict[str, str]) -> str:
    stamp = uuid4().hex[:8]
    response = client.post(
        "/api/appointments",
        headers=headers,
        json={
            "patientId": f"p-workflow-{stamp}",
            "patientName": "Patient Workflow",
            "doctorId": f"d-workflow-{stamp}",
            "doctorName": "Dr. Workflow",
            "date": datetime(2097, 1, 1, 9, 0, tzinfo=timezone.utc).isoformat(),
            "durationMin": 30,
            "reason": "Test workflow",
            "status": "scheduled",
        },
    )
    assert response.status_code == 200
    return response.json()["id"]


def test_complete_appointment_workflow() -> None:
    headers = _headers()
    appointment_id = _create_appointment(headers)

    for target in ("confirmed", "arrived", "completed"):
        response = client.patch(
            f"/api/appointments/{appointment_id}/status",
            headers=headers,
            json={"status": target},
        )
        assert response.status_code == 200
        assert response.json()["status"] == target


def test_terminal_appointment_rejects_invalid_transition() -> None:
    headers = _headers()
    appointment_id = _create_appointment(headers)
    for target in ("confirmed", "arrived", "completed"):
        client.patch(
            f"/api/appointments/{appointment_id}/status",
            headers=headers,
            json={"status": target},
        )

    rejected = client.patch(
        f"/api/appointments/{appointment_id}/status",
        headers=headers,
        json={"status": "confirmed"},
    )
    assert rejected.status_code == 409
    body = rejected.json()
    assert body["code"] == "INVALID_APPOINTMENT_TRANSITION"
    assert body["details"]["currentStatus"] == "completed"


def test_staff_cannot_advance_appointment_workflow() -> None:
    doctor_headers = _headers()
    appointment_id = _create_appointment(doctor_headers)
    staff_headers = _headers("staff@sihia.health", "staff123")

    response = client.patch(
        f"/api/appointments/{appointment_id}/status",
        headers=staff_headers,
        json={"status": "confirmed"},
    )
    assert response.status_code == 403
