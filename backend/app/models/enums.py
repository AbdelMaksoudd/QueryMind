"""Python enums mirroring the PostgreSQL enum types in history_querys.sql."""

from enum import Enum

from sqlalchemy import Enum as SAEnum


class UserRole(str, Enum):
    ADMIN = "Admin"
    STAFF = "Staff"
    CUSTOMER = "Customer"


class AccountStatus(str, Enum):
    ACTIVE = "Active"
    FLAGGED = "Flagged"
    SUSPENDED = "Suspended"
    INACTIVE = "Inactive"


class CopyStatus(str, Enum):
    AVAILABLE = "Available"
    RENTED = "Rented"
    MAINTENANCE = "Maintenance"
    LOST = "Lost"


class LoanStatus(str, Enum):
    ACTIVE = "Active"
    OVERDUE = "Overdue"
    RETURNED = "Returned"
    RETURNED_OVERDUE = "Returned_Overdue"


class FineStatus(str, Enum):
    PAID = "Paid"
    UNPAID = "Unpaid"


class ReservationStatus(str, Enum):
    PENDING = "Pending"
    FULFILLED = "Fulfilled"
    CANCELED = "Canceled"


def db_enum(enum_class: type[Enum], type_name: str) -> SAEnum:
    """Map a Python enum onto an *existing* PostgreSQL enum type.

    ``create_type=False`` is essential: the website role has no permission to
    create types, and the types are already defined in the schema.
    """
    return SAEnum(
        enum_class,
        name=type_name,
        native_enum=True,
        create_type=False,
        values_callable=lambda members: [member.value for member in members],
    )
