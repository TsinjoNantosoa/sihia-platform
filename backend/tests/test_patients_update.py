from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _login_admin() -> str:
    res = client.post("/api/auth/login", json={"email": "admin@sihia.health", "password": "admin123"})
    assert res.status_code == 200
    return res.json()["access_token"]


def test_patch_patient_updates_fields() -> None:
    token = _login_admin()
    headers = {"Authorization": f"Bearer {token}"}

    created = client.post(
        "/api/patients",
        headers=headers,
        json={
            "firstName": "Test",
            "lastName": "Patch",
            "dob": "1990-01-01",
            "gender": "M",
            "phone": "+33123456789",
            "address": "1 rue Test",
            "bloodType": "O+",
            "allergies": ["pollen"],
        },
    )
    assert created.status_code == 200
    patient_id = created.json()["id"]

    updated = client.patch(
        f"/api/patients/{patient_id}",
        headers=headers,
        json={"firstName": "Updated", "status": "inactive", "allergies": ["pollen", "latex"]},
    )
    assert updated.status_code == 200
    body = updated.json()
    assert body["firstName"] == "Updated"
    assert body["status"] == "inactive"
    assert body["allergies"] == ["pollen", "latex"]

    fetched = client.get(f"/api/patients/{patient_id}", headers=headers)
    assert fetched.json()["firstName"] == "Updated"

    client.delete(f"/api/patients/{patient_id}", headers=headers)


def test_staff_cannot_patch_patient() -> None:
    token = _login_admin()
    headers = {"Authorization": f"Bearer {token}"}
    created = client.post(
        "/api/patients",
        headers=headers,
        json={
            "firstName": "Staff",
            "lastName": "Block",
            "dob": "1985-05-05",
            "gender": "F",
            "phone": "+33999999999",
            "address": "Paris",
            "bloodType": "A+",
            "allergies": [],
        },
    )
    patient_id = created.json()["id"]

    staff_login = client.post("/api/auth/login", json={"email": "staff@sihia.health", "password": "staff123"})
    staff_token = staff_login.json()["access_token"]
    denied = client.patch(
        f"/api/patients/{patient_id}",
        headers={"Authorization": f"Bearer {staff_token}"},
        json={"firstName": "Hack"},
    )
    assert denied.status_code == 403

    client.delete(f"/api/patients/{patient_id}", headers=headers)
