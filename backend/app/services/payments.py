"""Payment helpers.

The payment columns are added by migrations/001_admin_payments.sql, which the
DBA must run because the `website` role cannot ALTER tables. Until then the
rest of the API keeps working: these helpers detect the columns once and
return empty/None instead of raising database errors.
"""

from typing import Dict, List, Optional

from sqlalchemy import text
from sqlmodel import Session

_PAYMENT_COLUMNS_AVAILABLE: Optional[bool] = None
_IDENTITY_COLUMNS_AVAILABLE: Optional[bool] = None


def has_identity_columns(session: Session) -> bool:
    """Whether migrations/002_walkin_loans.sql has been applied."""
    global _IDENTITY_COLUMNS_AVAILABLE
    if _IDENTITY_COLUMNS_AVAILABLE is None:
        _IDENTITY_COLUMNS_AVAILABLE = (
            session.execute(
                text(
                    "SELECT 1 FROM information_schema.columns "
                    "WHERE table_schema='public' AND table_name='User' "
                    "AND column_name='national_id'"
                )
            ).first()
            is not None
        )
    return _IDENTITY_COLUMNS_AVAILABLE


def has_payment_columns(session: Session) -> bool:
    global _PAYMENT_COLUMNS_AVAILABLE
    if _PAYMENT_COLUMNS_AVAILABLE is None:
        _PAYMENT_COLUMNS_AVAILABLE = (
            session.execute(
                text(
                    "SELECT 1 FROM information_schema.columns "
                    "WHERE table_schema='public' AND table_name='Loan' "
                    "AND column_name='payment_status'"
                )
            ).first()
            is not None
        )
    return _PAYMENT_COLUMNS_AVAILABLE


def get_payment_info(session: Session, loan_ids: List[int]) -> Dict[int, dict]:
    if not loan_ids or not has_payment_columns(session):
        return {}
    rows = session.execute(
        text(
            'SELECT loan_id, payment_status::text, payment_method, paid_at, paid_by '
            'FROM "Loan" WHERE loan_id = any(:ids)'
        ),
        {"ids": loan_ids},
    ).all()
    return {
        row[0]: {
            "status": row[1],
            "method": row[2],
            "paid_at": row[3],
            "paid_by": row[4],
        }
        for row in rows
    }


def enrich_loans(session: Session, loans: list) -> list:
    """Attach payment fields to LoanRead objects (or sensible derived defaults)."""
    info = get_payment_info(session, [loan.loan_id for loan in loans if loan.loan_id])
    for loan in loans:
        data = info.get(loan.loan_id)
        if data:
            loan.payment_status = data["status"]
            loan.payment_method = data["method"]
            loan.paid_at = data["paid_at"]
        elif str(getattr(loan.status, "value", loan.status)).startswith("Returned"):
            loan.payment_status = "Paid"
        else:
            loan.payment_status = "Pending"
    return loans


def record_payment(session: Session, *, loan_id: int, admin_id: int, method: str) -> None:
    if not has_payment_columns(session):
        raise RuntimeError("Payment columns are missing. Run migrations/001_admin_payments.sql first.")
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    session.execute(
        text(
            'UPDATE "Loan" SET payment_status = \'Paid\'::payment_status_enum, '
            "payment_method = :method, paid_at = :now, paid_by = :admin, "
            "fine_status = 'Paid'::fine_status_enum, updated_at = :now "
            "WHERE loan_id = :id"
        ),
        {"method": method, "now": now, "admin": admin_id, "id": loan_id},
    )
