"""Schemas for the administrator panel."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.enums import AccountStatus
from app.schemas.library import UserRead


class AdminStats(BaseModel):
    books: int
    copies: int
    available_copies: int
    rented_copies: int
    active_loans: int
    overdue_loans: int
    pending_payments: int
    paid_payments: int
    collected_amount: float
    pending_amount: float
    users: int
    payment_columns_ready: bool


class AdminPaymentRead(BaseModel):
    loan_id: int
    invoice_no: str
    user_id: int
    user_name: str
    email: str
    book_title: str
    amount: float
    fine: float
    status: str
    payment_status: str
    payment_method: Optional[str] = None
    borrow_date: Optional[datetime] = None


class RecordPaymentRequest(BaseModel):
    method: Literal["Counter", "Cash", "Bank Transfer"] = Field(
        default="Counter", description="How the payment was settled at the desk"
    )


class CreateBookRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    author: str = Field(min_length=1, max_length=255)
    category: str = Field(min_length=1, max_length=100)
    isbn: Optional[str] = Field(default=None, max_length=20)
    description: Optional[str] = None
    publisher: Optional[str] = Field(default=None, max_length=255)
    publication_year: Optional[int] = Field(default=None, ge=0, le=2100)
    cover_image_url: Optional[str] = None
    copies: int = Field(default=1, ge=1, le=100)


class UpdateBookRequest(BaseModel):
    """Only fields present in the request are changed (null clears optional ones)."""

    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    isbn: Optional[str] = Field(default=None, max_length=20)
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    publication_year: Optional[int] = Field(default=None, ge=0, le=2100)
    author: Optional[str] = Field(default=None, max_length=255)
    category: Optional[str] = Field(default=None, max_length=100)
    publisher: Optional[str] = Field(default=None, max_length=255)
    copies: Optional[int] = Field(default=None, ge=0, le=100)
    is_active: Optional[bool] = None


class BookActionResponse(BaseModel):
    book_id: int
    message: str


class UpdateAccountStatusRequest(BaseModel):
    account_status: AccountStatus


class CreateStaffRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    phone: Optional[str] = Field(default=None, max_length=20)

    @field_validator("password")
    @classmethod
    def _bcrypt_limit(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 bytes.")
        return value


class UpdateRoleRequest(BaseModel):
    # Admins are intentionally not creatable through this endpoint.
    role: Literal["Customer", "Staff"]


class AdminUserRead(UserRead):
    """Admin view: includes the identity data we must never expose publicly."""

    national_id: Optional[str] = None
    is_walkin: bool = False


class WalkInLoanRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    national_id: str = Field(min_length=5, max_length=30, description="Identity document number")
    phone: Optional[str] = Field(default=None, max_length=20)
    notes: Optional[str] = Field(default=None, max_length=255)
    book_id: int = Field(gt=0)
    days: Optional[int] = Field(default=None, gt=0, le=60)
    id_verified: bool = Field(
        default=False,
        description="Staff confirmed the original identity document at the desk",
    )

    @field_validator("national_id")
    @classmethod
    def _clean_national_id(cls, value: str) -> str:
        cleaned = value.strip().upper()
        if not any(char.isdigit() for char in cleaned):
            raise ValueError("Identity number must contain digits.")
        return cleaned

    @field_validator("id_verified")
    @classmethod
    def _must_verify(cls, value: bool) -> bool:
        if not value:
            raise ValueError("You must confirm that you checked the original identity document.")
        return value
