from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal


VoiceDirection = Literal["inbound", "outbound"]
VoiceCallStatus = Literal[
    "initiated",
    "ringing",
    "active",
    "completed",
    "failed",
    "no_answer",
    "busy",
    "cancelled",
]
VoiceOutcome = Literal[
    "booked",
    "rescheduled",
    "cancelled",
    "info_only",
    "escalated",
    "failed",
    "abandoned",
    "in_progress",
]
VoiceSpeaker = Literal["agent", "patient", "system"]
IdentityStatus = Literal["unverified", "partial", "verified", "failed"]


@dataclass
class VoiceCall:
    id: str
    provider_call_id: str | None
    conversation_id: str | None
    direction: VoiceDirection
    phone_from: str
    phone_to: str
    patient_id: str | None
    started_at: str
    answered_at: str | None
    ended_at: str | None
    duration_seconds: int | None
    status: VoiceCallStatus
    intent: str | None
    outcome: str | None
    language: str
    escalated: bool
    escalation_reason: str | None
    appointment_id: str | None
    created_at: str
    state: str = "CALL_STARTED"
    identity_status: IdentityStatus = "unverified"
    context_json: dict[str, Any] = field(default_factory=dict)


@dataclass
class VoiceEvent:
    id: str
    call_id: str
    event_type: str
    timestamp: str
    payload_json: dict[str, Any]


@dataclass
class VoiceToolCall:
    id: str
    call_id: str
    tool_name: str
    arguments_json: dict[str, Any]
    result_json: dict[str, Any]
    success: bool
    error_code: str | None
    duration_ms: int
    created_at: str


@dataclass
class VoiceTranscriptSegment:
    id: str
    call_id: str
    speaker: VoiceSpeaker
    content: str
    started_at: str | None
    ended_at: str | None
    sequence_number: int
