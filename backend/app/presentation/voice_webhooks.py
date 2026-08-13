"""Webhooks Twilio / ElevenLabs — pas de JWT utilisateur, validation fournisseur."""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request, Response, status

from app.core.config import settings
from app.core.logging_config import log_event
from app.presentation.deps import call_service, voice_settings_service, voice_tools
from app.voice.metrics import voice_metrics
from app.voice.providers import get_voice_provider, inbound_unavailable_twiml
from app.voice.settings_service import VoiceSettingsService
from app.voice.webhook_security import (
    client_key,
    enforce_rate_limit,
    require_tool_gateway_secret,
    validate_twilio_signature,
    verify_elevenlabs_signature,
    voice_tool_gateway_limiter,
    voice_webhook_limiter,
)

logger = logging.getLogger("sihia.voice")
router = APIRouter(prefix="/webhooks", tags=["voice-webhooks"])


def _twilio_signature_required() -> bool:
    return bool(settings.twilio_auth_token.strip()) and (
        settings.voice_provider_mode == "live" or settings.environment.lower() == "production"
    )


def _elevenlabs_signature_required() -> bool:
    return settings.voice_provider_mode == "live" or settings.environment.lower() == "production"


def _validate_elevenlabs(raw: bytes, signature: str | None) -> None:
    if not _elevenlabs_signature_required():
        return
    secret = settings.elevenlabs_webhook_secret.strip()
    if not secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ElevenLabs webhook is not configured")
    verify_elevenlabs_signature(raw, signature, secret)


async def _twilio_form(request: Request) -> dict[str, Any]:
    form = dict(await request.form())
    if _twilio_signature_required():
        validate_twilio_signature(form, request)
    return form


def _parse_json(raw: bytes) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        parsed = json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


@router.post("/twilio/voice")
async def twilio_voice(request: Request):
    enforce_rate_limit(client_key(request, "twilio-voice"), voice_webhook_limiter)
    form = await _twilio_form(request)
    effective = voice_settings_service.get_effective_settings()
    if not effective.agent_enabled or not effective.inbound_enabled:
        log_event(
            logger,
            logging.INFO,
            "voice.webhook.twilio.inbound_rejected",
            agent_enabled=effective.agent_enabled,
            inbound_enabled=effective.inbound_enabled,
        )
        return Response(content=inbound_unavailable_twiml(), media_type="application/xml")
    from_number = str(form.get("From") or "unknown")
    to_number = str(form.get("To") or settings.twilio_from_number or "unknown")
    call_sid = str(form.get("CallSid") or "")
    result = get_voice_provider(call_service).handle_inbound(
        from_number=from_number,
        to_number=to_number,
        call_sid=call_sid,
    )
    log_event(logger, logging.INFO, "voice.webhook.twilio.inbound", call_id=result.call.id)
    return Response(content=result.twiml, media_type="application/xml")


@router.post("/twilio/status")
async def twilio_status(request: Request):
    enforce_rate_limit(client_key(request, "twilio-status"), voice_webhook_limiter)
    form = await _twilio_form(request)
    call_sid = str(form.get("CallSid") or "")
    twilio_status = str(form.get("CallStatus") or "")
    call = call_service.repo.get_by_provider_id(call_sid) if call_sid else None
    if call:
        call_service.apply_provider_status(call, twilio_status)
    return {"ok": True}


