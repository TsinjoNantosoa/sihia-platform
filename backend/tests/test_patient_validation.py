"""Tests de validation PatientCreate / PatientUpdate."""

from __future__ import annotations

from datetime import date, timedelta

import pytest
from pydantic import ValidationError

from app.application.schemas import PatientCreate, PatientUpdate


def _valid_patient(**overrides) -> dict:
    base = {
        "firstName": "Jean",
        "lastName": "Martin",
        "dob": "1990-05-15",
        "gender": "M",
        "phone": "+212600123456",
        "address": "1 rue Test",
        "bloodType": "O+",
        "allergies": [],
    }
    base.update(overrides)
    return base


def test_patient_create_valid() -> None:
    patient = PatientCreate(**_valid_patient())
    assert patient.email is None
    assert patient.phone == "+212600123456"


def test_patient_create_rejects_invalid_email() -> None:
    with pytest.raises(ValidationError):
        PatientCreate(**_valid_patient(email="not-an-email"))


def test_patient_create_accepts_empty_email_as_none() -> None:
    patient = PatientCreate(**_valid_patient(email=""))
    assert patient.email is None


def test_patient_create_rejects_future_dob() -> None:
    future = (date.today() + timedelta(days=1)).isoformat()
    with pytest.raises(ValidationError):
        PatientCreate(**_valid_patient(dob=future))


def test_patient_create_rejects_invalid_blood_type() -> None:
    with pytest.raises(ValidationError):
        PatientCreate(**_valid_patient(bloodType="Z+"))


def test_patient_create_rejects_invalid_phone() -> None:
    with pytest.raises(ValidationError):
        PatientCreate(**_valid_patient(phone="abc"))


def test_patient_update_partial_validation() -> None:
    updated = PatientUpdate(phone="+33612345678", bloodType="A-")
    assert updated.phone == "+33612345678"
    assert updated.bloodType == "A-"
