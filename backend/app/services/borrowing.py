"""Borrowing transactions.

Every write is a single DB transaction: a loan row is created/updated and the
matching copy status is changed together. Row-level locking (SKIP LOCKED)
prevents two customers from grabbing the same copy concurrently.
"""

import math
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional

from sqlmodel import Session, col, select

from app.config import settings
from app.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.models.entities import Book, BookCopy, Loan, User
from app.models.enums import AccountStatus, CopyStatus, FineStatus, LoanStatus
from app.schemas.library import LoanRead
from app.services.payments import enrich_loans


def _require_active_customer(session: Session, user_id: int) -> User:
    user = session.get(User, user_id)
    if user is None:
        raise NotFoundError(f"User with id {user_id} does not exist.")
    if user.account_status != AccountStatus.ACTIVE:
        raise ForbiddenError(
            f"Account is {user.account_status.value}; only active accounts can borrow or return books."
        )
    return user


def _money(value: float) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"))


def _now() -> datetime:
    """Naive UTC timestamp, matching the TIMESTAMP (without time zone) columns."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _to_loan_read(loan: Loan, book: Optional[Book]) -> LoanRead:
    return LoanRead(
        loan_id=loan.loan_id,
        user_id=loan.user_id,
        copy_id=loan.copy_id,
        book_id=book.book_id if book else None,
        book_title=book.title if book else None,
        borrow_date=loan.borrow_date,
        due_date=loan.due_date,
        return_date=loan.return_date,
        status=loan.status,
        rental_price=loan.rental_price,
        discount_percentage=loan.discount_percentage,
        final_price=loan.final_price,
        fine_amount=loan.fine_amount,
        fine_status=loan.fine_status,
    )


def borrow_book(session: Session, *, book_id: int, user_id: int, days: Optional[int] = None) -> LoanRead:
    """Lend one available copy of ``book_id`` to ``user_id``."""
    _require_active_customer(session, user_id)

    book = session.get(Book, book_id)
    if book is None or not book.is_active:
        raise NotFoundError(f"Active book with id {book_id} not found.")

    duration = min(days or settings.DEFAULT_LOAN_DAYS, settings.MAX_LOAN_DAYS)
    copy = session.exec(
        select(BookCopy)
        .where(
            BookCopy.book_id == book_id,
            BookCopy.status == CopyStatus.AVAILABLE,
        )
        .order_by(col(BookCopy.copy_id))
        .with_for_update(skip_locked=True)
        .limit(1)
    ).first()

    if copy is None:
        raise ConflictError("No available copy of this book at the moment.")

    now = _now()
    price = _money(settings.DEFAULT_BORROW_PRICE)
    loan = Loan(
        user_id=user_id,
        copy_id=copy.copy_id,
        borrow_date=now,
        due_date=now + timedelta(days=duration),
        status=LoanStatus.ACTIVE,
        rental_price=price,
        discount_percentage=Decimal("0.00"),
        final_price=price,
        fine_amount=Decimal("0.00"),
        fine_status=None,
        created_at=now,
        updated_at=now,
    )

    copy.status = CopyStatus.RENTED
    copy.updated_at = now

    session.add(loan)
    session.flush()  # obtain loan_id; the request-level dependency commits

    return enrich_loans(session, [_to_loan_read(loan, book)])[0]


def _settle_return(session: Session, loan: Loan) -> LoanRead:
    """Close a loan and free its copy. Called only by the librarian desk."""
    now = _now()
    late_days = max(0, math.ceil((now - loan.due_date).total_seconds() / 86400))

    if late_days:
        loan.status = LoanStatus.RETURNED_OVERDUE
        loan.fine_status = FineStatus.UNPAID
        loan.fine_amount = (_money(settings.OVERDUE_FINE_PER_DAY) * late_days).quantize(Decimal("0.01"))
    else:
        loan.status = LoanStatus.RETURNED
        loan.fine_status = FineStatus.PAID
        loan.fine_amount = Decimal("0.00")

    loan.return_date = now
    loan.updated_at = now

    copy = session.get(BookCopy, loan.copy_id)
    if copy is None:
        raise NotFoundError(f"Copy with id {loan.copy_id} not found.")
    copy.status = CopyStatus.AVAILABLE
    copy.updated_at = now

    book = session.exec(
        select(Book).join(BookCopy, Book.book_id == BookCopy.book_id).where(BookCopy.copy_id == loan.copy_id)
    ).first()
    session.flush()
    return enrich_loans(session, [_to_loan_read(loan, book)])[0]


def return_loan(session: Session, *, loan_id: int) -> LoanRead:
    """Admin-only: confirm that the physical copy was handed back."""
    loan = session.exec(
        select(Loan)
        .where(
            Loan.loan_id == loan_id,
            Loan.status.in_([LoanStatus.ACTIVE, LoanStatus.OVERDUE]),
        )
        .with_for_update(skip_locked=True)
    ).first()

    if loan is None:
        raise ConflictError("Loan not found or already returned.")

    return _settle_return(session, loan)


def get_loan(session: Session, *, loan_id: int, user_id: int, is_admin: bool = False) -> LoanRead:
    """Fetch one loan with its book, restricted to its owner unless admin."""
    statement = (
        select(Loan, Book)
        .join(BookCopy, Loan.copy_id == BookCopy.copy_id)
        .join(Book, BookCopy.book_id == Book.book_id)
        .where(Loan.loan_id == loan_id)
    )
    if not is_admin:
        statement = statement.where(Loan.user_id == user_id)

    row = session.exec(statement).first()
    if row is None:
        raise NotFoundError("Loan not found.")
    loan, book = row
    return enrich_loans(session, [_to_loan_read(loan, book)])[0]


def list_loans(
    session: Session,
    *,
    user_id: Optional[int] = None,
    status: Optional[LoanStatus] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[LoanRead]:
    """List loans with the related book information, newest first."""
    statement = (
        select(Loan, Book)
        .join(BookCopy, Loan.copy_id == BookCopy.copy_id)
        .join(Book, BookCopy.book_id == Book.book_id)
    )
    if user_id is not None:
        statement = statement.where(Loan.user_id == user_id)
    if status is not None:
        statement = statement.where(Loan.status == status)

    statement = statement.order_by(col(Loan.borrow_date).desc()).offset(offset).limit(limit)
    return enrich_loans(
        session,
        [_to_loan_read(loan, book) for loan, book in session.exec(statement).all()],
    )
