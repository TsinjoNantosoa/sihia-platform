from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _admin_headers() -> dict[str, str]:
    res = client.post("/api/auth/login", json={"email": "admin@sihia.health", "password": "admin123"})
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_voice_stats_and_calls_require_auth() -> None:
    assert client.get("/api/voice/stats").status_code == 401
    headers = _admin_headers()
    stats = client.get("/api/voice/stats", headers=headers)
    assert stats.status_code == 200
    body = stats.json()
    assert "callsToday" in body
    assert "synthetic" in body["demoNotice"].lower()

    listing = client.get("/api/voice/calls", headers=headers)
    assert listing.status_code == 200
    assert "items" in listing.json()


def test_voice_settings_hides_secrets() -> None:
    headers = _admin_headers()
    res = client.get("/api/voice/settings", headers=headers)
    assert res.status_code == 200
    payload = res.json()
    assert "apiKey" not in payload
    assert "elevenlabs" not in str(payload).lower() or "agent" in payload
    dumped = str(payload)
    assert "sk-" not in dumped
    assert payload["providerMode"] in {"mock", "live"}


def test_mock_turn_and_webhooks() -> None:
    headers = _admin_headers()
    turn = client.post(
        "/api/voice/mock/turn",
        headers=headers,
        json={"text": "I want a cardiology appointment", "phoneFrom": "+212600111001", "language": "en"},
    )
    assert turn.status_code == 200
    data = turn.json()
    assert data["callId"]
    assert data["reply"]

    twilio = client.post(
        "/webhooks/twilio/voice",
        data={"From": "+212600111001", "To": "+212600000000", "CallSid": "CA-test-1"},
    )
    assert twilio.status_code == 200
    assert "Response" in twilio.text

    status = client.post(
        "/webhooks/twilio/status",
        data={"CallSid": "CA-test-1", "CallStatus": "completed"},
    )
    assert status.status_code == 200
