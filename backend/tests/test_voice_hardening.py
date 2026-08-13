from __future__ import annotations

import hashlib
import hmac
import json
from unittest.mock import MagicMock

import httpx
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.presentation.deps import call_service, voice_tools
from app.voice.errors import CONFIRMATION_REQUIRED, VOICE_PROVIDER_NOT_CONFIGURED
from app.voice.llm_service import VoiceLLMService
from app.voice.redaction import minimize_tool_log, redact_mapping

client = TestClient(app)


def _admin_headers() -> dict[str, str]:
    res = client.post("/api/auth/login", json={"email": "admin@sihia.health", "password": "admin123"})
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _patch_settings(headers: dict[str, str], **payload: object) -> None:
    res = client.patch("/api/voice/settings", headers=headers, json=payload)
    assert res.status_code == 200


def test_outbound_creates_only_one_voice_call() -> None:
    headers = _admin_headers()
    _patch_settings(headers, outboundCallsEnabled=True, agentEnabled=True)
    try:
        phone = "+212600888001"
        before = [c.id for c in call_service.repo.list_calls(limit=500) if c.phone_to == phone]
        res = client.post("/api/voice/calls/outbound", headers=headers, json={"phoneTo": phone, "language": "en"})
        assert res.status_code == 200
        body = res.json()
        assert body["status"] == "queued"
        assert body["status"] != "completed"
        after = [c for c in call_service.repo.list_calls(limit=500) if c.phone_to == phone]
        assert len(after) == len(before) + 1
        assert after[-1].direction == "outbound"
    finally:
        _patch_settings(headers, outboundCallsEnabled=False)


def test_live_provider_not_configured_fails_explicitly(monkeypatch) -> None:
    headers = _admin_headers()
    _patch_settings(headers, outboundCallsEnabled=True, agentEnabled=True)
    monkeypatch.setattr(settings, "voice_provider_mode", "live")
    monkeypatch.setattr(settings, "elevenlabs_api_key", "")
    monkeypatch.setattr(settings, "elevenlabs_agent_id", "")
    before = len(call_service.repo.list_calls(limit=1000))
    try:
        res = client.post(
            "/api/voice/calls/outbound",
            headers=headers,
            json={"phoneTo": "+212600888002", "language": "en"},
        )
        assert res.status_code == 503
        assert res.json()["code"] == VOICE_PROVIDER_NOT_CONFIGURED
        assert len(call_service.repo.list_calls(limit=1000)) == before
    finally:
        _patch_settings(headers, outboundCallsEnabled=False)


def test_voice_settings_runtime_override(monkeypatch) -> None:
    headers = _admin_headers()
    monkeypatch.setattr(settings, "voice_confirm_mutations", False)
    monkeypatch.setattr(settings, "voice_max_retries", 9)
    _patch_settings(headers, requireConfirmation=True, maxRetries=3)
    payload = client.get("/api/voice/settings", headers=headers).json()
    assert payload["requireConfirmation"] is True
    assert payload["maxRetries"] == 3
    assert payload["configured"] is True
    assert payload["provider"] in {"mock", "elevenlabs"}
    assert payload["mode"] in {"mock", "live"}


def test_voice_agent_disabled_blocks_mock_turn() -> None:
    headers = _admin_headers()
    _patch_settings(headers, agentEnabled=False)
    try:
        res = client.post(
            "/api/voice/mock/turn",
            headers=headers,
            json={"text": "I want an appointment", "phoneFrom": "+212600888003"},
        )
        assert res.status_code == 503
        assert res.json()["code"] == "VOICE_DISABLED"
    finally:
        _patch_settings(headers, agentEnabled=True)


def test_outbound_disabled() -> None:
    headers = _admin_headers()
    _patch_settings(headers, outboundCallsEnabled=False, agentEnabled=True)
    res = client.post(
        "/api/voice/calls/outbound",
        headers=headers,
        json={"phoneTo": "+212600888004"},
    )
    assert res.status_code == 403
    assert res.json()["code"] == "OUTBOUND_DISABLED"


def test_confirmation_still_required_from_runtime_settings(monkeypatch) -> None:
    headers = _admin_headers()
    monkeypatch.setattr(settings, "voice_confirm_mutations", False)
    _patch_settings(headers, requireConfirmation=True)
    call = call_service.start_call(direction="inbound", phone_from="+212600888005", phone_to="+212600000000")
    denied = voice_tools.invoke(
        "create_appointment",
        {"doctorId": "d-1", "patientId": "p-x", "date": "2099-06-01T09:00:00+00:00"},
        call_id=call.id,
        patient_verified=True,
        confirmation_received=False,
    )
    assert denied["success"] is False
    assert denied["code"] == CONFIRMATION_REQUIRED


