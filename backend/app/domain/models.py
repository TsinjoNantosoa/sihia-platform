from dataclasses import dataclass
from typing import Literal


Role = Literal["admin", "doctor", "staff", "manager"]
PatientStatus = Literal["active", "inactive", "admitted"]
AppointmentStatus = Literal["scheduled", "confirmed", "completed", "cancelled", "noshow"]


@dataclass
class User:
    id: str
    name: str
    email: str
    password: str
    role: Role
    facility: str


@dataclass
class Patient:
    id: str
    record_number: str
    first_name: str
    last_name: str
    dob: str
    gender: Literal["M", "F"]
    phone: str
    email: str | None
    address: str
    blood_type: str
    allergies: list[str]
    insurance: str | None
    status: PatientStatus
    last_visit: str | None


@dataclass
class Doctor:
    id: str
    first_name: str
    last_name: str
    specialty: str
    phone: str
    email: str
    availability: Literal["available", "busy", "off"]
    patients_count: int
    weekly_appointments: int
    satisfaction: float
    schedule: list[dict[str, object]]


@dataclass
class Appointment:
    id: str
    patient_id: str
    patient_name: str
    doctor_id: str
    doctor_name: str
    date: str
    duration_min: int
    reason: str
    status: AppointmentStatus
