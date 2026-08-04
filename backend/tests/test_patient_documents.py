from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _headers() -> dict[str, str]:
    res = client.post("/api/auth/login", json={"email": "admin@sihia.health", "password": "admin123"})
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _patient_id(headers: dict) -> str:
    return client.get("/api/patients", headers=headers).json()[0]["id"]


def test_enrich_patient_fields() -> None:
    headers = _headers()
    pid = _patient_id(headers)
    res = client.patch(
        f"/api/patients/{pid}",
        headers=headers,
        json={
            "chronicConditions": "Asthme léger",
            "currentTreatments": "Ventoline PRN",
            "emergencyContact": "Famille — 0612345678",
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["chronicConditions"] == "Asthme léger"
    assert body["currentTreatments"] == "Ventoline PRN"
    assert body["emergencyContact"] == "Famille — 0612345678"


def test_document_upload_list_download_delete() -> None:
    headers = _headers()
    pid = _patient_id(headers)
    files = {"file": ("ordo.txt", b"Ordonnance demo SIH IA", "text/plain")}
    data = {"category": "ordonnance", "notes": "Demo"}
    up = client.post(f"/api/patients/{pid}/documents", headers=headers, files=files, data=data)
    assert up.status_code == 201
    doc = up.json()
    assert doc["filename"] == "ordo.txt"
    assert doc["category"] == "ordonnance"

    listed = client.get(f"/api/patients/{pid}/documents", headers=headers)
    assert listed.status_code == 200
    assert any(d["id"] == doc["id"] for d in listed.json())

    dl = client.get(f"/api/patients/{pid}/documents/{doc['id']}/download", headers=headers)
    assert dl.status_code == 200
    assert b"Ordonnance demo" in dl.content

    deleted = client.delete(f"/api/patients/{pid}/documents/{doc['id']}", headers=headers)
    assert deleted.status_code == 200
