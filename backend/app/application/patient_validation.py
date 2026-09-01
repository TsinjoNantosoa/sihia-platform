"""Validateurs partagés pour les schémas patient (API + import)."""

from __future__ import annotations

import re
from datetime import date

_PHONE = re.compile(r"^\+?[0-9]{9,15}$")

BLOOD_TYPES = frozenset({"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"})


def normalize_optional_email(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def validate_patient_name(value: str, *, field: str) -> str:
    stripped = value.strip()
    if len(stripped) < 1:
        raise ValueError(f"{field} requis")
    if len(stripped) > 80:
        raise ValueError(f"{field} trop long (max 80 caractères)")
    return stripped


def validate_patient_dob(value: str) -> str:
    raw = value.strip()[:10]
    try:
        parsed = date.fromisoformat(raw)
    except ValueError as exc:
        raise ValueError("Date de naissance invalide (format YYYY-MM-DD attendu)") from exc
    if parsed > date.today():
        raise ValueError("La date de naissance ne peut pas être dans le futur")
    return raw


def validate_patient_phone(value: str) -> str:
    normalized = re.sub(r"[\s\-()]", "", value.strip())
    if not _PHONE.match(normalized):
        raise ValueError("Numéro de téléphone invalide")
    return normalized


def validate_blood_type(value: str) -> str:
    stripped = value.strip().upper().replace(" ", "")
    if stripped not in BLOOD_TYPES:
        raise ValueError("Groupe sanguin invalide")
    return stripped
