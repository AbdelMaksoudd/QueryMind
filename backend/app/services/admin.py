"""Administrator operations: statistics, payment desk, catalog and accounts."""

import re
import secrets
from datetime import datetime, timezone
from typing import List

from sqlalchemy import func, text
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, col, select

from app.exceptions import ConflictError, NotFoundError
from app.models.entities import (
    Author,
    AuthorBook,
    Book,
    BookCategory,
    BookCopy,
    Category,
    Loan,
    Publisher,
    User,
)
from app.models.enums import AccountStatus, CopyStatus, LoanStatus, UserRole
from app.schemas.admin import (
    AdminPaymentRead,
    AdminStats,
    CreateBookRequest,
    CreateStaffRequest,
    UpdateBookRequest,
    WalkInLoanRequest,
)
from app.schemas.library import LoanRead
from app.security import hash_password
from app.services.borrowing import borrow_book
from app.services.payments import (
    get_payment_info,
    has_identity_columns,
    has_payment_columns,
)


def get_stats(session: Session) -> AdminStats:
    ready = has_payment_columns(session)

    def count(statement) -> int:
        return session.exec(select(func.count()).select_from(statement.subquery())).one()

    books = count(select(Book.book_id).where(Book.is_active.is_(True)))
    copies = count(select(BookCopy.copy_id))
    available = count(select(BookCopy.copy_id).where(BookCopy.status == CopyStatus.AVAILABLE))
    rented = count(select(BookCopy.copy_id).where(BookCopy.status == CopyStatus.RENTED))
    active = count(select(Loan.loan_id).where(Loan.status == LoanStatus.ACTIVE))
    overdue = count(select(Loan.loan_id).where(Loan.status == LoanStatus.OVERDUE))
    users = count(select(User.user_id))

    if ready:
        row = session.execute(
            text(
                "SELECT "
                "count(*) FILTER (WHERE payment_status = 'Pending') AS pending, "
                "count(*) FILTER (WHERE payment_status = 'Paid') AS paid, "
                "coalesce(sum(final_price) FILTER (WHERE payment_status = 'Paid'), 0) AS collected, "
                "coalesce(sum(final_price) FILTER (WHERE payment_status = 'Pending'), 0) AS awaiting "
                'FROM "Loan"'
            )
        ).one()
        pending, paid, collected, awaiting = row
    else:
        rows = session.exec(select(Loan.status, Loan.final_price)).all()
        pending = sum(1 for status, _ in rows if status not in (LoanStatus.RETURNED, LoanStatus.RETURNED_OVERDUE))
        paid = len(rows) - pending
        collected = sum(float(amount) for status, amount in rows if status in (LoanStatus.RETURNED, LoanStatus.RETURNED_OVERDUE))
        awaiting = 0.0

    return AdminStats(
        books=books,
        copies=copies,
        available_copies=available,
        rented_copies=rented,
        active_loans=active,
        overdue_loans=overdue,
        pending_payments=pending,
        paid_payments=paid,
        collected_amount=float(collected),
        pending_amount=float(awaiting),
        users=users,
        payment_columns_ready=ready,
    )


