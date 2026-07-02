from __future__ import annotations

import json
import os
import re
import uuid
from collections.abc import AsyncIterator, Iterator
from pathlib import Path
from typing import Any

import httpx

from app.application.chatbot_guardrails import GuardrailResult, evaluate_guardrails
from app.core.config import Settings
from app.infrastructure.chatbot_audit import append_chat_audit
from app.infrastructure.chatbot_session_store import ChatbotSessionStore

_DISCLAIMER_FR = (
    "<p><em>Assistant d'information SIH IA — ne remplace pas un avis médical. "
    "En urgence : 15 / 112.</em></p>"
)
_DISCLAIMER_EN = (
    "<p><em>SIH IA information assistant — not a substitute for medical advice. "
    "Emergency: 15 / 112.</em></p>"
)

_UI_CONFIG: dict[str, dict[str, str]] = {
    "sihia": {
        "bot_name": "SIH IA Assistant",
        "logo_url": "/static/logos/sihia-bot.svg",
        "primary_color": "#0d6e6e",
        "welcome_fr": (
            "Bonjour ! Je suis l'assistant SIH IA. "
            "Je peux vous orienter (rendez-vous, services, horaires). "
            "Je ne pose pas de diagnostic."
        ),
        "welcome_en": (
            "Hello! I'm the SIH IA assistant. "
            "I can guide you (appointments, services, hours). "
            "I do not provide diagnosis."
        ),
    },
}


