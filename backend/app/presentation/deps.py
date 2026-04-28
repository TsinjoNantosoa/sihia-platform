from typing import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.application.use_cases import AppointmentsService, AuthService, DoctorsService, MedicalHistoryService, PatientsService
from app.core.security import decode_access_token
from app.infrastructure.sqlite_repositories import (
    SQLiteAppointmentRepository,
    SQLiteDoctorRepository,
    SQLiteMedicalHistoryRepository,
    SQLitePatientRepository,
    SQLiteRefreshSessionRepository,
    SQLiteUserRepository,
    init_db,
)

init_db()

users_repo = SQLiteUserRepository()
patients_repo = SQLitePatientRepository()
doctors_repo = SQLiteDoctorRepository()
appointments_repo = SQLiteAppointmentRepository()
medical_history_repo = SQLiteMedicalHistoryRepository()
refresh_sessions_repo = SQLiteRefreshSessionRepository()

auth_service = AuthService(users_repo, refresh_sessions_repo)
patients_service = PatientsService(patients_repo)
doctors_service = DoctorsService(doctors_repo)
appointments_service = AppointmentsService(appointments_repo)
medical_history_service = MedicalHistoryService(medical_history_repo)

bearer_scheme = HTTPBearer(auto_error=True)


def require_auth(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
    token = credentials.credentials
    try:
        return decode_access_token(token)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalide") from exc


def require_permission(permission: str) -> Callable[[dict], dict]:
    """Factory that returns a FastAPI dependency checking a specific permission in JWT claims."""
    def _check(claims: dict = Depends(require_auth)) -> dict:
        perms: list[str] = claims.get("permissions", [])
        if permission not in perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "FORBIDDEN", "message": f"Permission requise : {permission}"},
            )
        return claims
    return _check
