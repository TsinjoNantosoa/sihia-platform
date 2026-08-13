from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Protocol
from uuid import uuid4

from fastapi import HTTPException, status

from app.core.config import settings
from app.infrastructure.notification_channels import normalize_phone
from app.infrastructure.sqlite_repositories import SQLitePatientRepository
from app.infrastructure.voice_repository import VoiceRepository
from app.voice.errors import (
    VOICE_AGENT_DISABLED,
    VOICE_OUTBOUND_DISABLED,
    VOICE_PROVIDER_NOT_CONFIGURED,
    VOICE_QUIET_HOURS,
)
from app.voice.metrics import voice_metrics
from app.voice.models import VoiceCall
from app.voice.quiet_hours import is_within_quiet_hours
from app.voice.settings_service import VoiceSettingsService
from app.voice.state import transition


class _OutboundProvider(Protocol):
    def is_configured(self) -> bool: ...
    def start_outbound_call(
        self,
        *,
        call: VoiceCall,
        to_number: str,
        language: str | None,
    ) -> Any: ...


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


_TERMINAL_STATUS = {"completed", "failed", "busy", "no_answer", "cancelled"}
_ANSWERED_STATUS = {"answered", "active"}


class CallService:
    def __init__(
        self,
        repo: VoiceRepository | None = None,
        settings_svc: VoiceSettingsService | None = None,
    ) -> None:
        self.repo = repo or VoiceRepository()
        self.patients = SQLitePatientRepository()
        self.settings_svc = settings_svc or VoiceSettingsService(self.repo)

    def start_call(
        self,
        *,
        direction: str,
        phone_from: str,
        phone_to: str,
        provider_call_id: str | None = None,
        language: str | None = None,
        patient_id: str | None = None,
        status: str = "active",
        answered: bool | None = None,
    ) -> VoiceCall:
        if provider_call_id:
            existing = self.repo.get_by_provider_id(provider_call_id)
            if existing:
                return existing
        now = _now()
        if answered is None:
            answered = direction != "outbound"
        call = VoiceCall(
            id=f"vc-{uuid4().hex[:12]}",
            provider_call_id=provider_call_id,
            conversation_id=None,
            direction=direction,  # type: ignore[arg-type]
            phone_from=phone_from,
            phone_to=phone_to,
            patient_id=patient_id,
            started_at=now,
            answered_at=now if answered else None,
            ended_at=None,
            duration_seconds=None,
            status=status,  # type: ignore[arg-type]
            intent=None,
            outcome="in_progress",
            language=language or self.settings_svc.get_effective_settings().default_language,
            escalated=False,
            escalation_reason=None,
            appointment_id=None,
            created_at=now,
            state="CALL_STARTED",
            identity_status="unverified",
            context_json={"silenceRetries": 0},
        )
        self.repo.create_call(call)
        self.repo.add_event(call.id, "call.started", {"direction": direction})
        voice_metrics.inc("voice_calls_total")
        return call

    def create_outbound_call(
        self,
        *,
        phone_to: str,
        language: str | None,
        provider: _OutboundProvider,
        patient_id: str | None = None,
    ) -> dict[str, Any]:
        effective = self.settings_svc.get_effective_settings()
        if not effective.agent_enabled:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={"code": VOICE_AGENT_DISABLED, "message": "Voice AI is disabled", "retryable": False},
            )
        if not effective.outbound_enabled:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": VOICE_OUTBOUND_DISABLED, "message": "Outbound calls are disabled", "retryable": False},
            )
        if not provider.is_configured():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "code": VOICE_PROVIDER_NOT_CONFIGURED,
                    "message": "Voice provider is not configured",
                    "retryable": False,
                },
            )
        if is_within_quiet_hours(
            start=effective.quiet_hours_start,
            end=effective.quiet_hours_end,
            timezone_name=effective.timezone,
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": VOICE_QUIET_HOURS, "message": "Outbound calls are not allowed during quiet hours", "retryable": False},
            )
        phone = normalize_phone(phone_to) or (phone_to.strip() if phone_to.startswith("+") else "")
        if not phone or len(phone) < 8:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"code": "INVALID_PHONE", "message": "Invalid destination phone number", "retryable": False},
            )

        call = self.start_call(
            direction="outbound",
            phone_from=settings.twilio_from_number or "mock",
            phone_to=phone,
            language=language or effective.default_language,
            patient_id=patient_id,
            status="initiated",
            answered=False,
        )
        result = provider.start_outbound_call(call=call, to_number=phone, language=language)
        if getattr(result, "provider_call_id", None):
            call.provider_call_id = result.provider_call_id
        allowed = {"queued", "initiated", "failed"}
        call.status = result.status if result.status in allowed else ("initiated" if result.ok else "failed")  # type: ignore[assignment]
        if not result.ok:
            call.outcome = "failed"
        self.repo.update_call(call)
        self.repo.add_event(
            call.id,
            "outbound.provider",
            {"ok": bool(result.ok), "status": result.status, "error": getattr(result, "error", None)},
        )
        body = self.serialize(call)
        body["status"] = call.status
        body["providerError"] = getattr(result, "error", None)
        body["message"] = getattr(result, "message", None)
        return body

    def apply_provider_status(self, call: VoiceCall, provider_status: str) -> VoiceCall:
        mapping = {
            "queued": "queued",
            "initiated": "initiated",
            "ringing": "ringing",
            "answered": "answered",
            "in-progress": "active",
            "in_progress": "active",
            "completed": "completed",
            "busy": "busy",
            "failed": "failed",
            "no-answer": "no_answer",
            "no_answer": "no_answer",
            "canceled": "cancelled",
            "cancelled": "cancelled",
        }
        status_value = mapping.get(provider_status, call.status)
        if status_value in _ANSWERED_STATUS and not call.answered_at:
            call.answered_at = _now()
            call.status = status_value  # type: ignore[assignment]
            self.repo.update_call(call)
            self.repo.add_event(call.id, "call.answered", {"status": status_value})
        elif status_value in _TERMINAL_STATUS:
            self.end_call(call, status=status_value, outcome=call.outcome)
        else:
            call.status = status_value  # type: ignore[assignment]
            self.repo.update_call(call)
        self.repo.add_event(call.id, "twilio.status", {"status": provider_status})
        return call

    def set_state(self, call: VoiceCall, target: str, **payload: Any) -> VoiceCall:
        call.state = transition(call.state, target)
        if payload:
            call.context_json = {**call.context_json, **payload}
        self.repo.update_call(call)
        self.repo.add_event(call.id, f"state.{target.lower()}", payload)
        return call

    def end_call(self, call: VoiceCall, *, status: str = "completed", outcome: str | None = None) -> VoiceCall:
        call.status = status  # type: ignore[assignment]
        call.ended_at = _now()
        started = datetime.fromisoformat(call.started_at.replace("Z", "+00:00"))
        ended = datetime.fromisoformat(call.ended_at.replace("Z", "+00:00"))
        call.duration_seconds = max(int((ended - started).total_seconds()), 0)
        if outcome:
            call.outcome = outcome
        if call.state not in {"CALL_ENDED", "END"}:
            try:
                call.state = transition(call.state, "END")
            except ValueError:
                call.state = "CALL_ENDED"
            else:
                call.state = "CALL_ENDED"
        self.repo.update_call(call)
        self.repo.add_event(call.id, "call.ended", {"outcome": call.outcome, "status": status})
        voice_metrics.inc("voice_calls_completed")
        voice_metrics.observe_duration(call.duration_seconds or 0)
        return call

    def serialize(self, call: VoiceCall) -> dict[str, Any]:
        patient_name = None
        if call.patient_id:
            patient = self.patients.get(call.patient_id)
            if patient:
                patient_name = f"{patient.first_name} {patient.last_name}"
        return {
            "id": call.id,
            "providerCallId": call.provider_call_id,
            "conversationId": call.conversation_id,
            "direction": call.direction,
            "phoneFrom": call.phone_from,
            "phoneTo": call.phone_to,
            "patientId": call.patient_id,
            "patientName": patient_name,
            "startedAt": call.started_at,
            "answeredAt": call.answered_at,
            "endedAt": call.ended_at,
            "durationSeconds": call.duration_seconds,
            "status": call.status,
            "intent": call.intent,
            "outcome": call.outcome,
            "language": call.language,
            "escalated": call.escalated,
            "escalationReason": call.escalation_reason,
            "appointmentId": call.appointment_id,
            "state": call.state,
            "identityStatus": call.identity_status,
        }

    def detail(self, call_id: str) -> dict[str, Any] | None:
        call = self.repo.get_call(call_id)
        if call is None:
            return None
        body = self.serialize(call)
        body["events"] = [
            {
                "id": e.id,
                "eventType": e.event_type,
                "timestamp": e.timestamp,
                "payload": e.payload_json,
            }
            for e in self.repo.list_events(call_id)
        ]
        body["toolCalls"] = [
            {
                "id": t.id,
                "toolName": t.tool_name,
                "arguments": t.arguments_json,
                "result": t.result_json,
                "success": t.success,
                "errorCode": t.error_code,
                "durationMs": t.duration_ms,
                "createdAt": t.created_at,
            }
            for t in self.repo.list_tool_calls(call_id)
        ]
        body["transcript"] = [
            {
                "id": s.id,
                "speaker": s.speaker,
                "content": s.content,
                "startedAt": s.started_at,
                "endedAt": s.ended_at,
                "sequenceNumber": s.sequence_number,
            }
            for s in self.repo.list_transcript(call_id)
        ]
        return body
