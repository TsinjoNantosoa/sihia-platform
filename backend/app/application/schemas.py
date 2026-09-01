from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.application.patient_validation import (
    normalize_optional_email,
    validate_blood_type,
    validate_patient_dob,
    validate_patient_name,
    validate_patient_phone,
)
from app.core.password_policy import validate_password

BloodType = Literal["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyResetCodeRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=4, max_length=16)


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=4, max_length=16)
    new_password: str = Field(min_length=10, max_length=128, alias="newPassword")

    model_config = {"populate_by_name": True}

    @field_validator("new_password")
    @classmethod
    def _validate_new_password(cls, value: str) -> str:
        return validate_password(value)


class PatientCreate(BaseModel):
    firstName: str = Field(min_length=1, max_length=80)
    lastName: str = Field(min_length=1, max_length=80)
    dob: str
    gender: Literal["M", "F"]
    phone: str
    email: EmailStr | None = None
    address: str = Field(min_length=1, max_length=240)
    bloodType: BloodType
    allergies: list[str]
    insurance: str | None = Field(default=None, max_length=120)
    chronicConditions: str | None = Field(default=None, max_length=500)
    currentTreatments: str | None = Field(default=None, max_length=500)
    emergencyContact: str | None = Field(default=None, max_length=120)

    @field_validator("firstName", "lastName")
    @classmethod
    def _validate_names(cls, value: str, info) -> str:
        label = "Prénom" if info.field_name == "firstName" else "Nom"
        return validate_patient_name(value, field=label)

    @field_validator("dob")
    @classmethod
    def _validate_dob(cls, value: str) -> str:
        return validate_patient_dob(value)

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, value: str) -> str:
        return validate_patient_phone(value)

    @field_validator("email", mode="before")
    @classmethod
    def _normalize_email(cls, value: str | None) -> str | None:
        return normalize_optional_email(value if isinstance(value, str) else value)

    @field_validator("bloodType")
    @classmethod
    def _validate_blood_type(cls, value: str) -> str:
        return validate_blood_type(value)


class PatientUpdate(BaseModel):
    firstName: str | None = Field(default=None, min_length=1, max_length=80)
    lastName: str | None = Field(default=None, min_length=1, max_length=80)
    dob: str | None = None
    gender: Literal["M", "F"] | None = None
    phone: str | None = None
    email: EmailStr | None = None
    address: str | None = Field(default=None, min_length=1, max_length=240)
    bloodType: BloodType | None = None
    allergies: list[str] | None = None
    insurance: str | None = Field(default=None, max_length=120)
    status: Literal["active", "inactive", "admitted", "archived"] | None = None
    chronicConditions: str | None = Field(default=None, max_length=500)
    currentTreatments: str | None = Field(default=None, max_length=500)
    emergencyContact: str | None = Field(default=None, max_length=120)

    @field_validator("firstName", "lastName")
    @classmethod
    def _validate_names(cls, value: str | None, info) -> str | None:
        if value is None:
            return None
        label = "Prénom" if info.field_name == "firstName" else "Nom"
        return validate_patient_name(value, field=label)

    @field_validator("dob")
    @classmethod
    def _validate_dob(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return validate_patient_dob(value)

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return validate_patient_phone(value)

    @field_validator("email", mode="before")
    @classmethod
    def _normalize_email(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_optional_email(value if isinstance(value, str) else value)

    @field_validator("bloodType")
    @classmethod
    def _validate_blood_type(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return validate_blood_type(value)


class MedicalVisitCreate(BaseModel):
    date: str
    reason: str
    doctorName: str
    specialty: str
    diagnosis: str
    treatment: str | None = None
    notes: str | None = None


class DoctorScheduleDay(BaseModel):
    day: str
    slots: list[str]


class DoctorUpdate(BaseModel):
    availability: Literal["available", "busy", "off"] | None = None
    schedule: list[DoctorScheduleDay] | None = None
    phone: str | None = None


class ReminderSendRequest(BaseModel):
    channels: list[Literal["email", "sms"]] = Field(default_factory=lambda: ["email"])


class AppointmentCreate(BaseModel):
    patientId: str
    patientName: str | None = None  # ignoré — dérivé côté serveur
    doctorId: str
    doctorName: str | None = None  # ignoré — dérivé côté serveur
    date: str
    durationMin: int = Field(default=30, ge=15, le=240)
    reason: str
    status: Literal["scheduled", "confirmed", "arrived", "completed", "cancelled", "noshow"] | None = None


class AppointmentStatusUpdate(BaseModel):
    status: Literal["confirmed", "arrived", "completed", "cancelled", "noshow"]


class AppointmentReschedule(BaseModel):
    doctorId: str = Field(min_length=1)
    date: str = Field(min_length=1)


UserRole = Literal["admin", "doctor", "staff", "manager"]


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    role: UserRole
    facility: str = Field(default="Hopital Central", min_length=2, max_length=120)

    @field_validator("password")
    @classmethod
    def _validate_password(cls, value: str) -> str:
        return validate_password(value)


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=10, max_length=128)
    role: UserRole | None = None
    facility: str | None = Field(default=None, min_length=2, max_length=120)
    status: Literal["active", "suspended"] | None = None


class NotificationMarkReadRequest(BaseModel):
    alertIds: list[str] = Field(default_factory=list, max_length=200)


class NotificationPrefsUpdate(BaseModel):
    alertsEnabled: bool | None = None
    remindersEnabled: bool | None = None
    weeklyDigestEnabled: bool | None = None
