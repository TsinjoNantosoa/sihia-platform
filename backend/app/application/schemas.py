from typing import Literal

from pydantic import BaseModel, EmailStr


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


class MedicalVisitCreate(BaseModel):
    date: str
    reason: str
    doctorName: str
    specialty: str
    diagnosis: str
    treatment: str | None = None
    notes: str | None = None


class AppointmentCreate(BaseModel):
    patientId: str
    patientName: str
    doctorId: str
    doctorName: str
    date: str
    durationMin: int
    reason: str
    status: Literal["scheduled", "confirmed", "completed", "cancelled", "noshow"]
