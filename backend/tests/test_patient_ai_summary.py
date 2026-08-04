from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _token(email: str = "admin@sihia.health", password: str = "admin123") -> str:
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]


def _first_patient_id(headers: dict) -> str:
    res = client.get("/api/patients", headers=headers)
    assert res.status_code == 200
    patients = res.json()
    assert patients, "seed patients required"
    return patients[0]["id"]


def test_ai_summary_deterministic_shape() -> None:
    headers = {"Authorization": f"Bearer {_token()}"}
    pid = _first_patient_id(headers)
    res = client.post(f"/api/patients/{pid}/ai-summary?lang=fr", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["patientId"] == pid
    assert body["engine"] in {"rules", "openai"}
    assert body["source"] in {"sqlite", "postgresql"}
    assert 1 <= len(body["lines"]) <= 5
    assert "disclaimer" in body
    assert "diagnostic" in body["disclaimer"].lower() or "aide" in body["disclaimer"].lower()
    assert "generatedAt" in body


def test_ai_summary_english() -> None:
    headers = {"Authorization": f"Bearer {_token()}"}
    pid = _first_patient_id(headers)
    res = client.post(f"/api/patients/{pid}/ai-summary?lang=en", headers=headers)
    assert res.status_code == 200
    assert "Not a diagnosis" in res.json()["disclaimer"] or "decision-support" in res.json()["disclaimer"]


def test_ai_summary_requires_patients_read() -> None:
    # staff has patients:read typically — use a user without if possible
    # manager/doctor should pass; verify 401 without token
    res = client.post("/api/patients/p-x/ai-summary")
    assert res.status_code in {401, 403}


def test_ai_summary_404() -> None:
    headers = {"Authorization": f"Bearer {_token()}"}
    res = client.post("/api/patients/does-not-exist/ai-summary", headers=headers)
    assert res.status_code == 404