def test_tool_logs_redact_sensitive_patient_data() -> None:
    call = call_service.start_call(direction="inbound", phone_from="+212600888006", phone_to="+212600000000")
    voice_tools.invoke(
        "search_patient",
        {
            "firstName": "Jean",
            "lastName": "Dupont",
            "dob": "1990-01-01",
            "phone": "+212600111999",
            "recordNumber": "MRN-999",
            "api_key": "sk-secret",
        },
        call_id=call.id,
    )
    logs = call_service.repo.list_tool_calls(call.id)
    assert logs
    dumped = json.dumps(logs[0].arguments_json) + json.dumps(logs[0].result_json)
    assert "1990-01-01" not in dumped
    assert "Dupont" not in dumped
    assert "+212600111999" not in dumped
    assert "MRN-999" not in dumped
    assert "sk-secret" not in dumped
    assert logs[0].arguments_json["dob"] == "[redacted]"
    assert logs[0].arguments_json["api_key"] == "[redacted]"


def test_redaction_keeps_technical_ids() -> None:
    payload = redact_mapping({"patientId": "p-1", "appointmentId": "a-1", "token": "secret", "phone": "+1"})
    assert payload["patientId"] == "p-1"
    assert payload["appointmentId"] == "a-1"
    assert payload["token"] == "[redacted]"
    minimized = minimize_tool_log(
        "search_patient",
        {"success": True, "data": {"count": 1, "patients": [{"id": "p-1", "firstName": "Jean", "dob": "1990-01-01"}]}},
    )
    assert minimized["data"]["patients"] == [{"patientId": "p-1", "matched": True}]


def test_invalid_twilio_signature_rejected(monkeypatch) -> None:
    monkeypatch.setattr(settings, "voice_provider_mode", "live")
    monkeypatch.setattr(settings, "twilio_auth_token", "test-token")
    res = client.post(
        "/webhooks/twilio/voice",
        data={"From": "+212600000001", "To": "+212600000000", "CallSid": "CA-bad"},
        headers={"X-Twilio-Signature": "invalid"},
    )
    assert res.status_code == 401


def test_valid_twilio_signature_accepted(monkeypatch) -> None:
    from twilio.request_validator import RequestValidator

    token = "test-token"
    monkeypatch.setattr(settings, "voice_provider_mode", "live")
    monkeypatch.setattr(settings, "twilio_auth_token", token)
    params = {"From": "+212600000001", "To": "+212600000000", "CallSid": "CA-good-sig"}
    url = "http://testserver/webhooks/twilio/voice"
    signature = RequestValidator(token).compute_signature(url, params)
    res = client.post(
        "/webhooks/twilio/voice",
        data=params,
        headers={"X-Twilio-Signature": signature},
    )
    assert res.status_code == 200
    assert "Response" in res.text


def test_human_escalation_status_is_accurate() -> None:
    call = call_service.start_call(direction="inbound", phone_from="+212600888007", phone_to="+212600000000")
    result = voice_tools.invoke("escalate_to_human", {"reason": "operator_request"}, call_id=call.id)
    assert result["success"] is True
    assert result["status"] == "ESCALATION_REQUESTED"
    assert result["transfer_available"] is False
    dumped = json.dumps(result).lower()
    assert "successfully transferred" not in dumped
    assert "transfer_completed" not in dumped


def test_gpt_failure_uses_fallback(monkeypatch) -> None:
    monkeypatch.setattr(settings, "openai_api_key", "sk-test")
    response = MagicMock()
    response.status_code = 429
    response.raise_for_status.side_effect = httpx.HTTPStatusError(
        "rate limited",
        request=MagicMock(),
        response=response,
    )

    class _Client:
        def __init__(self, *args, **kwargs) -> None:
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args) -> None:
            return None

        def post(self, *args, **kwargs):
            return response

    monkeypatch.setattr(httpx, "Client", _Client)
    understanding = VoiceLLMService().understand("I want a cardiology appointment")
    assert understanding.fallback_used is True
    assert understanding.intent is None


def test_mock_turn_uses_deterministic_fallback_without_openai(monkeypatch) -> None:
    monkeypatch.setattr(settings, "openai_api_key", "")
    headers = _admin_headers()
    res = client.post(
        "/api/voice/mock/turn",
        headers=headers,
        json={"text": "I want a cardiology appointment", "phoneFrom": "+212600111001", "language": "en"},
    )
    assert res.status_code == 200
    assert res.json()["fallbackUsed"] is True
    assert res.json()["reply"]


def test_health_details_exposes_safe_voice_status() -> None:
    res = client.get("/health/details")
    assert res.status_code == 200
    voice = res.json()["components"]["voice_ai"]
    assert set(voice.keys()) == {"enabled", "provider", "configured"}
    dumped = json.dumps(voice)
    assert "sk-" not in dumped
    assert "api_key" not in dumped
    assert "auth_token" not in dumped


def test_elevenlabs_init_requires_signature_in_live_mode(monkeypatch) -> None:
    monkeypatch.setattr(settings, "voice_provider_mode", "live")
    monkeypatch.setattr(settings, "elevenlabs_webhook_secret", "whsec")
    denied = client.post("/webhooks/elevenlabs/init", json={"from": "+212600000001"})
    assert denied.status_code == 401
    raw = b'{"from":"+212600000001"}'
    signature = hmac.new(b"whsec", raw, hashlib.sha256).hexdigest()
    accepted = client.post(
        "/webhooks/elevenlabs/init",
        content=raw,
        headers={"Content-Type": "application/json", "ElevenLabs-Signature": f"sha256={signature}"},
    )
    assert accepted.status_code == 200