def list_payments(
    session: Session, *, pending_only: bool = True, query: str | None = None, limit: int = 100
) -> List[AdminPaymentRead]:
    rows = session.exec(
        select(Loan, Book.title, User.first_name, User.last_name, User.email)
        .join(BookCopy, Loan.copy_id == BookCopy.copy_id)
        .join(Book, BookCopy.book_id == Book.book_id)
        .join(User, Loan.user_id == User.user_id)
        .order_by(col(Loan.borrow_date).desc())
        .limit(limit)
    ).all()

    payment_info = get_payment_info(session, [loan.loan_id for loan, *_ in rows])
    results = []
    for loan, title, first, last, email in rows:
        info = payment_info.get(loan.loan_id, {})
        status = info.get("status")
        if not status:
            status = "Paid" if str(getattr(loan.status, "value", loan.status)).startswith("Returned") else "Pending"
        item = AdminPaymentRead(
            loan_id=loan.loan_id,
            invoice_no=f"QM-{(loan.borrow_date.year if loan.borrow_date else 2026)}-{loan.loan_id:06d}",
            user_id=loan.user_id,
            user_name=f"{first} {last}",
            email=email,
            book_title=title,
            amount=float(loan.final_price),
            fine=float(loan.fine_amount),
            status=str(getattr(loan.status, "value", loan.status)),
            payment_status=status,
            payment_method=info.get("method"),
            borrow_date=loan.borrow_date,
        )
        if pending_only and status != "Pending" and loan.fine_status != "Unpaid":
            continue
        if query:
            needle = query.lower()
            haystack = f"{item.invoice_no} {item.email} {item.user_name} {item.book_title}".lower()
            if needle not in haystack:
                continue
        results.append(item)
    return results


def _get_or_create(session: Session, model, name: str):
    existing = session.exec(select(model).where(col(model.name).ilike(name))).first()
    if existing:
        return existing
    item = model(name=name)
    session.add(item)
    session.flush()
    return item


def create_book(session: Session, payload: CreateBookRequest) -> Book:
    if payload.isbn:
        if session.exec(select(Book).where(Book.isbn == payload.isbn)).first():
            raise ConflictError("A book with this ISBN already exists.")

    author = _get_or_create(session, Author, payload.author)
    category = _get_or_create(session, Category, payload.category)
    publisher = _get_or_create(session, Publisher, payload.publisher) if payload.publisher else None

    book = Book(
        title=payload.title,
        isbn=payload.isbn,
        description=payload.description,
        cover_image_url=payload.cover_image_url,
        publication_year=payload.publication_year,
        publisher_id=publisher.publisher_id if publisher else None,
        is_active=True,
    )
    session.add(book)
    session.flush()

    session.add(AuthorBook(book_id=book.book_id, author_id=author.author_id))
    session.add(BookCategory(book_id=book.book_id, category_id=category.category_id))
    for _ in range(payload.copies):
        session.add(BookCopy(book_id=book.book_id, status=CopyStatus.AVAILABLE))
    session.flush()
    return book


def _set_copy_count(session: Session, book_id: int, target: int) -> None:
    copies = session.exec(select(BookCopy).where(BookCopy.book_id == book_id)).all()
    if target > len(copies):
        for _ in range(target - len(copies)):
            session.add(BookCopy(book_id=book_id, status=CopyStatus.AVAILABLE))
        return

    need = len(copies) - target
    removable = []
    for copy in copies:
        if copy.status != CopyStatus.AVAILABLE:
            continue
        if session.exec(select(Loan.loan_id).where(Loan.copy_id == copy.copy_id)).first():
            continue
        removable.append(copy)
    if len(removable) < need:
        raise ConflictError(
            "Cannot reduce copies: some are on loan or unavailable. "
            "Add copies instead, or hide the book with is_active."
        )
    for copy in removable[:need]:
        session.delete(copy)


def update_book(session: Session, book_id: int, payload: UpdateBookRequest) -> Book:
    book = session.get(Book, book_id)
    if book is None:
        raise NotFoundError(f"Book with id {book_id} not found.")

    fields = payload.model_fields_set
    for field in ("title", "isbn", "description", "cover_image_url", "publication_year"):
        if field in fields:
            setattr(book, field, getattr(payload, field))

    if "author" in fields and payload.author:
        author = _get_or_create(session, Author, payload.author)
        book.writers = [author]
    if "category" in fields and payload.category:
        category = _get_or_create(session, Category, payload.category)
        book.categories = [category]
    if "publisher" in fields:
        if payload.publisher:
            publisher = _get_or_create(session, Publisher, payload.publisher)
            book.publisher_id = publisher.publisher_id
        else:
            book.publisher_id = None

    if "copies" in fields and payload.copies is not None:
        _set_copy_count(session, book_id, payload.copies)
    if "is_active" in fields and payload.is_active is not None:
        book.is_active = payload.is_active

    session.add(book)
    session.flush()
    return book


