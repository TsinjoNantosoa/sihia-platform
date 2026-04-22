from datetime import datetime
from uuid import uuid4

from fastapi import HTTPException, status

from app.application.schemas import AppointmentCreate, PatientCreate
from app.core.security import create_access_token
from app.domain.models import Appointment, Patient
from app.domain.ports import (
    AppointmentRepository,
    DoctorRepository,
    PatientRepository,
    UserRepository,
)

ROLE_PERMISSIONS: dict[str, list[str]] = {
    "admin": [
        "dashboard:read",
        "patients:read",
        "patients:create",
        "patients:update",
        "patients:delete",
        "doctors:read",
        "appointments:read",
        "appointments:create",
        "appointments:update",
        "analytics:read",
        "ml:read",
        "users:read",
        "settings:read",
    ],
    "manager": [
        "dashboard:read",
        "patients:read",
        "doctors:read",
        "appointments:read",
        "analytics:read",
        "ml:read",
        "settings:read",
    ],
    "doctor": [
        "dashboard:read",
        "patients:read",
        "patients:update",
        "doctors:read",
        "appointments:read",
        "appointments:create",
        "appointments:update",
        "analytics:read",
        "ml:read",
        "settings:read",
    ],
    "staff": [
        "dashboard:read",
        "patients:read",
        "patients:create",
        "doctors:read",
        "appointments:read",
        "appointments:create",
        "settings:read",
    ],
}


class AuthService:
    def __init__(self, users: UserRepository) -> None:
        self.users = users

    def login(self, email: str, password: str) -> str:
        user = self.users.find_by_email(email)
        if user is None or user.password != password:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Identifiants invalides")
        return create_access_token(
            subject=user.id,
            claims={
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "permissions": ROLE_PERMISSIONS.get(user.role, []),
                "facility": user.facility,
            },
        )


class PatientsService:
    def __init__(self, patients: PatientRepository) -> None:
        self.patients = patients

    def list(self, search: str | None, status_filter: str | None) -> list[Patient]:
        return self.patients.list(search=search, status=status_filter)

    def get(self, patient_id: str) -> Patient:
        patient = self.patients.get(patient_id)
        if patient is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient introuvable")
        return patient

    def create(self, data: PatientCreate) -> Patient:
        now = datetime.utcnow().strftime("%Y-%m-%d")
        patient = Patient(
            id=f"p-{uuid4().hex[:10]}",
            record_number=f"PT-{uuid4().hex[:6].upper()}",
            first_name=data.firstName,
            last_name=data.lastName,
            dob=data.dob,
            gender=data.gender,
            phone=data.phone,
            email=data.email,
            address=data.address,
            blood_type=data.bloodType,
            allergies=data.allergies,
            insurance=data.insurance,
            status="active",
            last_visit=now,
        )
        return self.patients.create(patient)

    def delete(self, patient_id: str) -> None:
        self.patients.delete(patient_id)


class DoctorsService:
    def __init__(self, doctors: DoctorRepository) -> None:
        self.doctors = doctors

    def list(self):
        return self.doctors.list()

    def get(self, doctor_id: str):
        doctor = next((d for d in self.doctors.list() if d.id == doctor_id), None)
        if doctor is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medecin introuvable")
        return doctor


class AppointmentsService:
    def __init__(self, appointments: AppointmentRepository) -> None:
        self.appointments = appointments

    def list(self):
        return self.appointments.list()

    def create(self, data: AppointmentCreate) -> Appointment:
        # Basic conflict rule: same doctor and exact same datetime.
        for appt in self.appointments.list():
            if appt.doctor_id == data.doctorId and appt.date == data.date and appt.status != "cancelled":
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="CONFLICT")
        appointment = Appointment(
            id=f"a-{uuid4().hex[:10]}",
            patient_id=data.patientId,
            patient_name=data.patientName,
            doctor_id=data.doctorId,
            doctor_name=data.doctorName,
            date=data.date,
            duration_min=data.durationMin,
            reason=data.reason,
            status=data.status,
        )
        return self.appointments.create(appointment)

    def cancel(self, appointment_id: str) -> Appointment:
        cancelled = self.appointments.cancel(appointment_id)
        if cancelled is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rendez-vous introuvable")
        return cancelled
