from __future__ import annotations

import hashlib
import hmac
import json
import time
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi.testclient import TestClient

from app.application.schemas import PatientCreate
from app.core.config import settings
from app.main import app
from app.presentation.deps import agent_service, call_service, patients_service, voice_tools
from app.voice.errors import CONFIRMATION_REQUIRED, PATIENT_NOT_VERIFIED, VOICE_QUIET_HOURS
from app.voice.llm_service import VoiceUnderstanding
from app.voice.quiet_hours import is_within_quiet_hours

client = TestClient(app)


def _admin_headers() -> dict[str, str]:
    res = client.post("/api/auth/login", json={"email": "admin@sihia.health", "password": "admin123"})
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _patch_settings(headers: dict[str, str], **payload: object) -> None:
    res = client.patch("/api/voice/settings", headers=headers, json=payload)
    assert res.status_code == 200


def _el_sig(raw: bytes, secret: str) -> str:
    timestamp = str(int(time.time()))
    digest = hmac.new(secret.encode("utf-8"), f"{timestamp}.".encode("utf-8") + raw, hashlib.sha256).hexdigest()
    return f"t={timestamp},v0={digest}"


def test_inbound_rejected_when_agent_disabled() -> None:
    headers = _admin_headers()
    _patch_settings(headers, agentEnabled=False, inboundCallsEnabled=True)
    sid = f"CA-in-agent-{uuid4().hex[:8]}"
    try:
        res = client.post(
            "/webhooks/twilio/voice",
            data={"From": "+212600000001", "To": "+212600000000", "CallSid": sid},
        )
        assert res.status_code == 200
        assert "unavailable" in res.text.lower()
        assert call_service.repo.get_by_provider_id(sid) is None
    finally:
        _patch_settings(headers, agentEnabled=True)


def test_inbound_rejected_when_inbound_disabled() -> None:
    headers = _admin_headers()
    _patch_settings(headers, agentEnabled=True, inboundCallsEnabled=False)
    sid = f"CA-in-off-{uuid4().hex[:8]}"
    try:
        res = client.post(
            "/webhooks/twilio/voice",
            data={"From": "+212600000001", "To": "+212600000000", "CallSid": sid},
        )
        assert res.status_code == 200
        assert "unavailable" in res.text.lower()
        assert call_service.repo.get_by_provider_id(sid) is None
    finally:
        _patch_settings(headers, inboundCallsEnabled=True)


def test_inbound_allowed_when_enabled() -> None:
    headers = _admin_headers()
    _patch_settings(headers, agentEnabled=True, inboundCallsEnabled=True)
    sid = f"CA-in-ok-{uuid4().hex[:8]}"
    res = client.post(
        "/webhooks/twilio/voice",
        data={"From": "+212600000001", "To": "+212600000000", "CallSid": sid},
    )
    assert res.status_code == 200
    assert "unavailable" not in res.text.lower()
    assert call_service.repo.get_by_provider_id(sid) is not None


def test_outbound_rejected_when_agent_disabled() -> None:
    headers = _admin_headers()
    _patch_settings(headers, agentEnabled=False, outboundCallsEnabled=True)
    before = len(call_service.repo.list_calls(limit=1000))
    try:
        res = client.post("/api/voice/calls/outbound", headers=headers, json={"phoneTo": "+212600777001"})
        assert res.status_code == 503
        assert res.json()["code"] == "VOICE_AGENT_DISABLED"
        assert len(call_service.repo.list_calls(limit=1000)) == before
    finally:
        _patch_settings(headers, agentEnabled=True, outboundCallsEnabled=False)


def test_outbound_rejected_when_outbound_disabled() -> None:
    headers = _admin_headers()
    _patch_settings(headers, agentEnabled=True, outboundCallsEnabled=False)
    before = len(call_service.repo.list_calls(limit=1000))
    res = client.post("/api/voice/calls/outbound", headers=headers, json={"phoneTo": "+212600777002"})
    assert res.status_code == 403
    assert res.json()["code"] == "VOICE_OUTBOUND_DISABLED"
    assert len(call_service.repo.list_calls(limit=1000)) == before


