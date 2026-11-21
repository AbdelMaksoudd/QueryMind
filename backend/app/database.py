"""Database engine and session management.

The database schema is owned externally (see backend/history_querys.sql).
This module never creates or migrates tables.
"""

from collections.abc import Generator

from sqlalchemy import text
from sqlmodel import Session, create_engine

from app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DB_ECHO,
    pool_pre_ping=True,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_recycle=settings.DB_POOL_RECYCLE,
)


def get_session() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a read-only scoped session."""
    with Session(engine) as session:
        yield session


def get_write_session() -> Generator[Session, None, None]:
    """Unit-of-work dependency: commit on success, roll back on any error."""
    with Session(engine) as session:
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise


def check_database() -> bool:
    """Return True when the database is reachable."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
