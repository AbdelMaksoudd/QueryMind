# QueryMind — Library & Book Borrowing Management System

Full-stack library application: **FastAPI + SQLModel (PostgreSQL)** backend and **React (Vite) + Tailwind CSS** frontend, with a placeholder for an AI Library Assistant.

---

## Architecture

```text
Query/
├── backend/
│   ├── app/
│   │   ├── main.py                 # App setup, CORS, exception handler, routers
│   │   ├── config.py               # Typed settings loaded from backend/.env
│   │   ├── database.py             # Engine, read/write session dependencies
│   │   ├── security.py             # bcrypt hashing, JWT, auth dependencies
│   │   ├── exceptions.py           # Domain errors -> HTTP status codes
│   │   ├── api/
│   │   │   ├── books.py            # Catalog + borrow (returns are staff-only)
│   │   │   ├── admin.py            # Admin dashboard / payment desk / catalog
│   │   │   ├── auth.py             # Register / login / JWT / demo login
│   │   │   ├── users.py            # Account list (public in demo mode)
│   │   │   ├── loans.py            # Loan history
│   │   │   ├── health.py           # Health probe with DB check
│   │   │   └── chat.py             # AI assistant placeholder
│   │   ├── models/
│   │   │   ├── enums.py            # Python mappings of the PostgreSQL enum types
│   │   │   └── entities.py         # SQLModel mappings of the existing tables
│   │   ├── schemas/                # Pydantic request/response models
│   │   └── services/               # Query + transaction logic (routers stay thin)
│   ├── history_querys.sql          # Schema, enum types and website role grants
│   ├── migrations/                 # 00_run_all.sql — run once by DBA (see README)
│   ├── .env                        # Real credentials (not committed)
│   ├── pyproject.toml              # Dependencies & Python version (uv)
│   ├── uv.lock                     # Exact resolved versions — commit this
│   └── .python-version             # 3.13
└── frontend/
    └── src/
        ├── components/             # Navbar, BookCard, BookCatalog, BookDetail, AuthModal, Admin, Receipt, ChatWidget
        ├── context/AuthContext.jsx
        ├── hooks/useLoanToggle.js  # Borrow confirmation flow
        ├── services/api.js         # Axios client + JWT interceptor
        └── App.jsx                 # Routes: "/", "/books/:id", "/profile", "/admin", receipts
```

### Important design notes

- **The backend never creates or migrates tables.** The schema, enum types and grants are owned by the DBA and defined in `backend/history_querys.sql`. `SQLModel.metadata.create_all()` is never called.
- **Soft delete:** `Book_Copy.book_id → Book.book_id` was changed from `ON DELETE CASCADE` to `ON DELETE RESTRICT` (recorded in `history_querys.sql`), so a book with copies can no longer be deleted accidentally. `is_active` was added afterwards to support "removing" a book without touching copies that may be referenced by `Loan`. The catalog only exposes active books.
- **Permissions:** the `website` role has `SELECT, INSERT, UPDATE` on all tables (and `DELETE` on most, but **not** on `User` or `Loan`). The borrowing flow only inserts/updates `Loan` and `Book_Copy`, so it stays within the granted permissions.
- **Prices** live on `Loan` (per rental), not on `Book`. A configurable suggested fee (`DEFAULT_BORROW_PRICE`) is used when a loan is created. The UI shows the fee, loan duration and due date in the confirmation dialog, exactly like a normal checkout, but **never asks for card/PayPal data**: payment is "pay at the library desk".
- **Invoices:** after borrowing, the app opens `/loans/:loanId/receipt` — a printable invoice with an invoice number (`QM-YEAR-000123`), a **QR code**, billed-to details, line items, discount/fine, total and payment status. The librarian can scan that QR in the admin panel to jump straight to the invoice. The same invoice is reachable from the profile history. No extra DB table is needed: every financial field already exists on `Loan`, and invoice numbers are derived deterministically from `loan_id`.
- **Borrowing** is a real transaction: `FOR UPDATE SKIP LOCKED` selects a free copy and a `Loan` row is created atomically, after an explicit confirmation dialog. **Returning is staff-only** (`POST /api/admin/loans/{id}/return`): a book is a physical copy, so the borrower hands it back at the desk and the librarian confirms it — the customer UI shows "Return at desk" instead of an action button. Late returns set a per-day fine and `Returned_Overdue` status on the server.
- **Book detail pages** live at `/books/:bookId` (React Router) and reuse `GET /api/books/{id}`: cover, description, author/category/publisher/ISBN, related books and the borrow action.
- **Profile page** at `/profile`: account details (editable), change password, loan statistics and the complete borrowing history. The navbar avatar links to it.
- **SPA routing:** `frontend/public/_redirects` provides the history fallback for hosts such as Netlify; other hosts must rewrite unknown paths to `/index.html`.
- **Authentication:** registration/login issue JWT access tokens. Passwords are bcrypt hashes. The two legacy seed accounts had plaintext passwords; they are transparently upgraded to bcrypt on their first successful login (same password still works).
- **Demo account switcher:** the top bar has a clearly-labelled `DEMO` dropdown that obtains a real JWT for any active account without a password — useful when presenting the project. Disable it in production with `DEMO_MODE=false`; then `/api/users` becomes admin-only and `/api/auth/demo-login` is turned off.
- **Authorization:** borrowing and `/api/loans` require a token and use the account in the token (never a `user_id` from the body). Returns, book edits and payment recording are Admin-only. Catalog browsing is public; `borrowed_by_me` is only computed when a token is supplied.

