"""Read operations for the book catalog.

Queries are built so that the whole page is loaded with a constant number of
statements: one for the books, one per eagerly loaded collection, and one for
the current user's active loans. No N+1 loops.
"""

from typing import Dict, List, Optional

from sqlalchemy import func
from sqlmodel import Session, col, select

from app.config import settings
from app.models.entities import (
    Author,
    AuthorBook,
    Book,
    BookCategory,
    BookCopy,
    Category,
    Loan,
)
from app.models.enums import CopyStatus, LoanStatus
from app.schemas.book import BookListResponse, BookRead


def get_active_loans_for_books(
    session: Session, user_id: Optional[int], copy_to_book: Dict[int, int]
) -> Dict[int, int]:
    """Return ``{book_id: active_loan_id}`` for the given user and copies."""
    if not user_id or not copy_to_book:
        return {}

    loans = session.exec(
        select(Loan).where(
            Loan.user_id == user_id,
            Loan.status.in_([LoanStatus.ACTIVE, LoanStatus.OVERDUE]),
            Loan.copy_id.in_(list(copy_to_book)),
        )
    ).all()

    result: Dict[int, int] = {}
    for loan in loans:
        book_id = copy_to_book.get(loan.copy_id)
        if book_id is not None and loan.loan_id is not None:
            result.setdefault(book_id, loan.loan_id)
    return result


def _to_book_read(
    book: Book, active_loans: Dict[int, int], user_id: Optional[int]
) -> BookRead:
    authors = sorted(author.name for author in book.writers)
    categories = sorted(category.name for category in book.categories)
    available = sum(copy.status == CopyStatus.AVAILABLE for copy in book.copies)
    loan_id = active_loans.get(book.book_id) if user_id else None

    return BookRead(
        book_id=book.book_id,
        title=book.title,
        authors=authors,
        author=", ".join(authors),
        categories=categories,
        category=categories[0] if categories else None,
        isbn=book.isbn,
        description=book.description,
        cover_image_url=book.cover_image_url,
        publication_year=book.publication_year,
        publisher=book.publisher.name if book.publisher else None,
        is_active=book.is_active,
        available_copies=available,
        total_copies=len(book.copies),
        is_available=available > 0,
        borrow_fee=settings.DEFAULT_BORROW_PRICE,
        borrowed_by_me=loan_id is not None,
        active_loan_id=loan_id,
    )


def list_books(
    session: Session,
    *,
    category: Optional[str] = None,
    search: Optional[str] = None,
    is_available: Optional[bool] = None,
    include_inactive: bool = False,
    user_id: Optional[int] = None,
    book_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
) -> BookListResponse:
    """Return a paginated, filtered catalog of active books."""
    statement = select(Book)
    if not include_inactive:
        statement = statement.where(Book.is_active.is_(True))

    if book_id is not None:
        statement = statement.where(Book.book_id == book_id)

    if category:
        statement = statement.where(
            select(BookCategory.book_id)
            .join(Category, BookCategory.category_id == Category.category_id)
            .where(
                BookCategory.book_id == Book.book_id,
                col(Category.name) == category,
            )
            .exists()
        )

    if search:
        pattern = f"%{search.strip()}%"
        author_match = (
            select(AuthorBook.book_id)
            .join(Author, AuthorBook.author_id == Author.author_id)
            .where(
                AuthorBook.book_id == Book.book_id,
                col(Author.name).ilike(pattern),
            )
            .exists()
        )
        statement = statement.where(
            col(Book.title).ilike(pattern)
            | col(Book.isbn).ilike(pattern)
            | author_match
        )

    if is_available is not None:
        has_free_copy = (
            select(BookCopy.copy_id)
            .where(
                BookCopy.book_id == Book.book_id,
                BookCopy.status == CopyStatus.AVAILABLE,
            )
            .exists()
        )
        statement = statement.where(has_free_copy if is_available else ~has_free_copy)

    total = session.exec(select(func.count()).select_from(statement.subquery())).one()

    books = session.exec(
        statement.order_by(col(Book.title), col(Book.book_id)).offset(offset).limit(limit)
    ).unique().all()

    copy_to_book = {
        copy.copy_id: book.book_id
        for book in books
        for copy in book.copies
        if copy.copy_id is not None and book.book_id is not None
    }
    active_loans = get_active_loans_for_books(session, user_id, copy_to_book)

    return BookListResponse(
        items=[_to_book_read(book, active_loans, user_id) for book in books],
        total=total,
        limit=limit,
        offset=offset,
    )


def get_categories(session: Session) -> List[str]:
    """Return distinct category names that belong to at least one active book."""
    statement = (
        select(Category.name)
        .join(BookCategory, BookCategory.category_id == Category.category_id)
        .join(Book, Book.book_id == BookCategory.book_id)
        .where(Book.is_active.is_(True))
        .distinct()
        .order_by(col(Category.name))
    )
    return list(session.exec(statement).all())
