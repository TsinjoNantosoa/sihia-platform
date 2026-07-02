from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum


class GateReason(str, Enum):
    EMERGENCY = "emergency"
    DIAGNOSIS = "diagnosis"
    INJECTION = "injection"
    OUT_OF_SCOPE = "out_of_scope"


@dataclass(frozen=True)
class GuardrailResult:
    reason: GateReason
    html_fr: str
    html_en: str
    is_refusal: bool = True

    def html_for(self, lang: str) -> str:
        return self.html_en if (lang or "fr").lower().startswith("en") else self.html_fr


_EMERGENCY = re.compile(
    r"\b(urgence|samu|pompier|112|15|infarctus|avc|hémorragie|"
    r"ne respire plus|suicide|overdose|emergency|heart attack|stroke|bleeding)\b",
    re.I,
)
_DIAGNOSIS = re.compile(
    r"(diagnostic|diagnostiqu|sympt[oô]m|maladie|traitement|médicament|medicament|prescri|"
    r"ordonnance|what do i have|am i sick|dosage)",
    re.I,
)
_INJECTION = re.compile(
    r"(ignore (previous|all) instructions|jailbreak|system prompt|"
    r"ignore tes instructions|oublie tes règles|dan mode|bypass)",
    re.I,
)


def evaluate_guardrails(query: str, lang: str = "fr") -> GuardrailResult | None:
    text = (query or "").strip()
    if not text:
        return None

    if _EMERGENCY.search(text):
        return GuardrailResult(
            GateReason.EMERGENCY,
            html_fr=(
                "<p><strong>Urgence médicale possible.</strong> "
                "Appelez immédiatement le <strong>15</strong> (SAMU) ou le <strong>112</strong>. "
                "Rendez-vous aux urgences les plus proches. "
                "Ce chatbot ne remplace pas les secours.</p>"
            ),
            html_en=(
                "<p><strong>Possible medical emergency.</strong> "
                "Call <strong>15</strong> (SAMU) or <strong>112</strong> immediately. "
                "Go to the nearest emergency department. "
                "This chatbot is not a substitute for emergency services.</p>"
            ),
            is_refusal=True,
        )

    if _INJECTION.search(text):
        return GuardrailResult(
            GateReason.INJECTION,
            html_fr="<p>Je ne peux pas traiter cette demande. Posez une question sur les services de l'hôpital.</p>",
            html_en="<p>I cannot process this request. Please ask about hospital services.</p>",
        )

    if _DIAGNOSIS.search(text):
        return GuardrailResult(
            GateReason.DIAGNOSIS,
            html_fr=(
                "<p>Je ne pose <strong>pas de diagnostic</strong> ni ne prescris de traitement. "
                "Consultez un professionnel de santé ou prenez rendez-vous via l'application.</p>"
            ),
            html_en=(
                "<p>I do <strong>not provide diagnosis</strong> or prescribe treatment. "
                "Please see a healthcare professional or book via the app.</p>"
            ),
        )

    return None
