from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.core.config import settings
from app.infrastructure.sqlite_repositories import SQLitePatientRepository
from app.infrastructure.voice_repository import VoiceRepository
from app.voice.metrics import voice_metrics
from app.voice.models import VoiceCall
from app.voice.state import transition


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class CallService:
    def __init__(self, repo: VoiceRepository | None = None) -> None:
        self.repo = repo or VoiceRepository()
        self.patients = SQLitePatientRepository()

    def start_call(
        self,
        *,
        direction: str,
        phone_from: str,
        phone_to: str,
        provider_call_id: str | None = None,
        language: str | None = None,
        patient_id: str | None = None,
    ) -> VoiceCall:
        if provider_call_id:
            existing = self.repo.get_by_provider_id(provider_call_id)
            if existing:
                return existing
        now = _now()
        call = VoiceCall(
            id=f"vc-{uuid4().hex[:12]}",
            provider_call_id=provider_call_id,
            conversation_id=None,
            direction=direction,  # type: ignore[arg-type]
            phone_from=phone_from,
            phone_to=phone_to,
            patient_id=patient_id,
            started_at=now,
            answered_at=now,
            ended_at=None,
            duration_seconds=None,
            status="active",
            intent=None,
            outcome="in_progress",
            language=language or settings.voice_default_language,
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
