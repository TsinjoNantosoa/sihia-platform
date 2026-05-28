import json
import logging

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _token(email: str, password: str) -> str:
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _extract_admin_actions(caplog) -> list[dict]:
    actions: list[dict] = []
    for rec in caplog.records:
        if rec.name != "sihia.audit":
            continue
        try:
            payload = json.loads(rec.getMessage())
        except json.JSONDecodeError:
            continue
        if payload.get("event") == "admin_action":
            actions.append(payload)
    return actions


def test_rbac_crud_emits_audit_logs(caplog) -> None:
    caplog.set_level(logging.INFO, logger="sihia.audit")

    admin = _token("admin@sihia.health", "admin123")
    headers = _headers(admin)

    created = client.post(
        "/api/rbac/users",
        headers=headers,
        json={
            "name": "Audit User",
            "email": "audit.user@sihia.health",
            "password": "auditpass1",
            "role": "staff",
        },
    )
    assert created.status_code == 201
    user_id = created.json()["id"]

    updated = client.patch(
        f"/api/rbac/users/{user_id}",
        headers=headers,
        json={"role": "manager"},
    )
    assert updated.status_code == 200

    deleted = client.delete(f"/api/rbac/users/{user_id}", headers=headers)
    assert deleted.status_code == 204

    actions = _extract_admin_actions(caplog)
    action_names = [a.get("action") for a in actions]
    assert "rbac.user.create" in action_names
    assert "rbac.user.update" in action_names
    assert "rbac.user.delete" in action_names
    assert any(a.get("targetId") == user_id for a in actions)


def test_logout_all_emits_audit_log(caplog) -> None:
    caplog.set_level(logging.INFO, logger="sihia.audit")

    admin = _token("admin@sihia.health", "admin123")
    headers = _headers(admin)
    res = client.post("/api/auth/logout-all", headers=headers)
    assert res.status_code == 200

    actions = _extract_admin_actions(caplog)
    assert any(a.get("action") == "auth.logout_all" for a in actions)
