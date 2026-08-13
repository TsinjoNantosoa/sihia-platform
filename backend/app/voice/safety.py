"""Gardes Voice AI : assistant administratif uniquement."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

from app.application.chatbot_guardrails import evaluate_guardrails

SafetyKind = Literal[
    "ok",
    "emergency",
    "diagnosis",
    "prescription",
    "injection",
    "out_of_scope",
    "human_request",
]


@dataclass(frozen=True)
class VoiceSafetyResult:
    kind: SafetyKind
    blocked: bool
    escalate: bool
    spoken_en: str
    spoken_fr: str
    reason: str | None = None

    def spoken(self, language: str = "en") -> str:
        lang = (language or "en").lower()
        return self.spoken_fr if lang.startswith("fr") else self.spoken_en


_HUMAN = re.compile(
    r"\b(human|agent|personne|opérateur|operateur|someone real|talk to (a )?person|"
    r"parler (à|a) (un )?humain|conseiller)\b",
    re.I,
)
_DIAGNOSIS_EXTRA = re.compile(
    r"\b(diagnos|disease|symptom|maladie|what.?s wrong with me)\b",
    re.I,
)
_PRESCRIPTION = re.compile(
    r"\b(prescri|ordonnance|dosage|médicament|medicament|refill|renew my med)\b",
    re.I,
)
_RECORD = re.compile(
    r"\b(modify (my )?(record|chart|diagnosis)|change (my )?diagnosis|"
    r"modifier (le )?dossier|changer (le )?diagnostic)\b",
    re.I,
)


def evaluate_voice_safety(text: str, language: str = "en") -> VoiceSafetyResult:
    raw = (text or "").strip()
    if not raw:
        return VoiceSafetyResult("ok", False, False, "", "")

    if _HUMAN.search(raw):
        return VoiceSafetyResult(
            "human_request",
            blocked=False,
            escalate=True,
            spoken_en="I can transfer you to a staff member. One moment.",
            spoken_fr="Je vous transfère vers un conseiller. Un instant.",
            reason="explicit_human_request",
        )

    gate = evaluate_guardrails(raw, language)
    if gate is not None:
        if gate.reason.value == "emergency":
            return VoiceSafetyResult(
                "emergency",
                blocked=True,
                escalate=True,
                spoken_en="If this is an emergency, hang up and call emergency services immediately.",
                spoken_fr="S'il s'agit d'une urgence, raccrochez et appelez les secours immédiatement.",
                reason="emergency",
            )
        if gate.reason.value == "diagnosis":
            return VoiceSafetyResult(
                "diagnosis",
                blocked=True,
                escalate=False,
                spoken_en="I cannot diagnose or give medical advice. I can only help with appointments.",
                spoken_fr="Je ne pose pas de diagnostic. Je peux seulement aider pour les rendez-vous.",
                reason="diagnosis",
            )
        if gate.reason.value == "injection":
            return VoiceSafetyResult(
                "injection",
                blocked=True,
                escalate=False,
                spoken_en="I cannot process that request. How can I help with an appointment?",
                spoken_fr="Je ne peux pas traiter cette demande. Comment puis-je aider pour un rendez-vous ?",
                reason="injection",
            )

    if _DIAGNOSIS_EXTRA.search(raw):
        return VoiceSafetyResult(
            "diagnosis",
            blocked=True,
            escalate=False,
            spoken_en="I cannot diagnose or give medical advice. I can only help with appointments.",
            spoken_fr="Je ne pose pas de diagnostic. Je peux seulement aider pour les rendez-vous.",
            reason="diagnosis",
        )

    if _PRESCRIPTION.search(raw) or _RECORD.search(raw):
        return VoiceSafetyResult(
            "prescription",
            blocked=True,
            escalate=False,
            spoken_en="I cannot prescribe or change medical records. I can book, move, or cancel an appointment.",
            spoken_fr="Je ne peux ni prescrire ni modifier un dossier médical. Je peux prendre, déplacer ou annuler un rendez-vous.",
            reason="clinical_mutation",
        )

    return VoiceSafetyResult("ok", False, False, "", "")


def assert_mutation_allowed(
    *,
    patient_verified: bool,
    confirmation_received: bool,
    confirm_required: bool = True,
) -> VoiceSafetyResult | None:
    if not patient_verified:
        return VoiceSafetyResult(
            "out_of_scope",
            blocked=True,
            escalate=False,
            spoken_en="I need to verify your identity before changing an appointment.",
            spoken_fr="Je dois vérifier votre identité avant de modifier un rendez-vous.",
            reason="patient_not_verified",
        )
    if confirm_required and not confirmation_received:
        return VoiceSafetyResult(
            "out_of_scope",
            blocked=True,
            escalate=False,
            spoken_en="Please say yes if you want me to confirm this appointment.",
            spoken_fr="Dites oui si vous voulez que je confirme ce rendez-vous.",
            reason="confirmation_required",
        )
    return None
