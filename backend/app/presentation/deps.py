from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.application.use_cases import AppointmentsService, AuthService, DoctorsService, PatientsService
from app.core.security import decode_access_token
from app.infrastructure.repositories import (
    InMemoryAppointmentRepository,
    InMemoryDoctorRepository,
    InMemoryPatientRepository,
    InMemoryUserRepository,
)

users_repo = InMemoryUserRepository()
patients_repo = InMemoryPatientRepository()
doctors_repo = InMemoryDoctorRepository()
appointments_repo = InMemoryAppointmentRepository()

auth_service = AuthService(users_repo)
patients_service = PatientsService(patients_repo)
doctors_service = DoctorsService(doctors_repo)
appointments_service = AppointmentsService(appointments_repo)

bearer_scheme = HTTPBearer(auto_error=True)


def require_auth(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
    token = credentials.credentials
    try:
        return decode_access_token(token)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalide") from exc
