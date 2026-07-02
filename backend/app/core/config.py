import os
from pathlib import Path

from pydantic import BaseModel, Field


def _load_dotenv() -> None:
    try:
        from dotenv import load_dotenv

        backend_dir = Path(__file__).resolve().parents[2]
        load_dotenv(backend_dir / ".env", override=True)
        load_dotenv(backend_dir.parent / ".env", override=False)
    except ImportError:
        pass


_load_dotenv()


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


class Settings(BaseModel):
    app_name: str = "SIH IA Backend"
    jwt_secret: str = Field(default="change-me-in-production-please-use-32-plus-bytes", min_length=16)
    jwt_algorithm: str = "HS256"
    access_token_exp_minutes: int = 60
    refresh_token_exp_days: int = 7
    max_refresh_sessions_per_user: int = 3
    database_url: str = "app.db"
    audit_log_path: str = "logs/audit.jsonl"
    ml_use_prophet: bool = True
    reminder_email_mode: str = "log"
    reminder_sms_mode: str = "log"
    reminder_hours_before: int = 24
    reminder_log_path: str = "logs/reminders.jsonl"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "noreply@sihia.health"
    smtp_use_tls: bool = True
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""
    pipeline_import_dir: str = "data/imports"
    pipeline_stale_hours: int = 24
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4o-mini"
    chatbot_api_token: str = ""
    chatbot_query_rate_limit: int = 20
    chatbot_audit_log_path: str = "logs/chatbot.jsonl"
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:8080",
            "http://127.0.0.1:8080",
        ],
    )
    environment: str = "development"

    @classmethod
    def from_env(cls) -> "Settings":
        cors_raw = os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080",
        )
        origins = [o.strip() for o in cors_raw.split(",") if o.strip()]
        return cls(
            app_name=os.getenv("APP_NAME", "SIH IA Backend"),
            jwt_secret=os.getenv("JWT_SECRET", "change-me-in-production-please-use-32-plus-bytes"),
            jwt_algorithm=os.getenv("JWT_ALGORITHM", "HS256"),
            access_token_exp_minutes=int(os.getenv("ACCESS_TOKEN_EXP_MINUTES", "60")),
            refresh_token_exp_days=int(os.getenv("REFRESH_TOKEN_EXP_DAYS", "7")),
            max_refresh_sessions_per_user=int(os.getenv("MAX_REFRESH_SESSIONS", "3")),
            database_url=os.getenv("DATABASE_URL", "app.db"),
            audit_log_path=os.getenv("AUDIT_LOG_PATH", "logs/audit.jsonl"),
            ml_use_prophet=_env_bool("ML_USE_PROPHET", True),
            reminder_email_mode=os.getenv("REMINDER_EMAIL_MODE", "log"),
            reminder_sms_mode=os.getenv("REMINDER_SMS_MODE", "log"),
            reminder_hours_before=int(os.getenv("REMINDER_HOURS_BEFORE", "24")),
            reminder_log_path=os.getenv("REMINDER_LOG_PATH", "logs/reminders.jsonl"),
            smtp_host=os.getenv("SMTP_HOST", ""),
            smtp_port=int(os.getenv("SMTP_PORT", "587")),
            smtp_user=os.getenv("SMTP_USER", ""),
            smtp_password=os.getenv("SMTP_PASSWORD", ""),
            smtp_from=os.getenv("SMTP_FROM", "noreply@sihia.health"),
            smtp_use_tls=_env_bool("SMTP_USE_TLS", True),
            twilio_account_sid=os.getenv("TWILIO_ACCOUNT_SID", ""),
            twilio_auth_token=os.getenv("TWILIO_AUTH_TOKEN", ""),
            twilio_from_number=os.getenv("TWILIO_FROM_NUMBER", ""),
            pipeline_import_dir=os.getenv("PIPELINE_IMPORT_DIR", "data/imports"),
            pipeline_stale_hours=int(os.getenv("PIPELINE_STALE_HOURS", "24")),
            openai_api_key=os.getenv("OPENAI_API_KEY", ""),
            openai_base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
            openai_model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            chatbot_api_token=os.getenv("CHATBOT_API_TOKEN", ""),
            chatbot_query_rate_limit=int(os.getenv("CHATBOT_QUERY_RATE_LIMIT", "20")),
            chatbot_audit_log_path=os.getenv("CHATBOT_AUDIT_LOG_PATH", "logs/chatbot.jsonl"),
            cors_origins=origins or ["http://localhost:5173"],
            environment=os.getenv("ENVIRONMENT", "development"),
        )

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


settings = Settings.from_env()

if settings.is_production and settings.jwt_secret.startswith("change-me"):
    raise RuntimeError("JWT_SECRET doit être défini en production.")
