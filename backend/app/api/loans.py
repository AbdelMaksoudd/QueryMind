"""Loan history endpoint."""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.database import get_session
from app.exceptions import ForbiddenError
from app.models.entities import User
from app.models.enums import LoanStatus, UserRole
from app.schemas.library import LoanRead
from app.security import get_current_user
from app.services.borrowing import get_loan, list_loans

router = APIRouter(prefix="/loans", tags=["Loans"])


@router.get("", response_model=List[LoanRead])
def get_loans(
    user_id: Optional[int] = Query(None, gt=0, description="Admin only: view another account"),
    status: Optional[LoanStatus] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    target_user = current_user.user_id
    if user_id is not None and user_id != current_user.user_id:
        if current_user.role != UserRole.ADMIN:
            raise ForbiddenError("You can only view your own loans.")
        target_user = user_id

    return list_loans(session, user_id=target_user, status=status, limit=limit, offset=offset)


@router.get("/{loan_id}", response_model=LoanRead)
def get_loan_by_id(
    loan_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return get_loan(
        session,
        loan_id=loan_id,
        user_id=current_user.user_id,
        is_admin=current_user.role == UserRole.ADMIN,
    )