def test_outbound_rejected_during_quiet_hours() -> None:
    headers = _admin_headers()
    now = datetime.now(timezone.utc)
    start = (now - timedelta(hours=1)).strftime("%H:%M")
    end = (now + timedelta(hours=1)).strftime("%H:%M")
    _patch_settings(
        headers,
        agentEnabled=True,
        outboundCallsEnabled=True,
        quietHoursStart=start,
        quietHoursEnd=end,
    )
    before = len(call_service.repo.list_calls(limit=1000))
    try:
        res = client.post("/api/voice/calls/outbound", headers=headers, json={"phoneTo": "+212600777003"})
        assert res.status_code == 403
        assert res.json()["code"] == VOICE_QUIET_HOURS
        assert len(call_service.repo.list_calls(limit=1000)) == before
    finally:
        _patch_settings(headers, outboundCallsEnabled=False, quietHoursStart="", quietHoursEnd="")


def test_quiet_hours_cross_midnight() -> None:
    tz = "UTC"
    noon = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
    late = datetime(2026, 1, 1, 23, 0, tzinfo=timezone.utc)
    early = datetime(2026, 1, 2, 7, 0, tzinfo=timezone.utc)
    assert is_within_quiet_hours(start="22:00", end="08:00", timezone_name=tz, now=late) is True
    assert is_within_quiet_hours(start="22:00", end="08:00", timezone_name=tz, now=early) is True
    assert is_within_quiet_hours(start="22:00", end="08:00", timezone_name=tz, now=noon) is False


def test_server_context_controls_patient_verification() -> None:
    call = call_service.start_call(direction="inbound", phone_from="+212600777010", phone_to="+212600000000")
    denied = voice_tools.invoke(
        "create_appointment",
        {"doctorId": "d-1", "patientId": "p-x", "date": "2099-07-01T09:00:00+00:00"},
        call_id=call.id,
    )
    assert denied["code"] == PATIENT_NOT_VERIFIED
    call.identity_status = "verified"
    call.context_json["confirmationReceived"] = True
    call.state = "COMMIT"
    call_service.repo.update_call(call)
    allowed_guard = voice_tools.context_for_call(call.id)
    assert allowed_guard.patient_verified is True
    assert allowed_guard.confirmation_received is True


def test_llm_cannot_forge_patient_verified() -> None:
    call = call_service.start_call(direction="inbound", phone_from="+212600777011", phone_to="+212600000000")
    result = voice_tools.invoke(
        "create_appointment",
        {"doctorId": "d-1", "patientId": "p-x", "date": "2099-07-01T09:00:00+00:00"},
        call_id=call.id,
        patient_verified=True,
        confirmation_received=True,
    )
    assert result["success"] is False
    assert result["code"] == PATIENT_NOT_VERIFIED


def test_llm_cannot_forge_confirmation() -> None:
    call = call_service.start_call(direction="inbound", phone_from="+212600777012", phone_to="+212600000000")
    call.identity_status = "verified"
    call_service.repo.update_call(call)
    result = voice_tools.invoke(
        "create_appointment",
        {"doctorId": "d-1", "patientId": "p-x", "date": "2099-07-01T09:00:00+00:00"},
        call_id=call.id,
        patient_verified=True,
        confirmation_received=True,
    )
    assert result["success"] is False
    assert result["code"] == CONFIRMATION_REQUIRED


