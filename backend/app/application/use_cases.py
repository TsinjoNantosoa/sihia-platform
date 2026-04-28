from datetime import datetime, timezone
from uuid import uuid4

from fastapi import HTTPException, status

from app.application.schemas import AppointmentCreate, MedicalVisitCreate, PatientCreate
from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, decode_access_token, verify_password
from app.domain.models import Appointment, MedicalVisit, Patient
from app.domain.ports import (
    AppointmentRepository,
    DoctorRepository,
    PatientRepository,
    RefreshSessionRepository,
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
    def __init__(self, users: UserRepository, refresh_sessions: RefreshSessionRepository) -> None:
        self.users = users
        self.refresh_sessions = refresh_sessions

    def login(self, email: str, password: str) -> tuple[str, str]:
        user = self.users.find_by_email(email)
        if user is None or not verify_password(password, user.password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Identifiants invalides")
        access_token = create_access_token(
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
        refresh_session_id = f"rs-{uuid4().hex}"
        refresh_token = create_refresh_token(subject=user.id, session_id=refresh_session_id)
        refresh_claims = decode_access_token(refresh_token)
        self.refresh_sessions.create(refresh_session_id, user.id, int(refresh_claims["exp"]))
        self.refresh_sessions.prune_active_sessions(
            user.id, settings.max_refresh_sessions_per_user, int(datetime.now(timezone.utc).timestamp())
        )
        return access_token, refresh_token

    def refresh(self, refresh_token: str) -> tuple[str, str]:
        try:
            claims = decode_access_token(refresh_token)
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token invalide") from exc

        if claims.get("token_type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Type de token invalide")

        user_id = claims.get("sub")
        session_id = claims.get("sid")
        exp = claims.get("exp")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token invalide")
        if not session_id or not isinstance(exp, int):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session refresh invalide")

        if not self.refresh_sessions.is_active(session_id, user_id, int(datetime.now(timezone.utc).timestamp())):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session refresh expirée ou révoquée")

        user = self.users.find_by_id(user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilisateur introuvable")

        self.refresh_sessions.revoke(session_id)

        new_session_id = f"rs-{uuid4().hex}"
        new_refresh_token = create_refresh_token(subject=user.id, session_id=new_session_id)
        new_refresh_claims = decode_access_token(new_refresh_token)
        self.refresh_sessions.create(new_session_id, user.id, int(new_refresh_claims["exp"]))
        self.refresh_sessions.prune_active_sessions(
            user.id, settings.max_refresh_sessions_per_user, int(datetime.now(timezone.utc).timestamp())
        )

        access_token = create_access_token(
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
        return access_token, new_refresh_token

    def logout(self, refresh_token: str) -> None:
        try:
            claims = decode_access_token(refresh_token)
        except Exception:
            return
        if claims.get("token_type") != "refresh":
            return
        sid = claims.get("sid")
        if sid:
            self.refresh_sessions.revoke(sid)

    def logout_all(self, user_id: str) -> None:
        self.refresh_sessions.revoke_all_for_user(user_id)


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


class MedicalHistoryService:
    def __init__(self, repo) -> None:
        self.repo = repo

    def list(self, patient_id: str) -> list[MedicalVisit]:
        return self.repo.get_for_patient(patient_id)

    def add(self, patient_id: str, data: MedicalVisitCreate) -> MedicalVisit:
        visit = MedicalVisit(
            id=f"{patient_id}-v{uuid4().hex[:8]}",
            patient_id=patient_id,
            date=data.date,
            reason=data.reason,
            doctor_name=data.doctorName,
            specialty=data.specialty,
            diagnosis=data.diagnosis,
            treatment=data.treatment,
            notes=data.notes,
        )
        return self.repo.add_visit(visit)


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
