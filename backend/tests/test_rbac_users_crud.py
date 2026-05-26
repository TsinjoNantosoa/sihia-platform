from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _token(email: str, password: str) -> str:
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_admin_crud_user_lifecycle() -> None:
    admin = _token("admin@sihia.health", "admin123")
    headers = _headers(admin)

    created = client.post(
        "/api/rbac/users",
        headers=headers,
        json={
            "name": "Test RBAC",
            "email": "test.rbac@sihia.health",
            "password": "testpass1",
            "role": "staff",
        },
    )
    assert created.status_code == 201
    user_id = created.json()["id"]
    assert created.json()["role"] == "staff"
    assert created.json()["status"] == "active"

    updated = client.patch(
        f"/api/rbac/users/{user_id}",
        headers=headers,
        json={"role": "manager", "name": "Test RBAC Manager"},
    )
    assert updated.status_code == 200
    assert updated.json()["role"] == "manager"
    assert updated.json()["name"] == "Test RBAC Manager"

    deleted = client.delete(f"/api/rbac/users/{user_id}", headers=headers)
    assert deleted.status_code == 204

    missing = client.get("/api/rbac/users", headers=headers)
    ids = [u["id"] for u in missing.json()]
    assert user_id not in ids


def test_staff_cannot_create_user() -> None:
    staff = _token("staff@sihia.health", "staff123")
    res = client.post(
        "/api/rbac/users",
        headers=_headers(staff),
        json={
            "name": "Hack",
            "email": "hack@sihia.health",
            "password": "hackpass",
            "role": "admin",
        },
    )
    assert res.status_code == 403


def test_admin_cannot_delete_self() -> None:
    admin = _token("admin@sihia.health", "admin123")
    me = client.get("/api/rbac/users", headers=_headers(admin))
    admin_id = next(u["id"] for u in me.json() if u["email"] == "admin@sihia.health")
    res = client.delete(f"/api/rbac/users/{admin_id}", headers=_headers(admin))
    assert res.status_code == 400


def test_suspended_user_cannot_login() -> None:
    admin = _token("admin@sihia.health", "admin123")
    headers = _headers(admin)

    created = client.post(
        "/api/rbac/users",
        headers=headers,
        json={
            "name": "Suspended User",
            "email": "suspended@sihia.health",
            "password": "suspend1",
            "role": "staff",
        },
    )
    assert created.status_code == 201
    user_id = created.json()["id"]

    suspend = client.patch(
        f"/api/rbac/users/{user_id}",
        headers=headers,
        json={"status": "suspended"},
    )
    assert suspend.status_code == 200

    login = client.post(
        "/api/auth/login",
        json={"email": "suspended@sihia.health", "password": "suspend1"},
    )
    assert login.status_code == 403

    client.delete(f"/api/rbac/users/{user_id}", headers=headers)
