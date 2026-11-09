from typing import Generator
from sqlmodel import create_engine, Session
from app.config import settings

# Engine configuration (Read-Only queries)
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args=connect_args
)


def get_session() -> Generator[Session, None, None]:
    """Dependency injection helper for FastAPI routes to access DB session (Read-Only)."""
    with Session(engine) as session:
        yield session



