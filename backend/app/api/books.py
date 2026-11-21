"""Book catalog and borrowing endpoints."""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.database import get_session, get_write_session
from app.exceptions import ForbiddenError, NotFoundError
from app.models.entities import User
from app.models.enums import UserRole
from app.schemas.book import BookListResponse, BookRead
from app.schemas.library import BorrowRequest, LoanRead
from app.security import get_current_user, get_optional_user
from app.services.borrowing import borrow_book
from app.services.catalog import get_categories, list_books

router = APIRouter(prefix="/books", tags=["Books"])


@router.get("", response_model=BookListResponse)
def get_books(
    category: Optional[str] = Query(None, description="Exact category name"),
    search: Optional[str] = Query(None, description="Search in title, ISBN or author"),
    is_available: Optional[bool] = Query(None, description="Filter by copy availability"),
    include_inactive: bool = Query(False, description="Admin: include soft-deleted books"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: Optional[User] = Depends(get_optional_user),
    session: Session = Depends(get_session),
):
    if include_inactive and (current_user is None or current_user.role != UserRole.ADMIN):
        raise ForbiddenError("Admin access required to view hidden books.")
    return list_books(
        session,
        category=category,
        search=search,
        is_available=is_available,
        include_inactive=include_inactive,
        user_id=current_user.user_id if current_user else None,
        limit=limit,
        offset=offset,
    )


@router.get("/categories", response_model=List[str])
def get_book_categories(session: Session = Depends(get_session)):
    return get_categories(session)


@router.get("/{book_id}", response_model=BookRead)
def get_book(
    book_id: int,
    include_inactive: bool = Query(False, description="Admin: fetch a hidden book"),
    current_user: Optional[User] = Depends(get_optional_user),
    session: Session = Depends(get_session),
):
    if include_inactive and (current_user is None or current_user.role != UserRole.ADMIN):
        raise ForbiddenError("Admin access required to view hidden books.")
    result = list_books(
        session,
        book_id=book_id,
        include_inactive=include_inactive,
        user_id=current_user.user_id if current_user else None,
        limit=1,
    )
    if not result.items:
        raise NotFoundError(f"Book with id {book_id} not found.")
    return result.items[0]


@router.patch("/{book_id}/borrow", response_model=LoanRead)
def borrow(
    book_id: int,
    payload: BorrowRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_write_session),
):
    return borrow_book(
        session,
        book_id=book_id,
        user_id=current_user.user_id,
        days=payload.days,
    )

