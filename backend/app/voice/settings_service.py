from __future__ import annotations

from typing import Any

from app.core.config import settings
from app.infrastructure.voice_repository import VoiceRepository


class VoiceSettingsService:
    def __init__(self, repo: VoiceRepository | None = None) -> None:
        self.repo = repo or VoiceRepository()

    def get(self) -> dict[str, Any]:
        row = self.repo.get_settings()
        languages = (row["supported_languages"] if row else settings.voice_supported_languages).split(",")
        return {
            "agentEnabled": bool(row["agent_enabled"]) if row else settings.voice_ai_enabled,
            "inboundCallsEnabled": bool(row["inbound_enabled"]) if row else True,
            "outboundCallsEnabled": bool(row["outbound_enabled"]) if row else False,
            "defaultLanguage": (row["default_language"] if row else settings.voice_default_language),
            "supportedLanguages": [p.strip() for p in languages if p.strip()],
            "humanTransferNumberConfigured": bool(settings.voice_human_transfer_number.strip()),
            "quietHoursStart": row.get("quiet_hours_start") if row else None,
            "quietHoursEnd": row.get("quiet_hours_end") if row else None,
            "maxRetries": int(row["max_retries"]) if row else settings.voice_max_retries,
            "silenceTimeoutSeconds": int(row["silence_timeout_seconds"]) if row else settings.voice_silence_timeout_seconds,
            "requireConfirmation": bool(row["require_confirmation"]) if row else settings.voice_confirm_mutations,
            "storeTranscripts": bool(row["store_transcripts"]) if row else settings.voice_store_transcripts,
            "storeAudio": bool(row["store_audio"]) if row else settings.voice_store_audio,
            "providerMode": settings.voice_provider_mode,
            "openaiModel": settings.openai_model,
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
