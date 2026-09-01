from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import settings
from app.infrastructure.audit_log import read_audit_records
from app.main import app

client = TestClient(app)


def _token(email: str = "admin@sihia.health", password: str = "admin123") -> str:
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_clinical_actions_emit_audit_logs(tmp_path: Path, monkeypatch) -> None:
    log_file = tmp_path / "audit.jsonl"
    monkeypatch.setattr(settings, "audit_log_path", str(log_file))

    admin = _token()
    headers = _headers(admin)

    created = client.post("/api/patients", headers=headers, json={
        "firstName": "Audit",
        "lastName": "Clinical",
        "dob": "1988-03-10",
        "gender": "F",
        "phone": "+212600888777",
        "address": "3 rue Audit",
        "bloodType": "B+",
        "allergies": [],
    })
    assert created.status_code in (200, 201)
    patient_id = created.json()["id"]

    updated = client.patch(
        f"/api/patients/{patient_id}",
        headers=headers,
        json={"phone": "+212600888778"},
    )
    assert updated.status_code == 200

    visit = client.post(
        f"/api/patients/{patient_id}/history",
        headers=headers,
        json={
            "date": "2026-01-15T10:00:00Z",
            "reason": "Consultation",
            "doctorName": "Dr Test",
            "specialty": "Généraliste",
            "diagnosis": "Contrôle",
        },
    )
    assert visit.status_code == 200

    appt = client.post(
        "/api/appointments",
        headers=headers,
        json={
            "patientId": patient_id,
            "doctorId": "d-1",
            "date": "2030-08-01T09:00:00Z",
            "durationMin": 30,
            "reason": "Audit RDV",
        },
    )
    assert appt.status_code == 200
    appt_id = appt.json()["id"]

    cancelled = client.post(f"/api/appointments/{appt_id}/cancel", headers=headers)
    assert cancelled.status_code == 200

    summary = client.post(f"/api/patients/{patient_id}/ai-summary?lang=fr", headers=headers)
    assert summary.status_code == 200

    archived = client.delete(f"/api/patients/{patient_id}", headers=headers)
    assert archived.status_code == 200

    actions = [record.get("action") for record in read_audit_records(limit=50)]
    assert "patient.create" in actions
    assert "patient.update" in actions
    assert "medical_visit.create" in actions
    assert "appointment.create" in actions
    assert "appointment.cancel" in actions
    assert "patient.ai_summary.generate" in actions
    assert "patient.archive" in actions
