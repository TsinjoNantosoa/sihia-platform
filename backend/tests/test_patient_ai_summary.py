from fastapi.testclient import TestClient

from app.main import app
from tests.helpers_patients import auth_headers, ensure_patient_id

client = TestClient(app)


def test_ai_summary_deterministic_shape() -> None:
    headers = auth_headers(client)
    pid = ensure_patient_id(client, headers)
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
    headers = auth_headers(client)
    pid = ensure_patient_id(client, headers)
    res = client.post(f"/api/patients/{pid}/ai-summary?lang=en", headers=headers)
    assert res.status_code == 200
    assert (
        "Not a diagnosis" in res.json()["disclaimer"]
        or "decision-support" in res.json()["disclaimer"]
    )


def test_ai_summary_requires_patients_read() -> None:
    res = client.post("/api/patients/p-x/ai-summary")
    assert res.status_code in {401, 403}


def test_ai_summary_404() -> None:
    headers = auth_headers(client)
    res = client.post("/api/patients/does-not-exist/ai-summary", headers=headers)
    assert res.status_code == 404
