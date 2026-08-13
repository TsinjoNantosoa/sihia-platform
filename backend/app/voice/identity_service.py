"""Identification / vérification patient — réutilise PatientsService, pas d'écriture."""

from __future__ import annotations

from typing import Any

from app.domain.models import Patient
from app.domain.ports import PatientRepository
from app.infrastructure.notification_channels import normalize_phone


def _norm_name(value: str | None) -> str:
    return " ".join((value or "").strip().lower().split())


class IdentityService:
    def __init__(self, patients: PatientRepository) -> None:
        self.patients = patients

    def search(
        self,
        *,
        phone: str | None = None,
        first_name: str | None = None,
        last_name: str | None = None,
        dob: str | None = None,
        record_number: str | None = None,
    ) -> list[dict[str, Any]]:
        candidates = self.patients.list(search=None, status="active")
        phone_n = normalize_phone(phone) if phone else None
        first = _norm_name(first_name)
        last = _norm_name(last_name)
        dob_n = (dob or "").strip()
        record = (record_number or "").strip().lower()

        matches: list[tuple[int, Patient]] = []
        for patient in candidates:
            score = 0
            p_phone = normalize_phone(patient.phone)
            if phone_n and p_phone == phone_n:
                score += 5
            if last and _norm_name(patient.last_name) == last:
                score += 3
            if first and _norm_name(patient.first_name) == first:
                score += 2
            if dob_n and patient.dob == dob_n:
                score += 3
            elif dob_n and len(dob_n) == 4 and patient.dob.startswith(dob_n):
                score += 1
            if record and patient.record_number.lower() == record:
                score += 4
            if score > 0:
                matches.append((score, patient))

        matches.sort(key=lambda item: item[0], reverse=True)
        return [self._public(p) | {"matchScore": score} for score, p in matches[:5]]

    def verify(
        self,
        patient_id: str,
        *,
        last_name: str | None = None,
        dob: str | None = None,
        phone: str | None = None,
    ) -> tuple[bool, Patient | None]:
        patient = self.patients.get(patient_id)
        if patient is None:
            return False, None
        checks = 0
        ok = 0
        if last_name:
            checks += 1
            if _norm_name(patient.last_name) == _norm_name(last_name):
                ok += 1
        if dob:
            checks += 1
            if patient.dob == dob.strip() or patient.dob.startswith(dob.strip()):
                ok += 1
        if phone:
            checks += 1
            if normalize_phone(patient.phone) == normalize_phone(phone):
                ok += 1
        if checks == 0:
            return False, patient
        return ok == checks and checks >= 1, patient

    def _public(self, patient: Patient) -> dict[str, Any]:
        return {
            "id": patient.id,
            "firstName": patient.first_name,
            "lastName": patient.last_name,
            "dob": patient.dob,
            "phone": patient.phone,
            "recordNumber": patient.record_number,
        }
