import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import settings
from app.infrastructure.audit_log import audit_log_path, read_audit_records
from app.main import app

client = TestClient(app)


def _token(email: str, password: str) -> str:
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_audit_export_requires_admin(tmp_path: Path, monkeypatch) -> None:
    log_file = tmp_path / "audit.jsonl"
    monkeypatch.setattr(settings, "audit_log_path", str(log_file))

    staff = _token("staff@sihia.health", "staff123")
    denied = client.get("/api/admin/audit-logs/export", headers=_headers(staff))
    assert denied.status_code == 403


def test_audit_export_jsonl_after_rbac_crud(tmp_path: Path, monkeypatch) -> None:
    log_file = tmp_path / "audit.jsonl"
    monkeypatch.setattr(settings, "audit_log_path", str(log_file))

    admin = _token("admin@sihia.health", "admin123")
    headers = _headers(admin)

    created = client.post(
        "/api/rbac/users",
        headers=headers,
        json={
            "name": "Export Audit",
            "email": "export.audit@sihia.health",
            "password": "exportpass1",
            "role": "staff",
        },
    )
    assert created.status_code == 201
    user_id = created.json()["id"]
    client.delete(f"/api/rbac/users/{user_id}", headers=headers)

    export = client.get("/api/admin/audit-logs/export", headers=headers)
    assert export.status_code == 200
    assert "application/x-ndjson" in export.headers.get("content-type", "")
    assert "attachment" in export.headers.get("content-disposition", "").lower()

    lines = [ln for ln in export.content.decode("utf-8").splitlines() if ln.strip()]
    assert len(lines) >= 2
    actions = {json.loads(ln).get("action") for ln in lines}
    assert "rbac.user.create" in actions
    assert "audit.logs.export" in actions

    listed = client.get("/api/admin/audit-logs?limit=50", headers=headers)
    assert listed.status_code == 200
    body = listed.json()
    assert body["count"] >= 1
    assert any(item.get("action") == "rbac.user.create" for item in body["items"])

    assert audit_log_path() == log_file
    assert len(read_audit_records(limit=100)) >= 1
