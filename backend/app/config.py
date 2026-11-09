from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import field_validator
import json


class Settings(BaseSettings):
    PROJECT_NAME: str = "Book Borrowing & Library Management API"
    VERSION: str = "1.0.0"
    
    # Database connection string (PostgreSQL by default)
    # E.g.: postgresql://username:password@localhost:5432/library_db
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/library_db"
    
    # CORS Origins allowed to communicate with this backend
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()