class ChatbotService:
    def __init__(self, settings: Settings, sessions: ChatbotSessionStore) -> None:
        self.settings = settings
        self.sessions = sessions
        self._knowledge = self._load_knowledge()

    def _load_knowledge(self) -> list[dict[str, Any]]:
        path = Path(__file__).resolve().parents[2] / "data" / "chatbot_knowledge.json"
        if not path.exists():
            return []
        return json.loads(path.read_text(encoding="utf-8"))

    def get_ui_config(self, client_id: str) -> dict[str, str]:
        slug = (client_id or "sihia").strip().lower()
        return _UI_CONFIG.get(slug, _UI_CONFIG["sihia"])

    def get_history(self, session_id: str) -> list[dict[str, Any]]:
        return self.sessions.get_messages(session_id)

    def _retrieve_context(self, query: str, lang: str) -> tuple[str, list[str]]:
        words = {w for w in re.findall(r"\w+", query.lower()) if len(w) > 2}
        scored: list[tuple[int, dict[str, Any]]] = []
        for entry in self._knowledge:
            topics = entry.get("topics", [])
            score = sum(1 for t in topics if t.lower() in query.lower() or t.lower() in words)
            if score:
                scored.append((score, entry))
        scored.sort(key=lambda x: x[0], reverse=True)
        top = [e for _, e in scored[:3]]
        sources: list[str] = []
        chunks: list[str] = []
        key = "en" if lang.startswith("en") else "fr"
        for entry in top:
            sources.append(str(entry.get("id", "kb")))
            chunks.append(re.sub(r"<[^>]+>", "", str(entry.get(key, ""))))
        return "\n".join(chunks), sources

    def _system_prompt(self, lang: str, context: str) -> str:
        if lang.startswith("en"):
            return (
                "You are SIH IA hospital information assistant. "
                "Answer in English using HTML (<p>, <strong>, <ul><li>). "
                "Never diagnose or prescribe. For emergencies direct to 15/112. "
                "Use only the knowledge below when relevant.\n\n"
                f"Knowledge:\n{context or 'General hospital platform.'}"
            )
        return (
            "Tu es l'assistant d'information de l'hôpital SIH IA. "
            "Réponds en français en HTML (<p>, <strong>, <ul><li>). "
            "Ne pose jamais de diagnostic ni ne prescris. Urgence : 15/112. "
            "Utilise uniquement les informations ci-dessous si pertinentes.\n\n"
            f"Connaissances:\n{context or 'Plateforme hospitalière générale.'}"
        )

    def _wrap_html(self, body: str, lang: str) -> str:
        disclaimer = _DISCLAIMER_EN if lang.startswith("en") else _DISCLAIMER_FR
        return f"{body}{disclaimer}"

    def _message_dict(
        self,
        role: str,
        html: str,
        *,
        sources: list[str] | None = None,
        is_refusal: bool = False,
    ) -> dict[str, Any]:
        return {
            "id": f"m-{uuid.uuid4().hex[:12]}",
            "role": role,
            "html": html,
            "sources": sources or [],
            "is_refusal": is_refusal,
            "has_contact_link": "contact@" in html or "15" in html,
        }

    def _audit(self, session_id: str, query: str, answer: str, lang: str, reason: str = "ok") -> None:
        append_chat_audit(
            self.settings.chatbot_audit_log_path,
            {
                "session_id": session_id,
                "lang": lang,
                "query": query[:500],
                "answer_preview": re.sub(r"<[^>]+>", "", answer)[:300],
                "reason": reason,
            },
        )

    def _build_messages_for_llm(self, session_id: str, query: str, lang: str) -> list[dict[str, str]]:
        history = self.sessions.get_messages(session_id)
        context, _ = self._retrieve_context(query, lang)
        messages: list[dict[str, str]] = [{"role": "system", "content": self._system_prompt(lang, context)}]
        for msg in history[-8:]:
            role = "assistant" if msg.get("role") == "bot" else "user"
            plain = re.sub(r"<[^>]+>", " ", str(msg.get("html", "")))
            messages.append({"role": role, "content": plain.strip()})
        messages.append({"role": "user", "content": query})
        return messages

    def _stream_openai_tokens(self, messages: list[dict[str, str]]) -> Iterator[str]:
        if not self.settings.openai_api_key:
            yield "<p>Service IA indisponible (clé API non configurée).</p>"
            return

        headers = {
            "Authorization": f"Bearer {self.settings.openai_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.settings.openai_model,
            "messages": messages,
            "stream": True,
            "temperature": 0.3,
        }
        url = f"{self.settings.openai_base_url.rstrip('/')}/chat/completions"
        with httpx.Client(timeout=60.0) as client:
            with client.stream("POST", url, headers=headers, json=payload) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if not line or not line.startswith("data: "):
                        continue
                    data = line[6:].strip()
                    if data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                    except json.JSONDecodeError:
                        continue
                    delta = chunk.get("choices", [{}])[0].get("delta", {})
                    token = delta.get("content")
                    if token:
                        yield token

    async def stream_reply(self, session_id: str, query: str, lang: str) -> AsyncIterator[str]:
        lang = (lang or "fr").lower()
        gate: GuardrailResult | None = evaluate_guardrails(query, lang)
        if gate:
            html = self._wrap_html(gate.html_for(lang), lang)
            user_msg = self._message_dict("user", f"<p>{query}</p>")
            bot_msg = self._message_dict("bot", html, is_refusal=gate.is_refusal)
            self.sessions.append(session_id, user_msg)
            self.sessions.append(session_id, bot_msg)
            self._audit(session_id, query, html, lang, gate.reason.value)
            yield f"data: {json.dumps({'token': html, 'replace': True})}\n\n"
            yield "data: [DONE]\n\n"
            return

        context, sources = self._retrieve_context(query, lang)
        user_msg = self._message_dict("user", f"<p>{query}</p>")
        self.sessions.append(session_id, user_msg)

        if not self.settings.openai_api_key:
            fallback = self._fallback_from_kb(query, lang, context)
            html = self._wrap_html(fallback, lang)
            bot_msg = self._message_dict("bot", html, sources=sources)
            self.sessions.append(session_id, bot_msg)
            self._audit(session_id, query, html, lang, "kb_fallback")
            yield f"data: {json.dumps({'token': html, 'replace': True})}\n\n"
            yield "data: [DONE]\n\n"
            return

        messages = self._build_messages_for_llm(session_id, query, lang)
        buffer = ""
        try:
            for token in self._stream_openai_tokens(messages):
                buffer += token
                yield f"data: {json.dumps({'token': token})}\n\n"
        except Exception:
            buffer = self._fallback_from_kb(query, lang, context)

        final_html = self._wrap_html(buffer or self._fallback_from_kb(query, lang, context), lang)
        bot_msg = self._message_dict("bot", final_html, sources=sources)
        self.sessions.append(session_id, bot_msg)
        self._audit(session_id, query, final_html, lang, "llm")
        yield f"data: {json.dumps({'token': final_html, 'replace': True})}\n\n"
        yield "data: [DONE]\n\n"

    def transcribe_audio(self, audio_bytes: bytes, filename: str, lang: str) -> str:
        if not audio_bytes:
            raise ValueError("Fichier audio vide")
        if len(audio_bytes) > 25 * 1024 * 1024:
            raise ValueError("Fichier audio trop volumineux (max 25 Mo)")
        if not self.settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY non configurée")

        url = f"{self.settings.openai_base_url.rstrip('/')}/audio/transcriptions"
        headers = {"Authorization": f"Bearer {self.settings.openai_api_key}"}
        mime = "audio/webm"
        if filename.lower().endswith(".mp4") or filename.lower().endswith(".m4a"):
            mime = "audio/mp4"
        elif filename.lower().endswith(".wav"):
            mime = "audio/wav"
        elif filename.lower().endswith(".mpeg") or filename.lower().endswith(".mp3"):
            mime = "audio/mpeg"

        data: dict[str, str] = {"model": self.settings.openai_whisper_model}
        if lang.lower().startswith("en"):
            data["language"] = "en"
        elif lang.lower().startswith("fr"):
            data["language"] = "fr"

        with httpx.Client(timeout=60.0) as client:
            response = client.post(
                url,
                headers=headers,
                data=data,
                files={"file": (filename or "voice.webm", audio_bytes, mime)},
            )
            response.raise_for_status()
            payload = response.json()
        text = str(payload.get("text", "")).strip()
        if not text:
            raise ValueError("Transcription vide")
        return text

    def _html_to_speech_text(self, html: str) -> str:
        plain = re.sub(r"<[^>]+>", " ", html or "")
        plain = re.sub(r"\s+", " ", plain).strip()
        return plain[:4096]

    def synthesize_speech(self, text: str, lang: str) -> bytes:
        spoken = self._html_to_speech_text(text)
        if not spoken:
            raise ValueError("Texte vide pour la synthèse vocale")
        if not self.settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY non configurée")

        url = f"{self.settings.openai_base_url.rstrip('/')}/audio/speech"
        headers = {
            "Authorization": f"Bearer {self.settings.openai_api_key}",
            "Content-Type": "application/json",
        }
        voice = self.settings.openai_tts_voice
        if lang.lower().startswith("en"):
            voice = os.getenv("OPENAI_TTS_VOICE_EN", voice)
        else:
            voice = os.getenv("OPENAI_TTS_VOICE_FR", voice)

        payload = {
            "model": self.settings.openai_tts_model,
            "voice": voice,
            "input": spoken,
            "response_format": "mp3",
        }
        with httpx.Client(timeout=60.0) as client:
            response = client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            return response.content

    def _fallback_from_kb(self, query: str, lang: str, context: str) -> str:
        if context.strip():
            key = "en" if lang.startswith("en") else "fr"
            for entry in self._knowledge:
                if any(t.lower() in query.lower() for t in entry.get("topics", [])):
                    return str(entry.get(key, f"<p>{context}</p>"))
            return f"<p>{context}</p>"
        key = "en" if lang.startswith("en") else "fr"
        if lang.startswith("en"):
            return "<p>I could not find a precise answer. Please contact reception or use the Appointments menu.</p>"
        return "<p>Je n'ai pas trouvé de réponse précise. Contactez l'accueil ou utilisez le menu Rendez-vous.</p>"