---

## API endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Service metadata |
| `GET` | `/health` | Health + database connectivity (503 when DB is down) |
| `GET` | `/api/auth/config` | Public flag telling the UI whether demo mode is on |
| `POST` | `/api/auth/register` | Create a customer account, returns a token |
| `POST` | `/api/auth/login` | Email + password, returns a token |
| `POST` | `/api/auth/demo-login` | Demo only: get a token for any active account by `user_id` |
| `GET` | `/api/auth/me` | Current account (requires token) |
| `PATCH` | `/api/auth/me` | 🔒 Update name / phone / address |
| `POST` | `/api/auth/change-password` | 🔒 Verify current password, set a new bcrypt hash |
| `GET` | `/api/books` | Public paginated catalog. Filters: `category`, `search`, `is_available`, `limit`, `offset` |
| `GET` | `/api/books/categories` | Categories of active books |
| `GET` | `/api/books/{id}` | Single book |
| `PATCH` | `/api/books/{id}/borrow` | 🔒 Borrow a free copy. Body: `{ "days": 14 }` (optional) |

| `GET` | `/api/users` | Accounts (public in demo mode, admin-only otherwise) |
| `GET` | `/api/loans` | 🔒 Your loans (`status`, `limit`, `offset`); admins may pass `user_id` |
| `GET` | `/api/loans/{id}` | 🔒 One loan (owner or admin) — powers the invoice page |
| `GET` | `/api/admin/stats` | 🔒 Admin dashboard numbers |
| `GET` | `/api/admin/payments` | 🔒 Payment queue (`pending_only`, `query`) |
| `POST` | `/api/admin/payments/{id}` | 🔒 Record payment (requires the migration) |
| `POST` | `/api/admin/walkin-loans` | 🔒 Verified walk-in loan (requires migration 002) |
| `POST` | `/api/admin/loans/{id}/return` | 🔒 Staff confirms a physical return + fine calculation |
| `POST` | `/api/admin/books` | 🔒 Add a book + author/category/publisher + copies |
| `PATCH` | `/api/admin/books/{id}` | 🔒 Edit book details / author / category / copies |
| `PATCH` | `/api/admin/books/{id}/active` | 🔒 Soft-delete / restore |
| `GET` | `/api/admin/users` | 🔒 All accounts |
| `PATCH` | `/api/admin/users/{id}/status` | 🔒 Admin only: suspend / reactivate |
| `POST` | `/api/admin/staff` | 🔒 Admin only: create a Staff account |
| `PATCH` | `/api/admin/users/{id}/role` | 🔒 Admin only: Customer ↔ Staff |
| `POST` | `/api/chat` | AI assistant placeholder |

Interactive docs: `http://localhost:8000/docs`

### Payment workflow & database changes

The deployed flow is:

1. The borrower confirms a loan → an invoice is created with status **Pending**.
2. They take the invoice number to the library desk.
3. An admin opens `/admin` → **Payment desk**, finds the invoice and records payment (Counter / Cash / Bank Transfer). No card or PayPal data is ever collected.
4. The librarian can **scan the QR code** on the printed invoice (or type the invoice number) to find it instantly (camera scanning needs HTTPS or localhost). The invoice page also has **Download PDF** alongside Print.
5. The invoice and the borrower's profile immediately show **Paid**. Late return fines are settled the same way.
6. The borrower brings the physical copy back; staff confirms it in the **Returns** tab, which calculates any fine and frees the copy.

