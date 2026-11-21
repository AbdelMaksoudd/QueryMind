"""Public API representations of books."""

from typing import List, Optional

from pydantic import BaseModel, Field


class BookRead(BaseModel):
    book_id: int
    title: str
    authors: List[str]
    author: str = Field(description="Authors joined for convenient display")
    categories: List[str]
    category: Optional[str] = Field(default=None, description="Primary category")
    isbn: Optional[str] = None
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    publication_year: Optional[int] = None
    publisher: Optional[str] = None
    is_active: bool
    available_copies: int
    total_copies: int
    is_available: bool
    borrow_fee: float
    borrowed_by_me: bool = False
    active_loan_id: Optional[int] = None


class BookListResponse(BaseModel):
    items: List[BookRead]
    total: int
    limit: int
    offset: int
