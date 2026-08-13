from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.config import settings
from app.presentation.deps import agent_service, call_service, require_permission, voice_settings_service, voice_tools
from app.voice.errors import VOICE_AGENT_DISABLED
from app.voice.providers import get_voice_provider
from app.voice.schemas import (
    EscalateRequest,
    MockTurnRequest,
    OutboundCallRequest,
    ToolInvokeRequest,
    VoiceSettingsUpdate,
)

router = APIRouter(prefix="/api/voice", tags=["voice"])


def _require_agent_enabled() -> None:
    if not voice_settings_service.get_effective_settings().agent_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": VOICE_AGENT_DISABLED, "message": "Voice AI is disabled", "retryable": False},
        )


@router.get("/stats")
def voice_stats(_claims: dict = Depends(require_permission("voice:read"))):
    day = datetime.now(timezone.utc).date().isoformat()
    body = call_service.repo.stats_today(day)
    body["demoNotice"] = "Demo environment — synthetic patient data only."
    return body


@router.get("/calls")
def list_calls(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    _claims: dict = Depends(require_permission("voice:read")),
):
    calls = [call_service.serialize(c) for c in call_service.repo.list_calls(limit=limit, offset=offset)]
    return {"items": calls, "count": len(calls), "demoNotice": "Demo environment — synthetic patient data only."}


@router.get("/calls/{call_id}")
def get_call(call_id: str, _claims: dict = Depends(require_permission("voice:read"))):
    detail = call_service.detail(call_id)
    if detail is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appel introuvable")
    return detail


@router.post("/calls/outbound")
def start_outbound(payload: OutboundCallRequest, _claims: dict = Depends(require_permission("voice:update"))):
    provider = get_voice_provider(call_service)
    return call_service.create_outbound_call(
        phone_to=payload.phoneTo,
        language=payload.language,
        provider=provider,
        patient_id=payload.patientId,
    )


@router.post("/calls/{call_id}/escalate")
def escalate_call(
    call_id: str,
    payload: EscalateRequest,
    _claims: dict = Depends(require_permission("voice:update")),
):
    call = call_service.repo.get_call(call_id)
    if call is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appel introuvable")
    result = voice_tools.invoke(
        "escalate_to_human",
        {"reason": payload.reason},
        call_id=call_id,
    )
    if result.get("success"):
        call.escalated = True
        call.escalation_reason = payload.reason
        call.outcome = "escalated"
        call_service.end_call(call, outcome="escalated")
    return result


@router.get("/settings")
def get_settings(_claims: dict = Depends(require_permission("voice:read"))):
    return voice_settings_service.get()


@router.patch("/settings")
def update_settings(
    payload: VoiceSettingsUpdate,
    _claims: dict = Depends(require_permission("voice:update")),
):
    return voice_settings_service.update(payload.model_dump(exclude_unset=True))


@router.post("/tools/invoke")
def invoke_tool(payload: ToolInvokeRequest, _claims: dict = Depends(require_permission("voice:update"))):
    """Exécution contrôlée d'un tool (ElevenLabs / simulateur)."""
    _require_agent_enabled()
    context = voice_tools.context_for_call(payload.callId)
    return voice_tools.invoke(
        payload.toolName,
        payload.arguments,
        call_id=payload.callId,
        context=context,
        idempotency_key=payload.idempotencyKey,
        action_id=payload.actionId,
    )


@router.post("/mock/turn")
def mock_turn(payload: MockTurnRequest, _claims: dict = Depends(require_permission("voice:update"))):
    if settings.environment.lower() == "production" and settings.voice_provider_mode != "mock":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    _require_agent_enabled()
    call = call_service.repo.get_call(payload.callId) if payload.callId else None
    return agent_service.handle_turn(
        text=payload.text,
        call=call,
        phone_from=payload.phoneFrom,
        language=payload.language,
        barge_in=payload.bargeIn,
    )
