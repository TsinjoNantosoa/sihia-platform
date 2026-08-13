"""GPT-4o-mini pour NLU Voice — jamais source de vérité métier."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any

import httpx

from app.core.config import settings
from app.core.logging_config import log_event
from app.voice.prompts import system_prompt

logger = logging.getLogger("sihia.voice")

_ALLOWED_INTENTS = {"book", "reschedule", "cancel", "info", "human", "unknown"}


@dataclass
class VoiceUnderstanding:
    intent: str | None = None
    specialty: str | None = None
    last_name: str | None = None
    confirmation: str | None = None
    fallback_used: bool = True
    raw: dict[str, Any] = field(default_factory=dict)


class VoiceLLMService:
    """Client OpenAI minimal, mockable. Réutilise OPENAI_* du projet."""

    def __init__(self, *, timeout_s: float = 8.0) -> None:
        self.timeout_s = timeout_s

    def understand(self, text: str, language: str = "en") -> VoiceUnderstanding:
        if not settings.openai_api_key.strip():
            return VoiceUnderstanding(fallback_used=True)
        payload = {
            "model": settings.openai_model or "gpt-4o-mini",
            "temperature": 0,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": (
                        system_prompt()
                        + "\nReturn JSON only with keys: intent, specialty, last_name, confirmation."
                        + " intent must be one of: book, reschedule, cancel, info, human, unknown."
                        + " confirmation must be yes, no, or unknown."
                        + " Do not decide whether an appointment succeeded."
                    ),
                },
                {"role": "user", "content": f"language={language}\nutterance={text}"},
            ],
        }
        url = f"{settings.openai_base_url.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json",
        }
        try:
            with httpx.Client(timeout=self.timeout_s) as client:
                response = client.post(url, headers=headers, json=payload)
                if response.status_code in {429, 500, 502, 503, 504}:
                    log_event(logger, logging.WARNING, "voice.llm.fallback", fallback_used=True, reason=response.status_code)
                    return VoiceUnderstanding(fallback_used=True)
                response.raise_for_status()
                body = response.json()
            content = body.get("choices", [{}])[0].get("message", {}).get("content") or "{}"
            parsed = json.loads(content)
            if not isinstance(parsed, dict):
                raise ValueError("invalid structured output")
            intent = str(parsed.get("intent") or "unknown").strip().lower()
            if intent not in _ALLOWED_INTENTS:
                intent = "unknown"
            confirmation = str(parsed.get("confirmation") or "unknown").strip().lower()
            if confirmation not in {"yes", "no", "unknown"}:
                confirmation = "unknown"
            return VoiceUnderstanding(
                intent=None if intent == "unknown" else intent,
                specialty=(str(parsed.get("specialty") or "").strip() or None),
                last_name=(str(parsed.get("last_name") or "").strip() or None),
                confirmation=confirmation,
                fallback_used=False,
                raw={"intent": intent},
            )
        except (httpx.TimeoutException, httpx.NetworkError, httpx.HTTPError, json.JSONDecodeError, ValueError, KeyError) as exc:
            log_event(
                logger,
                logging.WARNING,
                "voice.llm.fallback",
                fallback_used=True,
                reason=type(exc).__name__,
            )
            return VoiceUnderstanding(fallback_used=True)
