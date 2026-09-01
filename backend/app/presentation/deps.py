from typing import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.application.chatbot_service import ChatbotService
from app.application.analytics_service import AnalyticsService
from app.application.notification_service import NotificationService
from app.application.search_service import SearchService
from app.application.ml_service import MlForecastService
from app.application.noshow_service import NoShowRiskService
from app.application.waiting_room_service import WaitingRoomService
from app.application.patient_document_service import PatientDocumentService
from app.application.patient_summary_service import PatientAiSummaryService
from app.application.rbac_service import RbacService
from app.application.pipeline_service import PipelineService
from app.application.reminder_service import ReminderService
from app.application.use_cases import AppointmentsService, AuthService, DoctorsService, MedicalHistoryService, PatientsService
from app.core.config import settings
from app.core.security import decode_access_token
from app.infrastructure.chatbot_session_store import ChatbotSessionStore
from app.presentation.chatbot_rate_limit import ChatbotRateLimiter
from app.infrastructure.reminder_repository import ReminderRepository
from app.infrastructure.notification_repository import NotificationRepository
from app.infrastructure.patient_document_repository import PatientDocumentRepository
from app.infrastructure.database import bootstrap_database
from app.rag.factory import RAGServices
from app.infrastructure.sqlite_repositories import (
    SQLiteAppointmentRepository,
    SQLiteDoctorRepository,
    SQLiteMedicalHistoryRepository,
    SQLitePatientRepository,
    SQLiteRefreshSessionRepository,
    SQLiteUserRepository,
)
from app.infrastructure.voice_repository import VoiceRepository
from app.voice.agent_service import AgentService
from app.voice.availability_service import AvailabilityService
from app.voice.call_service import CallService
from app.voice.identity_service import IdentityService
from app.voice.llm_service import VoiceLLMService
from app.voice.providers import get_voice_provider
from app.voice.settings_service import VoiceSettingsService
from app.voice.tools import VoiceTools

bootstrap_database()

users_repo = SQLiteUserRepository()
patients_repo = SQLitePatientRepository()
doctors_repo = SQLiteDoctorRepository()
appointments_repo = SQLiteAppointmentRepository()
medical_history_repo = SQLiteMedicalHistoryRepository()
refresh_sessions_repo = SQLiteRefreshSessionRepository()
reminders_repo = ReminderRepository()

auth_service = AuthService(users_repo, refresh_sessions_repo)
patients_service = PatientsService(patients_repo)
doctors_service = DoctorsService(doctors_repo)
appointments_service = AppointmentsService(appointments_repo, patients_repo, doctors_repo)
waiting_room_service = WaitingRoomService(appointments_service)
medical_history_service = MedicalHistoryService(medical_history_repo, patients_repo)
analytics_service = AnalyticsService()
rbac_service = RbacService(users_repo, refresh_sessions_repo)
ml_service = MlForecastService(analytics_service)
noshow_service = NoShowRiskService()
patient_summary_service = PatientAiSummaryService()
patient_document_service = PatientDocumentService(patients_service, PatientDocumentRepository())
notification_service = NotificationService(analytics_service, NotificationRepository())
search_service = SearchService()
pipeline_service = PipelineService()
reminder_service = ReminderService(
    appointments_repo,
    patients_repo,
    reminders_repo,
    hours_before=settings.reminder_hours_before,
)
chatbot_sessions = ChatbotSessionStore()
rag_services = RAGServices(settings)
chatbot_service = ChatbotService(settings, chatbot_sessions, rag_services.retriever)
chatbot_rate_limiter = ChatbotRateLimiter(max_per_minute=settings.chatbot_query_rate_limit)

voice_repo = VoiceRepository()
voice_identity = IdentityService(patients_repo)
voice_availability = AvailabilityService(doctors_repo, appointments_repo)
voice_settings_service = VoiceSettingsService(voice_repo)
voice_tools = VoiceTools(
    identity=voice_identity,
    availability=voice_availability,
    appointments=appointments_service,
    doctors=doctors_service,
    patients=patients_repo,
    repo=voice_repo,
    settings_svc=voice_settings_service,
)
call_service = CallService(voice_repo, settings_svc=voice_settings_service)
voice_llm = VoiceLLMService()
agent_service = AgentService(call_service, voice_tools, voice_repo, llm=voice_llm, settings_svc=voice_settings_service)
voice_provider = get_voice_provider(call_service)

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
