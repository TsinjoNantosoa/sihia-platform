from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _token(email: str, password: str) -> str:
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]


def _admin_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {_token('admin@sihia.health', 'admin123')}"}


def _create_patient_with_contact(headers: dict[str, str]) -> str:
    res = client.post(
        "/api/patients",
        headers=headers,
        json={
            "firstName": "Rappel",
            "lastName": "Test",
            "dob": "1990-01-01",
            "gender": "F",
            "phone": "+212612345678",
            "email": "rappel.test@sihia.health",
            "address": "Casablanca",
            "bloodType": "O+",
            "allergies": [],
        },
    )
    assert res.status_code == 200
    return res.json()["id"]


def _create_future_appointment(headers: dict[str, str], patient_id: str, *, within_hours: int | None = None) -> str:
    if within_hours is not None:
        when = (
            datetime.now(timezone.utc) + timedelta(hours=within_hours, minutes=int(uuid4().hex[:2], 16) % 50)
        ).replace(microsecond=0)
    else:
        when = datetime(
            2099,
            1,
            1,
            8 + int(uuid4().hex[:2], 16) % 10,
            int(uuid4().hex[2:4], 16) % 59,
            tzinfo=timezone.utc,
        )
    res = client.post(
        "/api/appointments",
        headers=headers,
        json={
            "patientId": patient_id,
            "patientName": "Rappel Test",
            "doctorId": "d-2",
            "doctorName": "Dr. Karim",
            "date": when.isoformat(),
            "durationMin": 30,
            "reason": "Controle",
            "status": "scheduled",
        },
    )
    assert res.status_code == 200
    return res.json()["id"]


def test_manual_email_reminder_is_recorded(monkeypatch) -> None:
    headers = _admin_headers()
    patient_id = _create_patient_with_contact(headers)
    appt_id = _create_future_appointment(headers, patient_id)

    sent: list[dict] = []

    def fake_send_email(to: str, subject: str, body: str) -> None:
        sent.append({"to": to, "subject": subject, "body": body})

    monkeypatch.setattr("app.application.reminder_service.send_email", fake_send_email)

    res = client.post(
        f"/api/appointments/{appt_id}/remind",
        headers=headers,
        json={"channels": ["email"]},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["appointmentId"] == appt_id
    assert body["results"][0]["status"] == "sent"
    assert body["results"][0]["channel"] == "email"
    assert len(sent) == 1
    assert sent[0]["to"] == "rappel.test@sihia.health"

    history = client.get(f"/api/appointments/{appt_id}/reminders", headers=headers)
    assert history.status_code == 200
    assert len(history.json()["items"]) >= 1

    listed = client.get("/api/appointments", headers=headers)
    row = next(item for item in listed.json() if item["id"] == appt_id)
    assert row["reminderSummary"]["email"] == "sent"


def test_reminder_rejected_for_cancelled_appointment() -> None:
    headers = _admin_headers()
    patient_id = _create_patient_with_contact(headers)
    appt_id = _create_future_appointment(headers, patient_id)
    client.post(f"/api/appointments/{appt_id}/cancel", headers=headers)

    res = client.post(
        f"/api/appointments/{appt_id}/remind",
        headers=headers,
        json={"channels": ["email"]},
    )
    assert res.status_code == 400


def test_staff_cannot_send_reminder() -> None:
    headers = _admin_headers()
    patient_id = _create_patient_with_contact(headers)
    appt_id = _create_future_appointment(headers, patient_id)

    staff_headers = {"Authorization": f"Bearer {_token('staff@sihia.health', 'staff123')}"}
    res = client.post(
        f"/api/appointments/{appt_id}/remind",
        headers=staff_headers,
        json={"channels": ["email"]},
    )
    assert res.status_code == 403


def test_auto_batch_sends_for_upcoming_appointments(monkeypatch) -> None:
    headers = _admin_headers()
    patient_id = _create_patient_with_contact(headers)
    appt_id = _create_future_appointment(headers, patient_id, within_hours=6)

    calls: list[str] = []

    def fake_send_email(to: str, subject: str, body: str) -> None:
        calls.append(to)

    monkeypatch.setattr("app.application.reminder_service.send_email", fake_send_email)
    monkeypatch.setattr("app.application.reminder_service.send_sms", lambda *_a, **_k: None)

    res = client.post("/api/admin/reminders/run", headers=headers)
    assert res.status_code == 200
    payload = res.json()
    assert payload["processed"] >= 1
    assert payload["sent"] >= 1
    assert "rappel.test@sihia.health" in calls

    second = client.post("/api/admin/reminders/run", headers=headers)
    assert second.status_code == 200
    assert second.json()["processed"] == 0
