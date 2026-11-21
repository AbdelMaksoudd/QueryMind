"""Account listing.

Public only while DEMO_MODE is enabled (the UI's quick account switcher).
Once demo mode is off, only admins can list accounts.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, col, select

from app.config import settings
from app.database import get_session
from app.models.entities import User
from app.models.enums import AccountStatus, UserRole
from app.schemas.library import UserRead
from app.security import get_optional_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=List[UserRead])
def list_users(
    only_active: bool = Query(False, description="Return only active accounts"),
    current_user: Optional[User] = Depends(get_optional_user),
    session: Session = Depends(get_session),
):
    if not settings.DEMO_MODE:
        if current_user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")

    statement = select(User)
    if only_active:
        statement = statement.where(User.account_status == AccountStatus.ACTIVE)
    statement = statement.order_by(col(User.user_id))
    return [UserRead.model_validate(user) for user in session.exec(statement).all()]
