"""Schemas for users, loans and borrowing operations."""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import AccountStatus, FineStatus, LoanStatus, UserRole


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    first_name: str
    last_name: str
    email: str
    role: UserRole
    account_status: AccountStatus
    phone: Optional[str] = None
    address: Optional[str] = None
    created_at: Optional[datetime] = None

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


class LoanRead(BaseModel):
    loan_id: int
    user_id: int
    copy_id: int
    book_id: Optional[int] = None
    book_title: Optional[str] = None
    borrow_date: Optional[datetime] = None
    due_date: datetime
    return_date: Optional[datetime] = None
    status: LoanStatus
    rental_price: Decimal
    discount_percentage: Decimal = Decimal("0")
    final_price: Decimal
    fine_amount: Decimal
    fine_status: Optional[FineStatus] = None
    payment_status: Optional[str] = None
    payment_method: Optional[str] = None
    paid_at: Optional[datetime] = None


class BorrowRequest(BaseModel):
    days: Optional[int] = Field(default=None, gt=0, description="Loan duration in days")
