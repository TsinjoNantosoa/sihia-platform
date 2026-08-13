from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.core.config import settings
from app.infrastructure.voice_repository import VoiceRepository
from app.voice.providers import voice_provider_status


@dataclass(frozen=True)
class EffectiveVoiceSettings:
    """Comportement runtime (DB) + secrets/mode (ENV)."""

    agent_enabled: bool
    inbound_enabled: bool
    outbound_enabled: bool
    default_language: str
    supported_languages: list[str]
    max_retries: int
    silence_timeout_seconds: int
    require_confirmation: bool
    store_transcripts: bool
    store_audio: bool
    quiet_hours_start: str | None
    quiet_hours_end: str | None
    provider_mode: str
    openai_model: str
    human_transfer_configured: bool
    timezone: str


class VoiceSettingsService:
    def __init__(self, repo: VoiceRepository | None = None) -> None:
        self.repo = repo or VoiceRepository()

    def get_effective_settings(self) -> EffectiveVoiceSettings:
        row = self.repo.get_settings()
        languages_raw = row["supported_languages"] if row else settings.voice_supported_languages
        languages = [p.strip() for p in str(languages_raw).split(",") if p.strip()]
        return EffectiveVoiceSettings(
            agent_enabled=bool(row["agent_enabled"]) if row else settings.voice_ai_enabled,
            inbound_enabled=bool(row["inbound_enabled"]) if row else True,
            outbound_enabled=bool(row["outbound_enabled"]) if row else False,
            default_language=(row["default_language"] if row else settings.voice_default_language),
            supported_languages=languages or ["en"],
            max_retries=int(row["max_retries"]) if row else settings.voice_max_retries,
            silence_timeout_seconds=int(row["silence_timeout_seconds"]) if row else settings.voice_silence_timeout_seconds,
            require_confirmation=bool(row["require_confirmation"]) if row else settings.voice_confirm_mutations,
            store_transcripts=bool(row["store_transcripts"]) if row else settings.voice_store_transcripts,
            store_audio=bool(row["store_audio"]) if row else settings.voice_store_audio,
            quiet_hours_start=row.get("quiet_hours_start") if row else None,
            quiet_hours_end=row.get("quiet_hours_end") if row else None,
            provider_mode=settings.voice_provider_mode,
            openai_model=settings.openai_model,
            human_transfer_configured=bool(settings.voice_human_transfer_number.strip()),
            timezone=settings.voice_timezone,
        )

    def get(self) -> dict[str, Any]:
        effective = self.get_effective_settings()
        status = voice_provider_status()
        return {
            "agentEnabled": effective.agent_enabled,
            "inboundCallsEnabled": effective.inbound_enabled,
            "outboundCallsEnabled": effective.outbound_enabled,
            "defaultLanguage": effective.default_language,
            "supportedLanguages": effective.supported_languages,
            "humanTransferNumberConfigured": effective.human_transfer_configured,
            "quietHoursStart": effective.quiet_hours_start,
            "quietHoursEnd": effective.quiet_hours_end,
            "maxRetries": effective.max_retries,
            "silenceTimeoutSeconds": effective.silence_timeout_seconds,
            "requireConfirmation": effective.require_confirmation,
            "storeTranscripts": effective.store_transcripts,
            "storeAudio": effective.store_audio,
            "providerMode": effective.provider_mode,
            "openaiModel": effective.openai_model,
            "provider": status["provider"],
            "mode": status["mode"],
            "configured": status["configured"],
            "agentConfigured": status.get("agentConfigured"),
            "inboundConfigured": status.get("inboundConfigured"),
            "outboundConfigured": status.get("outboundConfigured"),
            "timezone": effective.timezone,
        }

    def update(self, payload: dict[str, Any]) -> dict[str, Any]:
        mapping = {
            "agentEnabled": "agent_enabled",
            "inboundCallsEnabled": "inbound_enabled",
            "outboundCallsEnabled": "outbound_enabled",
            "defaultLanguage": "default_language",
            "supportedLanguages": "supported_languages",
            "quietHoursStart": "quiet_hours_start",
            "quietHoursEnd": "quiet_hours_end",
            "maxRetries": "max_retries",
            "silenceTimeoutSeconds": "silence_timeout_seconds",
            "requireConfirmation": "require_confirmation",
            "storeTranscripts": "store_transcripts",
            "storeAudio": "store_audio",
        }
        values: dict[str, Any] = {}
        for key, column in mapping.items():
            if key not in payload or payload[key] is None:
                continue
            value = payload[key]
            if key == "supportedLanguages" and isinstance(value, list):
                values[column] = ",".join(str(v) for v in value)
            elif isinstance(value, bool):
                values[column] = 1 if value else 0
            else:
                values[column] = value
        if values:
            self.repo.upsert_settings(values)
        return self.get()
