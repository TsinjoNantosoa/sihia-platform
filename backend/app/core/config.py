from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = "SIH IA Backend"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_exp_minutes: int = 60


settings = Settings()