**All DB changes are in one file:** `backend/migrations/00_run_all.sql` — run it once in the Neon SQL editor as `neondb_owner` (`website` cannot run DDL). It is idempotent and covers:

1. Payment columns on `Loan` (`payment_status`, `payment_method`, `paid_at`, `paid_by`) + backfill + a `CHECK` keeping state and timestamp consistent.
2. Walk-in identity columns on `User` (`national_id`, `is_walkin`, `id_verified_at`, `id_verified_by`) + unique index.
3. `user_role` gains `Staff`, plus a trigger allowing only `Admin`/`Staff` to be recorded as `paid_by` / `id_verified_by`.

The same statements are also recorded chronologically at the end of `backend/history_querys.sql` (section 7).

### Admin panel

`/admin` (Admin role only) has six tabs: **Overview** (statistics), **Payment desk** (search or **scan the invoice QR**, then record payment), **Returns** (active loans — scan the QR or mark a return), **Walk-in loan** (lend to a visitor without an account), **Books** (add **and edit** books: title, author, category, publisher, ISBN, copies, visibility; soft-delete/restore) and **Users** (change account status).

**Walk-in loans:** staff checks the visitor's original identity document, ticks a confirmation box, picks a book and creates a normal invoice. A dedicated guest record is created with a random unusable password (never a fake website login); the national id is stored once and reused on later visits, with a mismatch check against the name. Identity data appears only in the admin user list, never in public endpoints.

**Roles:** `Admin` manages accounts, roles and can suspend any account. `Staff` (librarian) does the daily work — payment desk, returns, walk-in loans and catalog edits — but cannot manage accounts. The Admin creates staff from **Users → Add staff**, or converts an existing Customer/Staff via the Role column. Converting yourself or an Admin is blocked, and `Admin` cannot be assigned through the role endpoint. Navbar shows **Admin** or **Desk** accordingly. Recording a payment and confirming a return both require an extra confirmation dialog; settled rows show a disabled "Settled" state instead of the Record button. Copies on loan are never removed; "deletion" uses `is_active = false`.

---

## Quickstart

### Backend

The backend uses **[uv](https://docs.astral.sh/uv/)** instead of `venv` + `pip`.
Dependencies and Python version are locked in `uv.lock` / `.python-version`, so a
fresh machine (or a deployment server) installs exactly the same versions.

```bash
# Install uv once: https://docs.astral.sh/uv/getting-started/installation/
cd backend

uv sync                                   # creates .venv + installs the locked versions
# Make sure backend/.env exists and contains your real DATABASE_URL
# (never leave the HOST / PASSWORD placeholders in it)

uv run uvicorn app.main:app --reload --port 8000
```

Useful uv commands:

| Command | Purpose |
| --- | --- |
| `uv sync` | Install/reconcile `.venv` with `uv.lock` (run after cloning) |
| `uv lock` | Re-resolve dependencies after editing `pyproject.toml` — **commit `uv.lock`** |
| `uv run <cmd>` | Run inside the managed environment, no activation needed |
| `uv add <pkg>` / `uv add --dev <pkg>` | Add a runtime/dev dependency and update the lock |
| `uv python install` | Install the Python version declared in `.python-version` |

`httpx2` lives in the `dev` dependency group only (used by `TestClient` checks);
it is not installed in a production `uv sync --no-dev`.

Environment variables in `backend/.env`:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (SQLAlchemy driver is pinned to psycopg 3) |
| `CORS_ORIGINS` | JSON array or comma-separated list of allowed origins |
| `DEFAULT_BORROW_PRICE` | Suggested fee shown in the catalog and used for new loans |
| `DEFAULT_LOAN_DAYS` / `MAX_LOAN_DAYS` | Loan duration defaults and cap |
| `OVERDUE_FINE_PER_DAY` | Late-return fine |
| `JWT_SECRET` | Secret used to sign tokens — **change it for deployment** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime |
| `DEMO_MODE` | Keep the one-click account switcher (default `true`, set `false` in production) |
| `DB_ECHO` | Log generated SQL (`true`/`false`) |

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Set `VITE_API_BASE_URL` in a frontend `.env` if the backend is not on `http://localhost:8000`.
