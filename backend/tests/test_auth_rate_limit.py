from fastapi.testclient import TestClient

from app.main import app
from app.presentation.rate_limit import reset_login_limiter_all

client = TestClient(app)


def setup_function() -> None:
    reset_login_limiter_all()


def test_login_rate_limit_blocks_after_repeated_failures() -> None:
    for _ in range(5):
        res = client.post("/api/auth/login", json={"email": "admin@sihia.health", "password": "wrong-pass"})
        assert res.status_code == 401

    blocked = client.post("/api/auth/login", json={"email": "admin@sihia.health", "password": "wrong-pass"})
    assert blocked.status_code == 429
    payload = blocked.json()
    assert payload.get("code") == "TOO_MANY_ATTEMPTS"
    assert "tentatives" in str(payload.get("message", "")).lower()


def test_successful_login_resets_limiter() -> None:
    for _ in range(4):
        res = client.post("/api/auth/login", json={"email": "admin@sihia.health", "password": "wrong-pass"})
        assert res.status_code == 401

    ok = client.post("/api/auth/login", json={"email": "admin@sihia.health", "password": "admin123"})
    assert ok.status_code == 200

    # A successful login clears the limiter state for the same ip/email key.
    after_reset = client.post("/api/auth/login", json={"email": "admin@sihia.health", "password": "wrong-pass"})
    assert after_reset.status_code == 401
