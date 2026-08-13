"""Abstraction fournisseurs voix — mock local vs ElevenLabs (live non simulé)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from app.core.config import settings
from app.voice.models import VoiceCall


@dataclass
class InboundResult:
    call: VoiceCall
    twiml: str


@dataclass
class OutboundProviderResult:
    ok: bool
    status: str  # queued | initiated | failed
    provider_call_id: str | None = None
    error: str | None = None
    message: str | None = None


class CallStarter(Protocol):
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
    ) -> VoiceCall: ...


def voice_provider_status() -> dict[str, bool | str]:
    mode = (settings.voice_provider_mode or "mock").strip().lower()
    if mode == "live":
        configured = bool(settings.elevenlabs_api_key.strip() and settings.elevenlabs_agent_id.strip())
        return {"provider": "elevenlabs", "mode": "live", "configured": configured}
    return {"provider": "mock", "mode": "mock", "configured": True}


class VoiceProvider(Protocol):
    name: str

    def is_configured(self) -> bool: ...
    def handle_inbound(self, *, from_number: str, to_number: str, call_sid: str) -> InboundResult: ...
    def start_outbound_call(
        self,
        *,
        call: VoiceCall,
        to_number: str,
        language: str | None,
    ) -> OutboundProviderResult: ...


def _twiml_say(message: str) -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        f"<Response><Say voice=\"alice\">{message}</Say></Response>"
    )


class MockVoiceProvider:
    name = "mock"

    def __init__(self, calls: CallStarter) -> None:
        self.calls = calls

    def is_configured(self) -> bool:
        return True

    def handle_inbound(self, *, from_number: str, to_number: str, call_sid: str) -> InboundResult:
        call = self.calls.start_call(
            direction="inbound",
            phone_from=from_number,
            phone_to=to_number,
            provider_call_id=call_sid or None,
        )
        return InboundResult(
            call=call,
            twiml=_twiml_say("SIHIA Voice AI mock mode. Use the dashboard simulator. Synthetic data only."),
        )

    def start_outbound_call(
        self,
        *,
        call: VoiceCall,
        to_number: str,
        language: str | None,
    ) -> OutboundProviderResult:
        return OutboundProviderResult(
            ok=True,
            status="queued",
            provider_call_id=f"mock-out-{call.id}",
            message="Mock outbound queued. No PSTN call is placed.",
        )


class ElevenLabsVoiceProvider:
    """Live provider. Pas d'URL websocket artisanale, pas de succès PSTN simulé."""

    name = "elevenlabs"

    def __init__(self, calls: CallStarter) -> None:
        self.calls = calls

    def is_configured(self) -> bool:
        return bool(settings.elevenlabs_api_key.strip() and settings.elevenlabs_agent_id.strip())

    def handle_inbound(self, *, from_number: str, to_number: str, call_sid: str) -> InboundResult:
        call = self.calls.start_call(
            direction="inbound",
            phone_from=from_number,
            phone_to=to_number,
            provider_call_id=call_sid or None,
        )
        if not self.is_configured():
            return InboundResult(call=call, twiml=_twiml_say("SIHIA Voice AI is not configured."))
        return InboundResult(
            call=call,
            twiml=_twiml_say("SIHIA live voice bridge is not enabled yet."),
        )

    def start_outbound_call(
        self,
        *,
        call: VoiceCall,
        to_number: str,
        language: str | None,
    ) -> OutboundProviderResult:
        if not self.is_configured():
            return OutboundProviderResult(
                ok=False,
                status="failed",
                error="VOICE_PROVIDER_NOT_CONFIGURED",
                message="ElevenLabs credentials are missing.",
            )
        return OutboundProviderResult(
            ok=False,
            status="failed",
            error="VOICE_OUTBOUND_NOT_IMPLEMENTED",
            message="Live PSTN outbound is not wired yet.",
        )


def get_voice_provider(calls: CallStarter) -> MockVoiceProvider | ElevenLabsVoiceProvider:
    if (settings.voice_provider_mode or "mock").strip().lower() == "live":
        return ElevenLabsVoiceProvider(calls)
    return MockVoiceProvider(calls)
