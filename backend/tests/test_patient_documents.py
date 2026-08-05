from fastapi.testclient import TestClient

from app.main import app
from tests.helpers_patients import auth_headers, ensure_patient_id

client = TestClient(app)


def test_enrich_patient_fields() -> None:
    headers = auth_headers(client)
    pid = ensure_patient_id(client, headers)
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
    headers = auth_headers(client)
    pid = ensure_patient_id(client, headers)
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
