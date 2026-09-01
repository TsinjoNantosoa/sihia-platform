"""Résumé IA du dossier patient — aide à la décision (pas un diagnostic)."""

from __future__ import annotations

import json
from dataclasses import asdict
from datetime import datetime, timezone
from typing import Any

import httpx

from app.core.config import settings
from app.domain.models import MedicalVisit, Patient
from app.infrastructure.database import is_postgresql

DISCLAIMER_FR = (
    "Résumé généré automatiquement à titre d'aide à la décision. "
    "Ce n'est pas un diagnostic. Validation clinique humaine obligatoire."
)
DISCLAIMER_EN = (
    "Automatically generated decision-support summary. "
    "Not a diagnosis. Human clinical validation required."
)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _data_source() -> str:
    return "postgresql" if is_postgresql() else "sqlite"


class PatientAiSummaryService:
    """Produit ~5 lignes à partir de l'historique ; LLM optionnel, fallback déterministe."""

    def summarize(
        self,
        patient: Patient,
        visits: list[MedicalVisit],
        *,
        lang: str = "fr",
    ) -> dict[str, Any]:
        lang = (lang or "fr").lower()
        sorted_visits = sorted(visits, key=lambda v: v.date, reverse=True)
        deterministic = self._deterministic_summary(patient, sorted_visits, lang)
        engine = "rules"
        model = "deterministic-summary"
        lines = deterministic["lines"]
        bullets = deterministic["bullets"]

        if settings.patient_ai_external_llm_enabled and settings.openai_api_key and sorted_visits:
            try:
                llm_lines = self._llm_summary(patient, sorted_visits, lang)
                if llm_lines:
                    lines = llm_lines
                    bullets = llm_lines
                    engine = "openai"
                    model = settings.openai_model
            except Exception:  # noqa: BLE001 — mode dégradé obligatoire
                pass

        return {
            "patientId": patient.id,
            "patientName": f"{patient.first_name} {patient.last_name}",
            "lines": lines[:5],
            "bullets": bullets[:5],
            "visitCount": len(sorted_visits),
            "model": model,
            "model_version": f"{model}-1.0",
            "engine": engine,
            "source": _data_source(),
            "generatedAt": _utc_now().isoformat(),
            "disclaimer": DISCLAIMER_EN if lang.startswith("en") else DISCLAIMER_FR,
            "allergies": list(patient.allergies or []),
            "bloodType": patient.blood_type,
            "status": patient.status,
        }

    def _deterministic_summary(
        self,
        patient: Patient,
        visits: list[MedicalVisit],
        lang: str,
    ) -> dict[str, list[str]]:
        en = lang.startswith("en")
        name = f"{patient.first_name} {patient.last_name}"
        allergies = ", ".join(patient.allergies) if patient.allergies else ("none recorded" if en else "aucune déclarée")
        lines: list[str] = []

        if en:
            lines.append(
                f"{name} — status {patient.status}, blood type {patient.blood_type or 'n/a'}, allergies: {allergies}."
            )
        else:
            lines.append(
                f"{name} — statut {patient.status}, groupe {patient.blood_type or 'n/a'}, allergies : {allergies}."
            )

        if not visits:
            if en:
                lines.append("No medical visits recorded in the chart yet.")
                lines.append("Recommend completing history before clinical decisions.")
                lines.append("Check upcoming appointments and reminder status.")
                lines.append("Confirm identity and insurance details at next contact.")
            else:
                lines.append("Aucune visite médicale enregistrée dans le dossier pour l'instant.")
                lines.append("Compléter l'historique avant toute décision clinique.")
                lines.append("Vérifier les prochains rendez-vous et le statut des rappels.")
                lines.append("Confirmer identité et couverture à la prochaine prise en charge.")
            return {"lines": lines[:5], "bullets": lines[:5]}

        latest = visits[0]
        if en:
            lines.append(
                f"Latest visit ({latest.date}): {latest.reason} — {latest.doctor_name} ({latest.specialty})."
            )
            lines.append(f"Recorded impression: {latest.diagnosis or 'not specified'}.")
        else:
            lines.append(
                f"Dernière visite ({latest.date}) : {latest.reason} — {latest.doctor_name} ({latest.specialty})."
            )
            lines.append(f"Impression notée : {latest.diagnosis or 'non précisée'}.")

        treatments = [v.treatment for v in visits[:3] if v.treatment]
        if treatments:
            joined = "; ".join(treatments[:3])
            lines.append(
                f"Recent treatments: {joined}." if en else f"Traitements récents : {joined}."
            )
        else:
            lines.append(
                "No treatment details on the last visits."
                if en
                else "Pas de détail de traitement sur les dernières visites."
            )

        specialties = sorted({v.specialty for v in visits if v.specialty})
        if en:
            lines.append(
                f"{len(visits)} visit(s) on file"
                + (f"; specialties: {', '.join(specialties[:4])}." if specialties else ".")
            )
        else:
            lines.append(
                f"{len(visits)} visite(s) au dossier"
                + (f" ; spécialités : {', '.join(specialties[:4])}." if specialties else ".")
            )

        return {"lines": lines[:5], "bullets": lines[:5]}

    def _llm_summary(
        self,
        patient: Patient,
        visits: list[MedicalVisit],
        lang: str,
    ) -> list[str] | None:
        en = lang.startswith("en")
        payload_visits = [asdict(v) for v in visits[:12]]
        system = (
            "You are a hospital chart summarizer. Output EXACTLY 5 short bullet lines. "
            "No diagnosis claims. Decision support only. "
            + ("Answer in English." if en else "Réponds en français.")
        )
        user = (
            f"Patient: {patient.first_name} {patient.last_name}, "
            f"status={patient.status}, blood={patient.blood_type}, "
            f"allergies={patient.allergies}. Visits JSON:\n"
            f"{json.dumps(payload_visits, ensure_ascii=False)[:6000]}"
        )
        headers = {
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json",
        }
        body = {
            "model": settings.openai_model,
            "temperature": 0.2,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }
        url = f"{settings.openai_base_url.rstrip('/')}/chat/completions"
        with httpx.Client(timeout=45.0) as client:
            response = client.post(url, headers=headers, json=body)
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
        lines = [
            ln.strip(" -•\t")
            for ln in str(content).splitlines()
            if ln.strip() and not ln.strip().startswith("#")
        ]
        return lines[:5] if len(lines) >= 3 else None