@router.post("/elevenlabs/init")
async def elevenlabs_init(
    request: Request,
    elevenlabs_signature: str | None = Header(default=None, alias="ElevenLabs-Signature"),
):
    enforce_rate_limit(client_key(request, "el-init"), voice_webhook_limiter)
    raw = await request.body()
    _validate_elevenlabs(raw, elevenlabs_signature)
    payload = _parse_json(raw)
    effective = voice_settings_service.get_effective_settings()
    if not effective.agent_enabled or not effective.inbound_enabled:
        return {"ok": False, "code": "VOICE_INBOUND_DISABLED"}
    call = call_service.start_call(
        direction="inbound",
        phone_from=str(payload.get("caller_id") or payload.get("from") or "unknown"),
        phone_to=str(payload.get("called_number") or payload.get("to") or settings.twilio_from_number or "unknown"),
        provider_call_id=str(payload.get("call_sid") or payload.get("conversation_id") or "") or None,
        language=payload.get("language"),
        answered=True,
    )
    if payload.get("conversation_id"):
        call.conversation_id = str(payload["conversation_id"])
        call_service.repo.update_call(call)
    return {"callId": call.id, "ok": True}


@router.post("/elevenlabs/post-call")
async def elevenlabs_post_call(
    request: Request,
    elevenlabs_signature: str | None = Header(default=None, alias="ElevenLabs-Signature"),
):
    enforce_rate_limit(client_key(request, "el-post"), voice_webhook_limiter)
    raw = await request.body()
    _validate_elevenlabs(raw, elevenlabs_signature)
    payload = _parse_json(raw)
    conversation_id = str(payload.get("conversation_id") or payload.get("data", {}).get("conversation_id") or "")
    call = None
    if conversation_id:
        for item in call_service.repo.list_calls(limit=50):
            if item.conversation_id == conversation_id or item.provider_call_id == conversation_id:
                call = item
                break
    if call:
        transcript = payload.get("transcript") or payload.get("data", {}).get("transcript") or []
        store = VoiceSettingsService(call_service.repo).get_effective_settings().store_transcripts
        if isinstance(transcript, list) and store:
            for item in transcript:
                speaker = "agent" if str(item.get("role") or item.get("speaker") or "").lower() in {"agent", "assistant"} else "patient"
                content = str(item.get("message") or item.get("content") or "")
                if content:
                    call_service.repo.add_transcript(call.id, speaker, content)
        call_service.end_call(call, status="completed", outcome=call.outcome or "info_only")
        log_event(logger, logging.INFO, "voice.webhook.elevenlabs.post_call", call_id=call.id)
    return {"ok": True}


@router.post("/elevenlabs/barge-in")
async def elevenlabs_barge_in(
    request: Request,
    elevenlabs_signature: str | None = Header(default=None, alias="ElevenLabs-Signature"),
):
    enforce_rate_limit(client_key(request, "el-barge"), voice_webhook_limiter)
    raw = await request.body()
    _validate_elevenlabs(raw, elevenlabs_signature)
    payload = _parse_json(raw)
    call_id = str(payload.get("callId") or payload.get("call_id") or "")
    if call_id:
        voice_metrics.inc("voice_barge_in_count")
        call_service.repo.add_event(call_id, "barge_in", {"source": "elevenlabs"})
    return {"ok": True}


@router.post("/elevenlabs/tools/{tool_name}")
async def elevenlabs_tool_gateway(
    tool_name: str,
    request: Request,
    elevenlabs_signature: str | None = Header(default=None, alias="ElevenLabs-Signature"),
):
    """Gateway tools ElevenLabs — auth provider, contexte serveur uniquement."""
    enforce_rate_limit(client_key(request, "el-tools"), voice_tool_gateway_limiter)
    raw = await request.body()
    if _elevenlabs_signature_required():
        _validate_elevenlabs(raw, elevenlabs_signature)
    else:
        require_tool_gateway_secret(request)
    payload = _parse_json(raw)
    call_id = str(payload.get("callId") or payload.get("call_id") or "")
    if not call_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "VALIDATION_ERROR", "message": "callId is required"},
        )
    arguments = payload.get("arguments") if isinstance(payload.get("arguments"), dict) else payload
    context = voice_tools.context_for_call(call_id)
    return voice_tools.invoke(
        tool_name,
        arguments if isinstance(arguments, dict) else {},
        call_id=call_id,
        context=context,
        action_id=str(payload.get("actionId") or payload.get("action_id") or "") or None,
    )