def test_human_intent_routes_to_escalation(monkeypatch) -> None:
    class _LLM:
        def understand(self, text: str, language: str = "en") -> VoiceUnderstanding:
            return VoiceUnderstanding(intent="human", fallback_used=False)

    monkeypatch.setattr(agent_service, "llm", _LLM())
    monkeypatch.setattr(settings, "openai_api_key", "")
    headers = _admin_headers()
    _patch_settings(headers, agentEnabled=True)
    res = client.post(
        "/api/voice/mock/turn",
        headers=headers,
        json={"text": "hello there", "phoneFrom": "+212600777013", "language": "en"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["state"] in {"HUMAN_ESCALATION", "CALL_ENDED"}
    assert body["ended"] is True
    assert body["outcome"] == "escalated"


def test_info_intent_does_not_route_to_booking(monkeypatch) -> None:
    class _LLM:
        def understand(self, text: str, language: str = "en") -> VoiceUnderstanding:
            return VoiceUnderstanding(intent="info", fallback_used=False)

    monkeypatch.setattr(agent_service, "llm", _LLM())
    monkeypatch.setattr(settings, "openai_api_key", "")
    headers = _admin_headers()
    _patch_settings(headers, agentEnabled=True)
    res = client.post(
        "/api/voice/mock/turn",
        headers=headers,
        json={"text": "hello there", "phoneFrom": "+212600777014", "language": "en"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["state"] in {"INFO", "CALL_ENDED"}
    assert body["state"] not in {"BOOK", "SEARCH", "PROPOSE", "COMMIT"}


def test_sms_success_message() -> None:
    call = call_service.start_call(direction="inbound", phone_from="+212600777015", phone_to="+212600000000")
    patient = patients_service.create(
        PatientCreate(
            firstName="Sms",
            lastName="Ok",
            dob="1991-02-02",
            gender="F",
            phone=f"+2126007{uuid4().hex[:6]}",
            email="sms.ok@demo.sihia",
            address="1 Demo",
            bloodType="A+",
            allergies=[],
        )
    )
    call.patient_id = patient.id
    call.identity_status = "verified"
    call.intent = "book"
    call.context_json = {
        "confirmationReceived": True,
        "selectedSlot": {"doctorId": "d-1", "start": f"2099-08-{(uuid4().int % 27) + 1:02d}T08:00:00+00:00", "doctorName": "Dr Test"},
    }
    call.state = "COMMIT"
    call_service.repo.update_call(call)
    reply = agent_service._commit(call, "en", [])
    assert "confirmed" in reply.lower()
    assert "sms has been sent" in reply.lower()


def test_sms_failure_does_not_cancel_appointment(monkeypatch) -> None:
    def _boom(*_args, **_kwargs):
        raise RuntimeError("sms down")

    monkeypatch.setattr("app.voice.tools.send_sms", _boom)
    call = call_service.start_call(direction="inbound", phone_from="+212600777016", phone_to="+212600000000")
    patient = patients_service.create(
        PatientCreate(
            firstName="Sms",
            lastName="Fail",
            dob="1991-03-03",
            gender="M",
            phone=f"+2126007{uuid4().hex[:6]}",
            email="sms.fail@demo.sihia",
            address="1 Demo",
            bloodType="O+",
            allergies=[],
        )
    )
    call.patient_id = patient.id
    call.identity_status = "verified"
    call.intent = "book"
    slot = f"2099-09-{(uuid4().int % 27) + 1:02d}T08:10:00+00:00"
    call.context_json = {
        "confirmationReceived": True,
        "selectedSlot": {"doctorId": "d-1", "start": slot, "doctorName": "Dr Test"},
    }
    call.state = "COMMIT"
    call_service.repo.update_call(call)
    reply = agent_service._commit(call, "en", [])
    assert "confirmed" in reply.lower()
    assert "could not send" in reply.lower()
    assert call.appointment_id
    assert call.outcome == "booked"
    events = [e.event_type for e in call_service.repo.list_events(call.id)]
    assert "sms_confirmation_failed" in events
    assert patients_service.get(patient.id) is not None
    from app.presentation.deps import appointments_service

    assert appointments_service.appointments.get(call.appointment_id) is not None


def test_outbound_answered_at_initially_null() -> None:
    headers = _admin_headers()
    _patch_settings(headers, agentEnabled=True, outboundCallsEnabled=True, quietHoursStart="", quietHoursEnd="")
    try:
        res = client.post("/api/voice/calls/outbound", headers=headers, json={"phoneTo": "+212600777020"})
        assert res.status_code == 200
        body = res.json()
        assert body["answeredAt"] is None
        assert body["status"] != "completed"
        stored = call_service.repo.get_call(body["id"])
        assert stored is not None
        assert stored.answered_at is None
    finally:
        _patch_settings(headers, outboundCallsEnabled=False)


def test_provider_status_sets_answered_at() -> None:
    headers = _admin_headers()
    _patch_settings(headers, agentEnabled=True, outboundCallsEnabled=True, quietHoursStart="", quietHoursEnd="")
    try:
        res = client.post("/api/voice/calls/outbound", headers=headers, json={"phoneTo": "+212600777021"})
        body = res.json()
        assert body["answeredAt"] is None
        status_res = client.post(
            "/webhooks/twilio/status",
            data={"CallSid": body["providerCallId"], "CallStatus": "in-progress"},
        )
        assert status_res.status_code == 200
        stored = call_service.repo.get_call(body["id"])
        assert stored is not None
        assert stored.answered_at is not None
        assert stored.status in {"answered", "active"}
    finally:
        _patch_settings(headers, outboundCallsEnabled=False)


def test_missing_twilio_signature_rejected(monkeypatch) -> None:
    monkeypatch.setattr(settings, "voice_provider_mode", "live")
    monkeypatch.setattr(settings, "twilio_auth_token", "test-token")
    res = client.post(
        "/webhooks/twilio/voice",
        data={"From": "+212600000001", "To": "+212600000000", "CallSid": "CA-missing-sig"},
    )
    assert res.status_code == 401


def test_invalid_elevenlabs_webhook_rejected(monkeypatch) -> None:
    monkeypatch.setattr(settings, "voice_provider_mode", "live")
    monkeypatch.setattr(settings, "elevenlabs_webhook_secret", "whsec")
    res = client.post(
        "/webhooks/elevenlabs/post-call",
        content=b'{"conversation_id":"x"}',
        headers={"Content-Type": "application/json", "ElevenLabs-Signature": "t=1,v0=deadbeef"},
    )
    assert res.status_code == 401


def test_valid_elevenlabs_webhook_accepted(monkeypatch) -> None:
    monkeypatch.setattr(settings, "voice_provider_mode", "live")
    monkeypatch.setattr(settings, "elevenlabs_webhook_secret", "whsec")
    raw = b'{"conversation_id":"conv-none"}'
    res = client.post(
        "/webhooks/elevenlabs/post-call",
        content=raw,
        headers={"Content-Type": "application/json", "ElevenLabs-Signature": _el_sig(raw, "whsec")},
    )
    assert res.status_code == 200


def test_tool_gateway_ignores_forged_flags(monkeypatch) -> None:
    monkeypatch.setattr(settings, "elevenlabs_tool_secret", "gateway-secret")
    call = call_service.start_call(direction="inbound", phone_from="+212600777022", phone_to="+212600000000")
    denied = client.post(
        f"/webhooks/elevenlabs/tools/create_appointment",
        headers={"X-SIHIA-Tool-Secret": "gateway-secret"},
        json={
            "callId": call.id,
            "patientVerified": True,
            "confirmationReceived": True,
            "arguments": {"doctorId": "d-1", "patientId": "p-x", "date": "2099-10-01T09:00:00+00:00"},
        },
    )
    assert denied.status_code == 200
    assert denied.json()["success"] is False
    assert denied.json()["code"] == PATIENT_NOT_VERIFIED
    unauth = client.post(
        "/webhooks/elevenlabs/tools/create_appointment",
        json={"callId": call.id, "arguments": {}},
    )
    assert unauth.status_code == 401


def test_tool_gateway_rejects_admin_jwt(monkeypatch) -> None:
    monkeypatch.setattr(settings, "elevenlabs_tool_secret", "gateway-secret")
    call = call_service.start_call(direction="inbound", phone_from="+212600777023", phone_to="+212600000000")
    res = client.post(
        "/webhooks/elevenlabs/tools/create_appointment",
        headers=_admin_headers(),
        json={"callId": call.id, "arguments": {}},
    )
    assert res.status_code == 401


def test_tool_gateway_requires_secret_in_live_mode(monkeypatch) -> None:
    monkeypatch.setattr(settings, "voice_provider_mode", "live")
    monkeypatch.setattr(settings, "elevenlabs_tool_secret", "gateway-secret")
    monkeypatch.setattr(settings, "elevenlabs_webhook_secret", "whsec")
    call = call_service.start_call(direction="inbound", phone_from="+212600777024", phone_to="+212600000000")
    raw = json.dumps({"callId": call.id, "arguments": {}}).encode("utf-8")
    denied = client.post(
        "/webhooks/elevenlabs/tools/create_appointment",
        content=raw,
        headers={"Content-Type": "application/json", "ElevenLabs-Signature": _el_sig(raw, "whsec")},
    )
    assert denied.status_code == 401
    accepted = client.post(
        "/webhooks/elevenlabs/tools/create_appointment",
        content=raw,
        headers={"Content-Type": "application/json", "X-SIHIA-Tool-Secret": "gateway-secret"},
    )
    assert accepted.status_code == 200
    assert accepted.json()["success"] is False


def test_live_provider_status_requires_phone_number_id(monkeypatch) -> None:
    monkeypatch.setattr(settings, "voice_provider_mode", "live")
    monkeypatch.setattr(settings, "elevenlabs_api_key", "sk-test")
    monkeypatch.setattr(settings, "elevenlabs_agent_id", "agent-1")
    monkeypatch.setattr(settings, "elevenlabs_phone_number_id", "")
    from app.voice.providers import voice_provider_status

    status = voice_provider_status()
    assert status["agentConfigured"] is True
    assert status["inboundConfigured"] is True
    assert status["outboundConfigured"] is False
    monkeypatch.setattr(settings, "elevenlabs_phone_number_id", "phnum-1")
    complete = voice_provider_status()
    assert complete["outboundConfigured"] is True
