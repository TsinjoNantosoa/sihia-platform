from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def _login(email: str, password: str) -> str:
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return response.json()["access_token"]


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_patients_list_requires_patient_read_permission() -> None:
    token = _login("dr.benali@sihia.health", "demo1234")
    response = client.get("/api/patients", headers=_headers(token))
    assert response.status_code == 200


def test_staff_cannot_access_analytics_or_rbac_users() -> None:
    token = _login("staff@sihia.health", "staff123")

    analytics = client.get("/api/analytics/kpis", headers=_headers(token))
    assert analytics.status_code == 403
    assert analytics.json()["code"] == "FORBIDDEN"

    rbac = client.get("/api/rbac/users", headers=_headers(token))
    assert rbac.status_code == 403


def test_doctor_cannot_access_rbac_users_but_can_read_patients() -> None:
    token = _login("dr.benali@sihia.health", "demo1234")

    patients = client.get("/api/patients", headers=_headers(token))
    assert patients.status_code == 200

    rbac = client.get("/api/rbac/users", headers=_headers(token))
    assert rbac.status_code == 403
