"""Contexte d'exécution Voice — source de vérité serveur, jamais le LLM."""

from __future__ import annotations

from dataclasses import dataclass

from app.voice.models import VoiceCall


@dataclass(frozen=True)
class VoiceExecutionContext:
    call_id: str
    patient_id: str | None
    patient_verified: bool
    confirmation_received: bool
    current_state: str

    @classmethod
    def from_call(cls, call: VoiceCall) -> VoiceExecutionContext:
        confirmed = bool(call.context_json.get("confirmationReceived")) or call.state in {
            "COMMIT",
            "SEND_CONFIRMATION",
        }
        return cls(
            call_id=call.id,
            patient_id=call.patient_id,
            patient_verified=call.identity_status == "verified",
            confirmation_received=confirmed,
            current_state=call.state,
        )

    @classmethod
    def anonymous(cls, call_id: str) -> VoiceExecutionContext:
        return cls(
            call_id=call_id,
            patient_id=None,
            patient_verified=False,
            confirmation_received=False,
            current_state="CALL_STARTED",
        )
