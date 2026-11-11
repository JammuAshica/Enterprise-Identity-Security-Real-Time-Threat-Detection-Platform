import secrets
from typing import List, Union
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Enterprise Identity Security & Real-Time Threat Detection Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "sqlite:///./security_platform.db"

    # JWT Authentication
    JWT_SECRET_KEY: str = secrets.token_urlsafe(32)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Threat Detection Engine
    MAX_FAILED_LOGIN_ATTEMPTS: int = 5
    ACCOUNT_LOCKOUT_DURATION_MINUTES: int = 15
    BRUTE_FORCE_WINDOW_MINUTES: int = 5
    BRUTE_FORCE_THRESHOLD: int = 5
    IMPOSSIBLE_TRAVEL_SPEED_KMH: float = 800.0
    PRIVILEGE_ESCALATION_THRESHOLD: int = 3

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list):
            return v
        return ["*"]

    @model_validator(mode="after")
    def validate_security_configuration(self) -> "Settings":
        if self.ENVIRONMENT.lower() in {"production", "staging"}:
            if len(self.JWT_SECRET_KEY) < 32:
                raise ValueError(
                    "JWT_SECRET_KEY must be supplied through the environment "
                    "and contain at least 32 characters outside development."
                )
            if "*" in self.CORS_ORIGINS:
                raise ValueError("Wildcard CORS origins are not allowed outside development.")
        return self

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
