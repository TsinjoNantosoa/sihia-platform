import os

from pydantic import BaseModel, Field


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
            cors_origins=origins or ["http://localhost:5173"],
            environment=os.getenv("ENVIRONMENT", "development"),
        )

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


settings = Settings.from_env()

if settings.is_production and settings.jwt_secret.startswith("change-me"):
    raise RuntimeError("JWT_SECRET doit être défini en production.")
