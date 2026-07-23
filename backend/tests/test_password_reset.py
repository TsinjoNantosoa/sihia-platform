"""Tests reset mot de passe (code e-mail)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.infrastructure import notification_channels
from app.main import app


client = TestClient(app)


@pytest.fixture(autouse=True)
def _email_log_mode(monkeypatch):
    from app.core import config

    monkeypatch.setattr(config.settings, "email_mode", "log")
    monkeypatch.setattr(config.settings, "reminder_email_mode", "log")
    notification_channels.password_reset_outbox.clear()
    yield
    notification_channels.password_reset_outbox.clear()


def _last_code() -> str:
    assert notification_channels.password_reset_outbox, "aucun email de reset capturé"
    return notification_channels.password_reset_outbox[-1]["code"]


def test_forgot_password_anti_enumeration():
    known = client.post("/api/auth/forgot-password", json={"email": "admin@sihia.health"})
    assert known.status_code == 200
    assert known.json()["status"] == "ok"
    assert len(notification_channels.password_reset_outbox) == 1

    unknown = client.post("/api/auth/forgot-password", json={"email": "unknown@example.com"})
    assert unknown.status_code == 200
    assert unknown.json() == known.json()
    assert len(notification_channels.password_reset_outbox) == 1


def test_verify_and_reset_password_flow():
    email = "admin@sihia.health"
    notification_channels.password_reset_outbox.clear()
    client.post("/api/auth/forgot-password", json={"email": email})
    code = _last_code()

    bad = client.post(
        "/api/auth/verify-reset-code",
        json={"email": email, "code": "000000" if code != "000000" else "111111"},
    )
    assert bad.status_code == 400

    ok = client.post("/api/auth/verify-reset-code", json={"email": email, "code": code})
    assert ok.status_code == 200

    new_password = "NewPass99!"
    reset = client.post(
        "/api/auth/reset-password",
        json={"email": email, "code": code, "newPassword": new_password},
    )
    assert reset.status_code == 200

    login = client.post(
        "/api/auth/login",
        json={"email": email, "password": new_password},
    )
    assert login.status_code == 200
    assert login.json().get("access_token")

    # Restore demo password for other tests
    notification_channels.password_reset_outbox.clear()
    client.post("/api/auth/forgot-password", json={"email": email})
    code2 = _last_code()
    client.post(
        "/api/auth/reset-password",
        json={"email": email, "code": code2, "newPassword": "admin123"},
    )
