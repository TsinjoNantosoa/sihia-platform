from typing import Literal

from pydantic import BaseModel, EmailStr, Field


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


class PatientCreate(BaseModel):
    firstName: str
    lastName: str
    dob: str
    gender: Literal["M", "F"]
    phone: str
    email: str | None = None
    address: str
    bloodType: str
    allergies: list[str]
    insurance: str | None = None


class PatientUpdate(BaseModel):
    firstName: str | None = None
    lastName: str | None = None
    dob: str | None = None
    gender: Literal["M", "F"] | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    bloodType: str | None = None
    allergies: list[str] | None = None
    insurance: str | None = None
    status: Literal["active", "inactive", "admitted"] | None = None


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
    patientName: str
    doctorId: str
    doctorName: str
    date: str
    durationMin: int = Field(default=30, ge=15, le=240)
    reason: str
    status: Literal["scheduled", "confirmed", "completed", "cancelled", "noshow"]


UserRole = Literal["admin", "doctor", "staff", "manager"]


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    role: UserRole
    facility: str = Field(default="Hopital Central", min_length=2, max_length=120)


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=6, max_length=128)
    role: UserRole | None = None
    status: Literal["active", "suspended"] | None = None
    facility: str | None = Field(default=None, min_length=2, max_length=120)
