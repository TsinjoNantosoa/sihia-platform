from typing import Literal

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


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


class AppointmentCreate(BaseModel):
    patientId: str
    patientName: str
    doctorId: str
    doctorName: str
    date: str
    durationMin: int
    reason: str
    status: Literal["scheduled", "confirmed", "completed", "cancelled", "noshow"]
