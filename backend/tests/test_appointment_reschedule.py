from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from tests.helpers_patients import appointment_payload

client = TestClient(app)


def _headers(email: str = "dr.benali@sihia.health", password: str = "demo1234") -> dict[str, str]:
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _unique_date(offset_minutes: int = 0) -> str:
    microseconds = int(uuid4().hex[:5], 16)
    value = datetime(2094, 1, 1, 8, 0, tzinfo=timezone.utc)
    return (value + timedelta(minutes=offset_minutes, microseconds=microseconds)).isoformat()


def _create(headers: dict[str, str], *, doctor_id: str, date: str, status: str = "scheduled") -> dict:
    response = client.post(
        "/api/appointments",
        headers=headers,
        json=appointment_payload(
            client,
            headers,
            doctor_id=doctor_id,
            date=date,
            reason="Test calendrier",
            status=status,
        ),
    )
    assert response.status_code == 200
    return response.json()


def test_appointment_can_be_moved_to_another_doctor_and_time() -> None:
    headers = _headers()
    appointment = _create(headers, doctor_id="d-1", date=_unique_date())
    target_date = _unique_date(60)

    response = client.patch(
        f"/api/appointments/{appointment['id']}/schedule",
        headers=headers,
        json={"doctorId": "d-2", "date": target_date},
    )

    assert response.status_code == 200
    assert response.json()["doctorId"] == "d-2"
    assert response.json()["doctorName"].startswith("Dr. ")
    assert response.json()["date"] == target_date
    client.post(f"/api/appointments/{appointment['id']}/cancel", headers=headers)


def test_reschedule_rejects_an_overlapping_slot_without_changing_appointment() -> None:
    headers = _headers()
    target_date = _unique_date(120)
    blocker = _create(headers, doctor_id="d-1", date=target_date)
    movable = _create(headers, doctor_id="d-1", date=_unique_date(240))

    response = client.patch(
        f"/api/appointments/{movable['id']}/schedule",
        headers=headers,
        json={"doctorId": "d-1", "date": target_date},
    )

    assert response.status_code == 409
    assert response.json()["code"] == "APPOINTMENT_CONFLICT"
    current = next(item for item in client.get("/api/appointments", headers=headers).json() if item["id"] == movable["id"])
    assert current["doctorId"] == movable["doctorId"]
    assert current["date"] == movable["date"]
    client.post(f"/api/appointments/{blocker['id']}/cancel", headers=headers)
    client.post(f"/api/appointments/{movable['id']}/cancel", headers=headers)


def test_completed_appointment_cannot_be_rescheduled() -> None:
    headers = _headers()
    appointment = _create(headers, doctor_id="d-2", date=_unique_date(300))
    for target in ("confirmed", "arrived", "completed"):
        client.patch(
            f"/api/appointments/{appointment['id']}/status",
            headers=headers,
            json={"status": target},
        )

    response = client.patch(
        f"/api/appointments/{appointment['id']}/schedule",
        headers=headers,
        json={"doctorId": "d-2", "date": _unique_date(360)},
    )

    assert response.status_code == 409
    assert response.json()["code"] == "APPOINTMENT_NOT_RESCHEDULABLE"


def test_staff_cannot_reschedule_an_appointment() -> None:
    doctor_headers = _headers()
    appointment = _create(
        doctor_headers,
        doctor_id="d-1",
        date=_unique_date(420),
    )
    staff_headers = _headers("staff@sihia.health", "staff123")

    response = client.patch(
        f"/api/appointments/{appointment['id']}/schedule",
        headers=staff_headers,
        json={"doctorId": "d-1", "date": _unique_date(480)},
    )

    assert response.status_code == 403
    client.post(f"/api/appointments/{appointment['id']}/cancel", headers=doctor_headers)
