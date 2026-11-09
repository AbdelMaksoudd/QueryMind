from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select, col

from app.database import get_session
from app.models.book import Book, BookRead

router = APIRouter(prefix="/books", tags=["Books (Read-Only)"])


@router.get("", response_model=List[BookRead])
def get_books(
    category: Optional[str] = Query(None, description="Filter by book category"),
    search: Optional[str] = Query(None, description="Search by title or author"),
    is_available: Optional[bool] = Query(None, description="Filter by availability status"),
    session: Session = Depends(get_session)
):
    """
    Fetch a list of books (READ-ONLY).
    Supports filtering by category, availability, and search keyword.
    Never attempts to write or create tables.
    """
    statement = select(Book)

    if category:
        statement = statement.where(Book.category == category)

    if is_available is not None:
        statement = statement.where(Book.is_available == is_available)

    if search:
        search_filter = f"%{search.lower()}%"
        statement = statement.where(
            (col(Book.title).lower().like(search_filter)) |
            (col(Book.author).lower().like(search_filter))
        )

    books = session.exec(statement).all()
    return books


@router.get("/categories", response_model=List[str])
def get_categories(session: Session = Depends(get_session)):
    """Fetch all unique categories available in the library (READ-ONLY)."""
    statement = select(Book.category).distinct()
    categories = session.exec(statement).all()
    return sorted(list(set(categories)))


@router.get("/{book_id}", response_model=BookRead)
def get_book(book_id: int, session: Session = Depends(get_session)):
    """Fetch details of a single book by ID (READ-ONLY)."""
    book = session.get(Book, book_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with id {book_id} not found"
        )
    return book


@router.patch("/{book_id}/toggle-availability", response_model=BookRead)
def toggle_availability(book_id: int, session: Session = Depends(get_session)):
    """
    Simulate toggling a book's borrow/return status in memory.
    NOTE: Database role is READ-ONLY, so this returns the toggled state 
    for UI responsiveness without committing changes to PostgreSQL.
    """
    book = session.get(Book, book_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with id {book_id} not found"
        )

    # Return modified book copy in-memory (no session.commit / no DB write)
    return BookRead(
        id=book.id,
        title=book.title,
        author=book.author,
        category=book.category,
        price=book.price,
        is_available=not book.is_available,
        description=book.description,
        cover_image=book.cover_image
    )
