"""Application configuration, loaded from environment variables / .env file."""

from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve .env relative to the backend/ directory, not the process working directory.
_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    PROJECT_NAME: str = "QueryMind Library API"
    VERSION: str = "2.0.0"
    API_PREFIX: str = "/api"

    # Database -------------------------------------------------------------
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/db"
    DB_ECHO: bool = False
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_RECYCLE: int = 1800  # seconds

    # CORS -----------------------------------------------------------------
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    # Borrowing policy -----------------------------------------------------
    # The schema stores prices per loan, not per book, so the catalog uses a
    # configurable suggested fee instead of deriving one from noisy loan data.
    DEFAULT_BORROW_PRICE: float = 5.00
    DEFAULT_LOAN_DAYS: int = 14
    MAX_LOAN_DAYS: int = 60
    OVERDUE_FINE_PER_DAY: float = 1.00

    # Authentication -------------------------------------------------------
    JWT_SECRET: str = "querymind-local-dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # One-click account switching for demos. Disable in production.
    DEMO_MODE: bool = True

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def _use_psycopg3(cls, value: str) -> str:
        """Pin the SQLAlchemy driver to psycopg 3 so behaviour is deterministic."""
        if isinstance(value, str) and value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value

    @field_validator("DATABASE_URL")
    @classmethod
    def _reject_placeholders(cls, value: str) -> str:
        if "PASSWORD@" in value or "@HOST" in value or "HOST:" in value:
            raise ValueError(
                "DATABASE_URL still has placeholder values (HOST/PASSWORD). "
                "Put your real Neon host and password in backend/.env."
            )
        return value

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _parse_cors_origins(cls, value):
        if isinstance(value, str):
            value = value.strip()
            if value.startswith("[") and value.endswith("]"):
                import json

                try:
                    value = json.loads(value)
                except ValueError:
                    value = [part.strip() for part in value.strip("[]").split(",")]
            else:
                value = [part.strip() for part in value.split(",")]
        return [origin for origin in value if origin]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
