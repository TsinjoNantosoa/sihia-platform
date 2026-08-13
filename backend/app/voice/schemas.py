from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class VoiceToolEnvelope(BaseModel):
    success: bool
    data: dict[str, Any] | list[Any] | None = None
    code: str | None = None
    message: str | None = None
    retryable: bool | None = None
    details: dict[str, Any] | None = None


class VoiceCallListItem(BaseModel):
    id: str
    providerCallId: str | None = None
    conversationId: str | None = None
    direction: str
    phoneFrom: str
    phoneTo: str
    patientId: str | None = None
    patientName: str | None = None
    startedAt: str
    endedAt: str | None = None
    durationSeconds: int | None = None
    status: str
    intent: str | None = None
    outcome: str | None = None
    language: str
    escalated: bool
    appointmentId: str | None = None


class VoiceEventOut(BaseModel):
    id: str
    eventType: str
    timestamp: str
    payload: dict[str, Any] = Field(default_factory=dict)


class VoiceToolCallOut(BaseModel):
    id: str
    toolName: str
    arguments: dict[str, Any] = Field(default_factory=dict)
    result: dict[str, Any] = Field(default_factory=dict)
    success: bool
    errorCode: str | None = None
    durationMs: int
    createdAt: str


class VoiceTranscriptOut(BaseModel):
    id: str
    speaker: str
    content: str
    startedAt: str | None = None
    endedAt: str | None = None
    sequenceNumber: int


class VoiceCallDetail(VoiceCallListItem):
    answeredAt: str | None = None
    escalationReason: str | None = None
    state: str
    identityStatus: str
    events: list[VoiceEventOut] = Field(default_factory=list)
    toolCalls: list[VoiceToolCallOut] = Field(default_factory=list)
    transcript: list[VoiceTranscriptOut] = Field(default_factory=list)


class VoiceStatsOut(BaseModel):
    callsToday: int
    completedCalls: int
    appointmentsBooked: int
    appointmentsRescheduled: int
    appointmentsCancelled: int
    humanEscalations: int
    failedCalls: int
    averageCallDuration: float
    averageToolLatency: float
    demoNotice: str = "Demo environment — synthetic patient data only."


class VoiceSettingsOut(BaseModel):
    agentEnabled: bool
    inboundCallsEnabled: bool
    outboundCallsEnabled: bool
    defaultLanguage: str
    supportedLanguages: list[str]
    humanTransferNumberConfigured: bool
    quietHoursStart: str | None = None
    quietHoursEnd: str | None = None
    maxRetries: int
    silenceTimeoutSeconds: int
    requireConfirmation: bool
    storeTranscripts: bool
    storeAudio: bool
    providerMode: str
    openaiModel: str
    provider: str | None = None
    mode: str | None = None
    configured: bool | None = None
    agentConfigured: bool | None = None
    inboundConfigured: bool | None = None
    outboundConfigured: bool | None = None


class VoiceSettingsUpdate(BaseModel):
    agentEnabled: bool | None = None
    inboundCallsEnabled: bool | None = None
    outboundCallsEnabled: bool | None = None
    defaultLanguage: str | None = None
    supportedLanguages: list[str] | None = None
    quietHoursStart: str | None = None
    quietHoursEnd: str | None = None
    maxRetries: int | None = Field(default=None, ge=0, le=5)
    silenceTimeoutSeconds: int | None = Field(default=None, ge=3, le=30)
    requireConfirmation: bool | None = None
    storeTranscripts: bool | None = None
    storeAudio: bool | None = None


class OutboundCallRequest(BaseModel):
    phoneTo: str = Field(min_length=6, max_length=20)
    language: str | None = None
    patientId: str | None = None


class EscalateRequest(BaseModel):
    reason: str = Field(default="operator_request", max_length=200)


class MockTurnRequest(BaseModel):
    callId: str | None = None
    text: str = Field(min_length=1, max_length=1000)
    language: str | None = None
    phoneFrom: str | None = None
    bargeIn: bool = False


class MockTurnResponse(BaseModel):
    callId: str
    state: str
    reply: str
    toolResults: list[dict[str, Any]] = Field(default_factory=list)
    ended: bool = False
    outcome: str | None = None


class ToolInvokeRequest(BaseModel):
    """Appel tool ElevenLabs / simulateur — jamais une écriture SQL directe."""

    callId: str
    toolName: str
    arguments: dict[str, Any] = Field(default_factory=dict)
    patientVerified: bool = False
    confirmationReceived: bool = False
    idempotencyKey: str | None = None
    actionId: str | None = None
