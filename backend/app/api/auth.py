"""Account registration, login and the explicitly-labelled demo login."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, col, select

from app.config import settings
from app.database import get_session, get_write_session
from app.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.models.entities import User
from app.models.enums import AccountStatus, UserRole
from app.schemas.auth import (
    AuthConfigResponse,
    ChangePasswordRequest,
    DemoLoginRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    TokenResponse,
    UpdateProfileRequest,
)
from app.schemas.library import UserRead
from app.security import (
    create_access_token,
    get_current_user,
    get_current_user_id,
    hash_password,
    is_hashed,
    require_demo_mode,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _token_for(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user.user_id),
        user=UserRead.model_validate(user),
    )


def _active_user(session: Session, user_id: int) -> User:
    user = session.get(User, user_id)
    if user is None:
        raise NotFoundError("Account not found.")
    if user.account_status != AccountStatus.ACTIVE:
        raise ForbiddenError("This account is not active.")
    return user


@router.get("/config", response_model=AuthConfigResponse)
def auth_config():
    return AuthConfigResponse(demo_mode=settings.DEMO_MODE)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, session: Session = Depends(get_write_session)):
    existing = session.exec(select(User).where(col(User.email).ilike(payload.email))).first()
    if existing:
        raise ConflictError("An account with this email already exists.")

    now = _now()
    user = User(
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=str(payload.email),
        password=hash_password(payload.password),
        phone=payload.phone,
        address=payload.address,
        role=UserRole.CUSTOMER,
        account_status=AccountStatus.ACTIVE,
        created_at=now,
        updated_at=now,
    )
    session.add(user)
    try:
        session.flush()
    except IntegrityError:
        raise ConflictError("An account with this email already exists.")
    return _token_for(user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, session: Session = Depends(get_write_session)):
    user = session.exec(select(User).where(col(User.email).ilike(payload.email))).first()
    if user is None or not verify_password(payload.password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    if user.account_status != AccountStatus.ACTIVE:
        raise ForbiddenError("This account is not active. Please contact the library.")

    # Transparently upgrade legacy plaintext passwords on first successful login.
    if not is_hashed(user.password):
        user.password = hash_password(payload.password)
        user.updated_at = _now()
        session.add(user)
        session.flush()

    return _token_for(user)


@router.post("/demo-login", response_model=TokenResponse)
def demo_login(payload: DemoLoginRequest, session: Session = Depends(get_session)):
    """Presentation shortcut: obtain a token for an existing account without a password."""
    require_demo_mode()
    user = session.get(User, payload.user_id)
    if user is None:
        raise NotFoundError(f"User with id {payload.user_id} does not exist.")
    if user.account_status != AccountStatus.ACTIVE:
        raise ForbiddenError("Only active accounts can be used in demo mode.")
    return _token_for(user)


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return UserRead.model_validate(current_user)


@router.patch("/me", response_model=UserRead)
def update_profile(
    payload: UpdateProfileRequest,
    user_id: int = Depends(get_current_user_id),
    session: Session = Depends(get_write_session),
):
    user = _active_user(session, user_id)
    user.first_name = payload.first_name
    user.last_name = payload.last_name
    user.phone = payload.phone
    user.address = payload.address
    user.updated_at = _now()
    session.add(user)
    session.flush()
    return UserRead.model_validate(user)


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    user_id: int = Depends(get_current_user_id),
    session: Session = Depends(get_write_session),
):
    user = _active_user(session, user_id)
    if not verify_password(payload.current_password, user.password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")
    if verify_password(payload.new_password, user.password):
        raise ConflictError("New password must be different from the current one.")

    user.password = hash_password(payload.new_password)
    user.updated_at = _now()
    session.add(user)
    session.flush()
    return MessageResponse(message="Password updated successfully.")
