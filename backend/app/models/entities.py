"""SQLModel mappings for the existing library schema.

These are read/write mappings only — ``SQLModel.metadata.create_all`` must never
be called, because the tables, enums and grants are managed by the DBA
(see backend/history_querys.sql).
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text, text
from sqlmodel import Field, Relationship, SQLModel

from app.models.enums import (
    AccountStatus,
    CopyStatus,
    FineStatus,
    LoanStatus,
    ReservationStatus,
    UserRole,
    db_enum,
)


class User(SQLModel, table=True):
    __tablename__ = "User"

    user_id: Optional[int] = Field(default=None, primary_key=True)
    first_name: str = Field(sa_column=Column("first_name", String(100), nullable=False))
    last_name: str = Field(sa_column=Column("last_name", String(100), nullable=False))
    email: str = Field(sa_column=Column("email", String(255), nullable=False, unique=True))
    password: str = Field(sa_column=Column("password", String(255), nullable=False))
    phone: Optional[str] = Field(default=None, sa_column=Column("phone", String(20)))
    address: Optional[str] = Field(default=None, sa_column=Column("address", String(255)))
    role: UserRole = Field(
        sa_column=Column("role", db_enum(UserRole, "user_role"), server_default=text("'Customer'"))
    )
    account_status: AccountStatus = Field(
        sa_column=Column(
            "account_status",
            db_enum(AccountStatus, "account_status_enum"),
            server_default=text("'Active'"),
        )
    )
    created_at: Optional[datetime] = Field(
        default=None, sa_column=Column("created_at", DateTime, server_default=text("CURRENT_TIMESTAMP"))
    )
    updated_at: Optional[datetime] = Field(
        default=None, sa_column=Column("updated_at", DateTime, server_default=text("CURRENT_TIMESTAMP"))
    )


class Publisher(SQLModel, table=True):
    __tablename__ = "Publisher"

    publisher_id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(sa_column=Column("name", String(255), nullable=False))
    address: Optional[str] = Field(default=None, sa_column=Column("address", String(255)))
    created_at: Optional[datetime] = Field(
        default=None, sa_column=Column("created_at", DateTime, server_default=text("CURRENT_TIMESTAMP"))
    )
    updated_at: Optional[datetime] = Field(
        default=None, sa_column=Column("updated_at", DateTime, server_default=text("CURRENT_TIMESTAMP"))
    )


class Category(SQLModel, table=True):
    __tablename__ = "Category"

    category_id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(sa_column=Column("name", String(100), nullable=False))
    created_at: Optional[datetime] = Field(
        default=None, sa_column=Column("created_at", DateTime, server_default=text("CURRENT_TIMESTAMP"))
    )
    updated_at: Optional[datetime] = Field(
        default=None, sa_column=Column("updated_at", DateTime, server_default=text("CURRENT_TIMESTAMP"))
    )


class Author(SQLModel, table=True):
    __tablename__ = "Author"

    author_id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(sa_column=Column("name", String(255), nullable=False))
    created_at: Optional[datetime] = Field(
        default=None, sa_column=Column("created_at", DateTime, server_default=text("CURRENT_TIMESTAMP"))
    )
    updated_at: Optional[datetime] = Field(
        default=None, sa_column=Column("updated_at", DateTime, server_default=text("CURRENT_TIMESTAMP"))
    )


class AuthorBook(SQLModel, table=True):
    __tablename__ = "Author_Book"

    book_id: int = Field(
        sa_column=Column("book_id", Integer, ForeignKey("Book.book_id", ondelete="CASCADE"), primary_key=True)
    )
    author_id: int = Field(
        sa_column=Column("author_id", Integer, ForeignKey("Author.author_id", ondelete="CASCADE"), primary_key=True)
    )
    created_at: Optional[datetime] = Field(
        default=None, sa_column=Column("created_at", DateTime, server_default=text("CURRENT_TIMESTAMP"))
    )
    updated_at: Optional[datetime] = Field(
        default=None, sa_column=Column("updated_at", DateTime, server_default=text("CURRENT_TIMESTAMP"))
    )


class BookCategory(SQLModel, table=True):
    __tablename__ = "Book_Category"

    book_id: int = Field(
        sa_column=Column("book_id", Integer, ForeignKey("Book.book_id", ondelete="CASCADE"), primary_key=True)
    )
    category_id: int = Field(
        sa_column=Column(
            "category_id", Integer, ForeignKey("Category.category_id", ondelete="CASCADE"), primary_key=True
        )
    )
    created_at: Optional[datetime] = Field(
        default=None, sa_column=Column("created_at", DateTime, server_default=text("CURRENT_TIMESTAMP"))
    )
    updated_at: Optional[datetime] = Field(
        default=None, sa_column=Column("updated_at", DateTime, server_default=text("CURRENT_TIMESTAMP"))
    )


class Book(SQLModel, table=True):
    __tablename__ = "Book"

    book_id: Optional[int] = Field(default=None, primary_key=True)
    isbn: Optional[str] = Field(default=None, sa_column=Column("isbn", String(20), unique=True))
    title: str = Field(sa_column=Column("title", String(255), nullable=False))
    description: Optional[str] = Field(default=None, sa_column=Column("description", Text))
    cover_image_url: Optional[str] = Field(default=None, sa_column=Column("cover_image_url", Text))
    publication_year: Optional[int] = Field(default=None, sa_column=Column("publication_year", Integer))
    publisher_id: Optional[int] = Field(
        default=None, sa_column=Column("publisher_id", Integer, ForeignKey("Publisher.publisher_id", ondelete="SET NULL"))
    )
    # Soft delete flag: books with copies referenced by loans must not be
    # physically deleted, so "removal" is represented by is_active = false.
    is_active: bool = Field(
        default=True,
        sa_column=Column("is_active", Boolean, nullable=True, server_default=text("true")),
    )
    created_at: Optional[datetime] = Field(
        default=None, sa_column=Column("created_at", DateTime, server_default=text("CURRENT_TIMESTAMP"))
    )
    updated_at: Optional[datetime] = Field(
        default=None, sa_column=Column("updated_at", DateTime, server_default=text("CURRENT_TIMESTAMP"))
    )

    writers: List["Author"] = Relationship(
        link_model=AuthorBook,
        sa_relationship_kwargs={"lazy": "selectin"},
    )
    categories: List["Category"] = Relationship(
        link_model=BookCategory,
        sa_relationship_kwargs={"lazy": "selectin"},
    )
    copies: List["BookCopy"] = Relationship(
        back_populates="book",
        sa_relationship_kwargs={"lazy": "selectin"},
    )
    publisher: Optional["Publisher"] = Relationship(
        sa_relationship_kwargs={"lazy": "selectin"},
    )


class BookCopy(SQLModel, table=True):
    __tablename__ = "Book_Copy"

    copy_id: Optional[int] = Field(default=None, primary_key=True)
    book_id: Optional[int] = Field(
        default=None, sa_column=Column("book_id", Integer, ForeignKey("Book.book_id", ondelete="CASCADE"))
    )
    status: CopyStatus = Field(
        sa_column=Column(
            "status",
            db_enum(CopyStatus, "copy_status_enum"),
            server_default=text("'Available'"),
        )
    )
    created_at: Optional[datetime] = Field(
        default=None, sa_column=Column("created_at", DateTime, server_default=text("CURRENT_TIMESTAMP"))
    )
    updated_at: Optional[datetime] = Field(
        default=None, sa_column=Column("updated_at", DateTime, server_default=text("CURRENT_TIMESTAMP"))
    )

    book: Optional[Book] = Relationship(back_populates="copies")


class Loan(SQLModel, table=True):
    __tablename__ = "Loan"

    loan_id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(
        default=None, sa_column=Column("user_id", Integer, ForeignKey("User.user_id", ondelete="RESTRICT"))
    )
    copy_id: Optional[int] = Field(
        default=None, sa_column=Column("copy_id", Integer, ForeignKey("Book_Copy.copy_id", ondelete="RESTRICT"))
    )
    borrow_date: Optional[datetime] = Field(
        default=None, sa_column=Column("borrow_date", DateTime, server_default=text("CURRENT_TIMESTAMP"))
    )
    due_date: datetime = Field(sa_column=Column("due_date", DateTime, nullable=False))
    return_date: Optional[datetime] = Field(default=None, sa_column=Column("return_date", DateTime))
    status: LoanStatus = Field(
        sa_column=Column(
            "status",
            db_enum(LoanStatus, "loan_status_enum"),
            server_default=text("'Active'"),
        )
    )
    rental_price: Decimal = Field(sa_column=Column("rental_price", Numeric(10, 2), nullable=False))
    discount_percentage: Decimal = Field(
        default=Decimal("0"),
        sa_column=Column("discount_percentage", Numeric(5, 2), server_default=text("0.00")),
    )
    final_price: Decimal = Field(sa_column=Column("final_price", Numeric(10, 2), nullable=False))
    fine_amount: Decimal = Field(
        default=Decimal("0"),
        sa_column=Column("fine_amount", Numeric(10, 2), server_default=text("0.00")),
    )
    fine_status: Optional[FineStatus] = Field(
        default=None,
        sa_column=Column("fine_status", db_enum(FineStatus, "fine_status_enum")),
    )
    created_at: Optional[datetime] = Field(
        default=None, sa_column=Column("created_at", DateTime, server_default=text("CURRENT_TIMESTAMP"))
    )
    updated_at: Optional[datetime] = Field(
        default=None, sa_column=Column("updated_at", DateTime, server_default=text("CURRENT_TIMESTAMP"))
    )


class Reservation(SQLModel, table=True):
    __tablename__ = "Reservation"

    reservation_id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(
        default=None, sa_column=Column("user_id", Integer, ForeignKey("User.user_id", ondelete="CASCADE"))
    )
    book_id: Optional[int] = Field(
        default=None, sa_column=Column("book_id", Integer, ForeignKey("Book.book_id", ondelete="CASCADE"))
    )
    reservation_date: Optional[datetime] = Field(
        default=None, sa_column=Column("reservation_date", DateTime, server_default=text("CURRENT_TIMESTAMP"))
    )
    status: ReservationStatus = Field(
        sa_column=Column(
            "status",
            db_enum(ReservationStatus, "reservation_status_enum"),
            server_default=text("'Pending'"),
        )
    )
    created_at: Optional[datetime] = Field(
        default=None, sa_column=Column("created_at", DateTime, server_default=text("CURRENT_TIMESTAMP"))
    )
    updated_at: Optional[datetime] = Field(
        default=None, sa_column=Column("updated_at", DateTime, server_default=text("CURRENT_TIMESTAMP"))
    )


class Review(SQLModel, table=True):
    __tablename__ = "Review"

    review_id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(
        default=None, sa_column=Column("user_id", Integer, ForeignKey("User.user_id", ondelete="CASCADE"))
    )
    book_id: Optional[int] = Field(
        default=None, sa_column=Column("book_id", Integer, ForeignKey("Book.book_id", ondelete="CASCADE"))
    )
    rating: int = Field(sa_column=Column("rating", Integer, nullable=False))
    comment: Optional[str] = Field(default=None, sa_column=Column("comment", Text))
    created_at: Optional[datetime] = Field(
        default=None, sa_column=Column("created_at", DateTime, server_default=text("CURRENT_TIMESTAMP"))
    )
    updated_at: Optional[datetime] = Field(
        default=None, sa_column=Column("updated_at", DateTime, server_default=text("CURRENT_TIMESTAMP"))
    )


# Resolve the string forward references used by the relationships above.
for _model in (Book, BookCopy, Author, Category, Publisher):
    _model.model_rebuild()
