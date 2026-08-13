"""Webhooks Twilio / ElevenLabs — pas de JWT utilisateur, validation fournisseur."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request, Response, status

from app.core.config import settings
from app.core.logging_config import log_event
from app.presentation.deps import call_service, voice_provider
from app.voice.metrics import voice_metrics

logger = logging.getLogger("sihia.voice")
router = APIRouter(prefix="/webhooks", tags=["voice-webhooks"])


def _twilio_enabled() -> bool:
    return bool(settings.twilio_auth_token.strip()) and settings.voice_provider_mode == "live"


async def _validate_twilio(request: Request) -> None:
    if not _twilio_enabled():
        return
    signature = request.headers.get("X-Twilio-Signature", "")
    if not signature:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Twilio signature")
    try:
        from twilio.request_validator import RequestValidator  # type: ignore[import-untyped]
    except ImportError as exc:
        raise HTTPException(status_code=500, detail="twilio package missing") from exc
    validator = RequestValidator(settings.twilio_auth_token)
    form = dict(await request.form())
    url = str(request.url)
    if not validator.validate(url, form, signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Twilio signature")


def _validate_elevenlabs(raw: bytes, signature: str | None) -> None:
    secret = settings.elevenlabs_webhook_secret.strip()
    if settings.voice_provider_mode != "live" or not secret:
        return
    if not signature:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing ElevenLabs signature")
    expected = hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
    provided = signature.split("=")[-1]
    if not hmac.compare_digest(expected, provided):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid ElevenLabs signature")


@router.post("/twilio/voice")
async def twilio_voice(request: Request):
    await _validate_twilio(request)
    form = dict(await request.form())
    from_number = str(form.get("From") or "unknown")
    to_number = str(form.get("To") or settings.twilio_from_number or "unknown")
    call_sid = str(form.get("CallSid") or "")
    result = voice_provider.handle_inbound(from_number=from_number, to_number=to_number, call_sid=call_sid)
    log_event(logger, logging.INFO, "voice.webhook.twilio.inbound", call_id=result.call.id)
    return Response(content=result.twiml, media_type="application/xml")


@router.post("/twilio/status")
async def twilio_status(request: Request):
    await _validate_twilio(request)
    form = dict(await request.form())
    call_sid = str(form.get("CallSid") or "")
    twilio_status = str(form.get("CallStatus") or "")
    call = call_service.repo.get_by_provider_id(call_sid) if call_sid else None
    if call:
        mapping = {
            "completed": "completed",
            "busy": "busy",
            "failed": "failed",
            "no-answer": "no_answer",
            "canceled": "cancelled",
            "ringing": "ringing",
            "in-progress": "active",
        }
        status_value = mapping.get(twilio_status, call.status)
        if status_value in {"completed", "failed", "busy", "no_answer", "cancelled"}:
            call_service.end_call(call, status=status_value, outcome=call.outcome)
        else:
            call.status = status_value  # type: ignore[assignment]
            call_service.repo.update_call(call)
        call_service.repo.add_event(call.id, "twilio.status", {"status": twilio_status})
    return {"ok": True}


@router.post("/elevenlabs/init")
async def elevenlabs_init(payload: dict[str, Any] | None = None):
    """Point d'entrée conversation ElevenLabs (enregistrement d'appel)."""
    data = payload or {}
    call = call_service.start_call(
        direction="inbound",
        phone_from=str(data.get("caller_id") or data.get("from") or "unknown"),
        phone_to=str(data.get("called_number") or data.get("to") or settings.twilio_from_number or "unknown"),
        provider_call_id=str(data.get("call_sid") or data.get("conversation_id") or ""),
        language=data.get("language"),
    )
    if data.get("conversation_id"):
        call.conversation_id = str(data["conversation_id"])
        call_service.repo.update_call(call)
    return {"callId": call.id, "ok": True}


@router.post("/elevenlabs/post-call")
async def elevenlabs_post_call(request: Request, elevenlabs_signature: str | None = Header(default=None, alias="ElevenLabs-Signature")):
    raw = await request.body()
    _validate_elevenlabs(raw, elevenlabs_signature)
    payload: dict[str, Any] = {}
    if raw:
        try:
            parsed = json.loads(raw.decode("utf-8"))
            if isinstance(parsed, dict):
                payload = parsed
        except json.JSONDecodeError:
            payload = {}
    conversation_id = str(payload.get("conversation_id") or payload.get("data", {}).get("conversation_id") or "")
    call = None
    if conversation_id:
        # lookup via conversation_id stored on the call
        for item in call_service.repo.list_calls(limit=50):
            if item.conversation_id == conversation_id or item.provider_call_id == conversation_id:
                call = item
                break
    if call:
        transcript = payload.get("transcript") or payload.get("data", {}).get("transcript") or []
        if isinstance(transcript, list) and settings.voice_store_transcripts:
            for item in transcript:
                speaker = "agent" if str(item.get("role") or item.get("speaker") or "").lower() in {"agent", "assistant"} else "patient"
                content = str(item.get("message") or item.get("content") or "")
                if content:
                    call_service.repo.add_transcript(call.id, speaker, content)
        call_service.end_call(call, status="completed", outcome=call.outcome or "info_only")
        log_event(logger, logging.INFO, "voice.webhook.elevenlabs.post_call", call_id=call.id)
    return {"ok": True}


@router.post("/elevenlabs/barge-in")
async def elevenlabs_barge_in(payload: dict[str, Any]):
    call_id = str(payload.get("callId") or payload.get("call_id") or "")
    if call_id:
        voice_metrics.inc("voice_barge_in_count")
        call_service.repo.add_event(call_id, "barge_in", {"source": "elevenlabs"})
    return {"ok": True}
