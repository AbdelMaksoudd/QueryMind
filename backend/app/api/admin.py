"""Admin panel: dashboard, payment desk, catalog and account management."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlmodel import Session, col, select

from app.database import get_session, get_write_session
from app.exceptions import NotFoundError
from app.models.entities import Loan, User
from app.schemas.admin import (
    AdminPaymentRead,
    AdminStats,
    AdminUserRead,
    BookActionResponse,
    CreateBookRequest,
    CreateStaffRequest,
    RecordPaymentRequest,
    UpdateAccountStatusRequest,
    UpdateBookRequest,
    UpdateRoleRequest,
    WalkInLoanRequest,
)
from app.schemas.auth import MessageResponse
from app.schemas.library import LoanRead, UserRead
from app.security import get_admin_user, get_staff_user
from app.services.admin import (
    change_user_role,
    create_book,
    create_staff,
    create_walkin_loan,
    get_stats,
    list_payments,
    set_book_active,
    set_user_status,
    update_book,
)
from app.services.borrowing import return_loan
from app.services.payments import has_identity_columns, record_payment

router = APIRouter(prefix="/admin", tags=["Administration"])


# --- Staff / Admin: daily operations ---------------------------------------

@router.get("/stats", response_model=AdminStats)
def admin_stats(
    _staff: User = Depends(get_staff_user),
    session: Session = Depends(get_session),
):
    return get_stats(session)


@router.get("/payments", response_model=List[AdminPaymentRead])
def admin_payments(
    pending_only: bool = Query(True, description="Only unpaid loans / unpaid fines"),
    query: str | None = Query(None, description="Invoice number, email, name or book title"),
    limit: int = Query(100, ge=1, le=200),
    _staff: User = Depends(get_staff_user),
    session: Session = Depends(get_session),
):
    return list_payments(session, pending_only=pending_only, query=query, limit=limit)


@router.post("/payments/{loan_id}", response_model=MessageResponse)
def admin_record_payment(
    loan_id: int,
    payload: RecordPaymentRequest,
    actor: User = Depends(get_staff_user),
    session: Session = Depends(get_write_session),
):
    if session.get(Loan, loan_id) is None:
        raise NotFoundError(f"Loan with id {loan_id} not found.")
    try:
        record_payment(session, loan_id=loan_id, admin_id=actor.user_id, method=payload.method)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    return MessageResponse(message="Payment recorded. The invoice is now marked as paid.")


@router.post("/loans/{loan_id}/return", response_model=LoanRead)
def admin_return_loan(
    loan_id: int,
    _staff: User = Depends(get_staff_user),
    session: Session = Depends(get_write_session),
):
    """Staff confirms the physical copy was handed back."""
    return return_loan(session, loan_id=loan_id)


@router.post("/books", response_model=BookActionResponse, status_code=status.HTTP_201_CREATED)
def admin_create_book(
    payload: CreateBookRequest,
    _staff: User = Depends(get_staff_user),
    session: Session = Depends(get_write_session),
):
    book = create_book(session, payload)
    return BookActionResponse(
        book_id=book.book_id,
        message=f"Added '{book.title}' with {payload.copies} copy/copies.",
    )


@router.patch("/books/{book_id}", response_model=BookActionResponse)
def admin_update_book(
    book_id: int,
    payload: UpdateBookRequest,
    _staff: User = Depends(get_staff_user),
    session: Session = Depends(get_write_session),
):
    book = update_book(session, book_id, payload)
    return BookActionResponse(book_id=book.book_id, message="Book details updated.")


@router.patch("/books/{book_id}/active", response_model=BookActionResponse)
def admin_set_book_active(
    book_id: int,
    is_active: bool = Query(..., description="True to publish, False to soft-delete"),
    _staff: User = Depends(get_staff_user),
    session: Session = Depends(get_write_session),
):
    book = set_book_active(session, book_id, is_active)
    return BookActionResponse(
        book_id=book.book_id,
        message="Book is now visible in the catalog." if is_active else "Book was hidden (soft-deleted).",
    )


@router.post("/walkin-loans", response_model=LoanRead, status_code=status.HTTP_201_CREATED)
def admin_walkin_loan(
    payload: WalkInLoanRequest,
    actor: User = Depends(get_staff_user),
    session: Session = Depends(get_write_session),
):
    try:
        return create_walkin_loan(session, payload=payload, admin_id=actor.user_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))


# --- Admin only: accounts and roles ----------------------------------------

@router.get("/users", response_model=List[AdminUserRead])
def admin_list_users(
    _admin: User = Depends(get_admin_user),
    session: Session = Depends(get_session),
):
    users = session.exec(select(User).order_by(col(User.user_id))).all()

    identity = {}
    if has_identity_columns(session):
        identity = {
            row[0]: {"national_id": row[1], "is_walkin": row[2]}
            for row in session.execute(
                text('SELECT user_id, national_id, is_walkin FROM "User"')
            ).all()
        }

    return [
        AdminUserRead(
            **UserRead.model_validate(user).model_dump(),
            **identity.get(user.user_id, {"national_id": None, "is_walkin": False}),
        )
        for user in users
    ]


@router.patch("/users/{user_id}/status", response_model=UserRead)
def admin_set_user_status(
    user_id: int,
    payload: UpdateAccountStatusRequest,
    _admin: User = Depends(get_admin_user),
    session: Session = Depends(get_write_session),
):
    return UserRead.model_validate(set_user_status(session, user_id, payload.account_status))


@router.post("/staff", response_model=AdminUserRead, status_code=status.HTTP_201_CREATED)
def admin_create_staff(
    payload: CreateStaffRequest,
    _admin: User = Depends(get_admin_user),
    session: Session = Depends(get_write_session),
):
    user = create_staff(session, payload)
    return AdminUserRead(
        **UserRead.model_validate(user).model_dump(),
        national_id=None,
        is_walkin=False,
    )


@router.patch("/users/{user_id}/role", response_model=UserRead)
def admin_change_role(
    user_id: int,
    payload: UpdateRoleRequest,
    admin: User = Depends(get_admin_user),
    session: Session = Depends(get_write_session),
):
    user = change_user_role(session, user_id=user_id, role=payload.role, admin_id=admin.user_id)
    return UserRead.model_validate(user)
