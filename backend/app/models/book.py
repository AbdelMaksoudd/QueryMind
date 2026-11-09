from typing import Optional
from sqlmodel import SQLModel, Field


class BookBase(SQLModel):
    title: str = Field(index=True, description="Title of the book")
    author: str = Field(index=True, description="Author of the book")
    category: str = Field(index=True, description="Genre or category (e.g. Fiction, Tech, Science)")
    price: float = Field(default=0.0, description="Borrowing price or retail price")
    is_available: bool = Field(default=True, index=True, description="Whether the book is currently available for borrowing")
    description: Optional[str] = Field(default=None, description="Brief description or synopsis")
    cover_image: Optional[str] = Field(default=None, description="URL to book cover image")


class Book(BookBase, table=True):
    """
    SQLModel Book database table.
    Contains: id, title, author, category, price, is_available.
    """
    __tablename__ = "books"

    id: Optional[int] = Field(default=None, primary_key=True)


class BookCreate(BookBase):
    """Schema for creating a new book."""
    pass


class BookRead(BookBase):
    """Schema for reading a book from the API."""
    id: int


class BookUpdate(SQLModel):
    """Schema for partially updating book details."""
    title: Optional[str] = None
    author: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    is_available: Optional[bool] = None
    description: Optional[str] = None
    cover_image: Optional[str] = None

