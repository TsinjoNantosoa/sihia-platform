"""Abstraction fournisseurs voix — mock local vs ElevenLabs/Twilio live."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from app.core.config import settings
from app.voice.call_service import CallService
from app.voice.models import VoiceCall


@dataclass
class InboundResult:
    call: VoiceCall
    twiml: str


class VoiceProvider(Protocol):
    def handle_inbound(self, *, from_number: str, to_number: str, call_sid: str) -> InboundResult: ...
    def handle_outbound(self, *, to_number: str, language: str | None) -> InboundResult: ...


class MockVoiceProvider:
    def __init__(self, calls: CallService) -> None:
        self.calls = calls

    def handle_inbound(self, *, from_number: str, to_number: str, call_sid: str) -> InboundResult:
        call = self.calls.start_call(
            direction="inbound",
            phone_from=from_number,
            phone_to=to_number,
            provider_call_id=call_sid,
        )
        message = (
            "SIHIA Voice AI mock mode. Use the dashboard simulator. Synthetic data only."
        )
        twiml = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            f"<Response><Say voice=\"alice\">{message}</Say></Response>"
        )
        return InboundResult(call=call, twiml=twiml)

    def handle_outbound(self, *, to_number: str, language: str | None) -> InboundResult:
        call = self.calls.start_call(
            direction="outbound",
            phone_from=settings.twilio_from_number or "mock",
            phone_to=to_number,
            language=language,
        )
        twiml = '<?xml version="1.0" encoding="UTF-8"?><Response><Say>SIHIA outbound mock.</Say></Response>'
        return InboundResult(call=call, twiml=twiml)


class ElevenLabsVoiceProvider:
    def __init__(self, calls: CallService) -> None:
        self.calls = calls

    def handle_inbound(self, *, from_number: str, to_number: str, call_sid: str) -> InboundResult:
        call = self.calls.start_call(
            direction="inbound",
            phone_from=from_number,
            phone_to=to_number,
            provider_call_id=call_sid,
        )
        agent_id = settings.elevenlabs_agent_id.strip()
        if not agent_id:
            twiml = (
                '<?xml version="1.0" encoding="UTF-8"?>'
                "<Response><Say>SIHIA Voice AI is not fully configured.</Say></Response>"
            )
            return InboundResult(call=call, twiml=twiml)
        stream_url = (
            f"wss://api.elevenlabs.io/v1/convai/conversation"
            f"?agent_id={agent_id}"
        )
        twiml = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            "<Response><Connect><Stream url=\""
            f"{stream_url}"
            "\"/></Connect></Response>"
        )
        return InboundResult(call=call, twiml=twiml)

    def handle_outbound(self, *, to_number: str, language: str | None) -> InboundResult:
        call = self.calls.start_call(
            direction="outbound",
            phone_from=settings.twilio_from_number or "",
            phone_to=to_number,
            language=language,
        )
        return self.handle_inbound(
            from_number=settings.twilio_from_number or "",
            to_number=to_number,
            call_sid=call.provider_call_id or call.id,
        )


def get_voice_provider(calls: CallService) -> MockVoiceProvider | ElevenLabsVoiceProvider:
    if settings.voice_provider_mode == "live":
        return ElevenLabsVoiceProvider(calls)
    return MockVoiceProvider(calls)
