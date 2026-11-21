"""Password hashing, JWT handling and authentication dependencies."""

from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from app.config import settings
from app.database import get_session
from app.models.entities import User
from app.models.enums import AccountStatus, UserRole

bearer_scheme = HTTPBearer(auto_error=False)

_UNAUTHENTICATED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated or session expired.",
    headers={"WWW-Authenticate": "Bearer"},
)


def hash_password(password: str) -> str:
    # bcrypt only considers the first 72 bytes; the schema rejects longer values.
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, stored: str) -> bool:
    if stored.startswith("$2"):
        try:
            return bcrypt.checkpw(password.encode("utf-8"), stored.encode("utf-8"))
        except ValueError:
            return False
    # Legacy seed accounts stored plaintext. Kept for backwards compatibility;
    # login upgrades them to bcrypt. Remove once all accounts are migrated.
    import hmac

    return hmac.compare_digest(stored, password)


def is_hashed(stored: str) -> bool:
    return stored.startswith("$2")


def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[int]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return int(payload["sub"])
    except (jwt.PyJWTError, KeyError, TypeError, ValueError):
        return None


def _resolve_user(
    credentials: Optional[HTTPAuthorizationCredentials], session: Session
) -> Optional[User]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        return None
    user_id = decode_access_token(credentials.credentials)
    if user_id is None:
        return None
    user = session.get(User, user_id)
    if user is None or user.account_status != AccountStatus.ACTIVE:
        return None
    return user


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    session: Session = Depends(get_session),
) -> Optional[User]:
    """Catalog browsing is public; this adds 'borrowed_by_me' when logged in."""
    return _resolve_user(credentials, session)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    session: Session = Depends(get_session),
) -> User:
    user = _resolve_user(credentials, session)
    if user is None:
        raise _UNAUTHENTICATED
    return user


def get_current_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> int:
    """Token-only dependency for write endpoints.

    Deliberately does not resolve a User ORM object, so the write session of an
    endpoint can load and update the same row without attaching conflicts.
    """
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _UNAUTHENTICATED
    user_id = decode_access_token(credentials.credentials)
    if user_id is None:
        raise _UNAUTHENTICATED
    return user_id


def get_staff_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    session: Session = Depends(get_session),
) -> User:
    """Librarian desk: Admin or Staff may perform daily operations."""
    user = _resolve_user(credentials, session)
    if user is None:
        raise _UNAUTHENTICATED
    if user.role not in (UserRole.ADMIN, UserRole.STAFF):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff access required.")
    return user


def get_admin_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    session: Session = Depends(get_session),
) -> User:
    user = _resolve_user(credentials, session)
    if user is None:
        raise _UNAUTHENTICATED
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    return user


def require_demo_mode() -> None:
    if not settings.DEMO_MODE:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found.")
