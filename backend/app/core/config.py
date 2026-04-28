from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = "SIH IA Backend"
    jwt_secret: str = "change-me-in-production-please-use-32-plus-bytes"
    jwt_algorithm: str = "HS256"
    access_token_exp_minutes: int = 60
    refresh_token_exp_days: int = 7
    max_refresh_sessions_per_user: int = 3
    database_url: str = "app.db"


settings = Settings()