def set_book_active(session: Session, book_id: int, is_active: bool) -> Book:
    book = session.get(Book, book_id)
    if book is None:
        raise NotFoundError(f"Book with id {book_id} not found.")
    book.is_active = is_active
    session.flush()
    return book


def set_user_status(session: Session, user_id: int, account_status) -> User:
    user = session.get(User, user_id)
    if user is None:
        raise NotFoundError(f"User with id {user_id} not found.")
    user.account_status = account_status
    session.flush()
    return user


def create_staff(session: Session, payload: CreateStaffRequest) -> User:
    if session.exec(select(User).where(col(User.email).ilike(payload.email))).first():
        raise ConflictError("An account with this email already exists.")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    user = User(
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=str(payload.email),
        password=hash_password(payload.password),
        phone=payload.phone,
        role=UserRole.STAFF,
        account_status=AccountStatus.ACTIVE,
        created_at=now,
        updated_at=now,
    )
    session.add(user)
    try:
        session.flush()
    except IntegrityError:
        raise ConflictError("An account with this email already exists.")
    return user


def change_user_role(
    session: Session, *, user_id: int, role: str, admin_id: int
) -> User:
    if user_id == admin_id:
        raise ConflictError("You cannot change your own role.")
    user = session.get(User, user_id)
    if user is None:
        raise NotFoundError(f"User with id {user_id} not found.")
    if user.role == UserRole.ADMIN:
        raise ConflictError("Admin accounts cannot be changed from here.")

    user.role = UserRole(role)
    user.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    session.add(user)
    session.flush()
    return user


def create_walkin_loan(
    session: Session, *, payload: WalkInLoanRequest, admin_id: int
) -> LoanRead:
    """Lend a book to a walk-in visitor verified by staff at the desk.

    A dedicated internal identity is used instead of faking a website account:
    the password is random, online login is meaningless, and the national id is
    stored for audit. Reusing the same id links repeat visits to one record.
    """
    if not has_identity_columns(session):
        raise RuntimeError("Run migrations/002_walkin_loans.sql before creating walk-in loans.")

    national_id = payload.national_id.strip().upper()
    # Identity columns are queried with explicit SQL so the mapped User model
    # stays valid even before the DBA applies migrations/002_walkin_loans.sql.
    existing = session.execute(
        text(
            'SELECT user_id, first_name, last_name, account_status::text '
            'FROM "User" WHERE national_id = :nid'
        ),
        {"nid": national_id},
    ).first()

    if existing:
        user_id, first, last, status = existing
        if (first.lower(), last.lower()) != (
            payload.first_name.lower(),
            payload.last_name.lower(),
        ):
            raise ConflictError("This identity number is registered under a different name.")
        if status != AccountStatus.ACTIVE.value:
            raise ConflictError("This visitor's account is not active.")
    else:
        safe_id = re.sub(r"[^A-Za-z0-9]", "", national_id).lower() or secrets.token_hex(6)
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        user = User(
            first_name=payload.first_name,
            last_name=payload.last_name,
            email=f"walkin-{safe_id}@guests.querymind.local",
            password=hash_password(secrets.token_urlsafe(32)),
            phone=payload.phone,
            address=payload.notes,
            role=UserRole.CUSTOMER,
            account_status=AccountStatus.ACTIVE,
            created_at=now,
            updated_at=now,
        )
        session.add(user)
        session.flush()
        user_id = user.user_id
        session.execute(
            text(
                'UPDATE "User" SET national_id = :nid, is_walkin = true, '
                "id_verified_at = :now, id_verified_by = :admin WHERE user_id = :id"
            ),
            {"nid": national_id, "now": now, "admin": admin_id, "id": user_id},
        )
        session.flush()

    return borrow_book(
        session,
        book_id=payload.book_id,
        user_id=user_id,
        days=payload.days,
    )
