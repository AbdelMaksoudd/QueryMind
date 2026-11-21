# QueryMind — Library & Book Borrowing Management System

Full-stack library application: **FastAPI + SQLModel (PostgreSQL)** backend and **React (Vite) + Tailwind CSS** frontend, with a placeholder for an AI Library Assistant.

---

## Quickstart

### 1. Database

Create a PostgreSQL database from `backend/history_querys.sql` (it contains the schema, enums, grants and all later changes in order). The backend connects through a role with `SELECT/INSERT/UPDATE` privileges — it never creates or migrates tables itself.

Put your connection string in `backend/.env` as `DATABASE_URL` — never leave the `HOST` / `PASSWORD` placeholders.

### 2. Backend

Uses **[uv](https://docs.astral.sh/uv/)** instead of `venv` + `pip`; versions are locked in `uv.lock` / `.python-version`.

```bash
# Install uv once: https://docs.astral.sh/uv/getting-started/installation/
cd backend
uv sync                                   # creates .venv + installs locked versions
uv run uvicorn app.main:app --reload --port 8000
```

- API: `http://localhost:8000` · Docs: `http://localhost:8000/docs`
- Changing `.env` does **not** trigger reload — restart uvicorn manually.

When adding a dependency use `uv add <pkg>`, then commit both `pyproject.toml` and `uv.lock`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Set `VITE_API_BASE_URL` in a frontend `.env` if the backend is not on `http://localhost:8000`.

### 4. Try it

- Demo switcher in the top bar signs in as Admin, Staff or Customer without a password (`DEMO_MODE=true`).
- Borrow a book → confirm → an invoice opens; record its payment from `/admin` → Payment desk.
- `/admin` → Users → **Add staff** creates a librarian account.
- `/profile` → account details, password change and full loan history.

### Environment variables (`backend/.env`)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (SQLAlchemy driver pinned to psycopg 3) |
| `CORS_ORIGINS` | JSON array or comma-separated list of allowed origins |
| `DEFAULT_BORROW_PRICE` | Suggested fee shown in the catalog and used for new loans |
| `DEFAULT_LOAN_DAYS` / `MAX_LOAN_DAYS` | Loan duration defaults and cap |
| `OVERDUE_FINE_PER_DAY` | Late-return fine |
| `JWT_SECRET` | Secret used to sign tokens — **change it for deployment** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime |
| `DEMO_MODE` | One-click account switcher (default `true`, set `false` in production) |
| `DB_ECHO` | Log generated SQL (`true`/`false`) |

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
│   │   │   ├── admin.py            # Dashboard / payment desk / catalog / accounts
│   │   │   ├── auth.py             # Register / login / JWT / demo login
│   │   │   ├── users.py            # Account list (public in demo mode)
│   │   │   ├── loans.py            # Loan history
│   │   │   ├── health.py           # Health probe with DB check
│   │   │   └── chat.py             # AI assistant placeholder
│   │   ├── models/                 # Enums + SQLModel mappings of existing tables
│   │   ├── schemas/                # Pydantic request/response models
│   │   └── services/               # Query + transaction logic (routers stay thin)
│   ├── history_querys.sql          # Schema, enums, grants + later changes
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

### Design notes

- **The backend never creates or migrates tables.** The schema and grants are owned by the DBA and defined in `backend/history_querys.sql`; `create_all()` is never called.
- **Soft delete:** `Book_Copy.book_id → Book.book_id` was changed from `CASCADE` to `RESTRICT`, and `is_active` was added afterwards. Books are hidden, never physically deleted, so copies referenced by loans stay intact.
- **Permissions:** `website` has `SELECT, INSERT, UPDATE` on all tables (and `DELETE` on most, but not `User`/`Loan`). Borrowing only inserts/updates `Loan` and `Book_Copy`.
- **Prices** live on `Loan`, not `Book`. The confirmation dialog shows fee, duration and due date, but **no card/PayPal data is ever collected** — payment is at the library desk.
- **Invoices:** `/loans/:loanId/receipt` — printable and downloadable as PDF, with number `QM-YEAR-000123`, a QR code, line items and payment status. Numbers derive from `loan_id`, so no extra table is needed.
- **Borrowing** uses `FOR UPDATE SKIP LOCKED` and an explicit confirmation. **Returning is staff-only** — the borrower hands back the physical copy and staff confirms it; any late fine is calculated server-side.
- **Book detail pages** at `/books/:bookId`; **profile** at `/profile` (details, password, loan history).
- **SPA routing:** `frontend/public/_redirects` handles history fallback on Netlify-like hosts; other hosts must rewrite unknown paths to `/index.html`.
- **Authentication:** JWT access tokens, bcrypt passwords; the two legacy plaintext accounts are upgraded on first successful login.
- **Demo switcher:** labelled `DEMO` dropdown issues a real JWT without a password. Set `DEMO_MODE=false` in production to disable it and make `/api/users` admin-only.
- **Authorization:** borrowing and `/api/loans` use the account in the token, never a `user_id` from the body. Catalog browsing is public; `borrowed_by_me` is computed only when a token is supplied.

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
| `GET` | `/api/loans/{id}` | 🔒 One loan (owner or staff) — powers the invoice page |
| `GET` | `/api/admin/stats` | 🔒 Staff: dashboard numbers |
| `GET` | `/api/admin/payments` | 🔒 Staff: payment queue (`pending_only`, `query`) |
| `POST` | `/api/admin/payments/{id}` | 🔒 Staff: record payment |
| `POST` | `/api/admin/walkin-loans` | 🔒 Staff: verified walk-in loan |
| `POST` | `/api/admin/loans/{id}/return` | 🔒 Staff: confirm a physical return + fine calculation |
| `POST` | `/api/admin/books` | 🔒 Staff: add a book + author/category/publisher + copies |
| `PATCH` | `/api/admin/books/{id}` | 🔒 Staff: edit book details / author / category / copies |
| `PATCH` | `/api/admin/books/{id}/active` | 🔒 Staff: soft-delete / restore |
| `GET` | `/api/admin/users` | 🔒 Admin: all accounts |
| `PATCH` | `/api/admin/users/{id}/status` | 🔒 Admin: suspend / reactivate |
| `POST` | `/api/admin/staff` | 🔒 Admin: create a Staff account |
| `PATCH` | `/api/admin/users/{id}/role` | 🔒 Admin: Customer ↔ Staff |
| `POST` | `/api/chat` | AI assistant placeholder |

Interactive docs: `http://localhost:8000/docs`

---

## Payment workflow

1. The borrower confirms a loan → an invoice is created with status **Pending**.
2. They bring the invoice (or its QR) to the library desk.
3. Staff opens `/admin` → **Payment desk**, finds the invoice and records payment (Counter / Cash / Bank Transfer). No card or PayPal data is collected.
4. The invoice and the borrower's profile immediately show **Paid**. Late-return fines are settled the same way.
5. The borrower returns the physical copy; staff confirms it in **Returns**, which calculates any fine and frees the copy.

The camera scanner needs HTTPS or localhost. The invoice page also has **Download PDF** alongside Print.

## Admin panel

`/admin` (Staff or Admin) has six tabs: **Overview**, **Payment desk**, **Returns**, **Walk-in loan**, **Books** and **Users** (Admin only).

- **Walk-in loans:** staff checks the visitor's original ID, ticks a confirmation box and picks a book. A guest record is created with a random unusable password; the national id is stored once and reused on later visits, with a name-mismatch check. Identity data never appears in public endpoints.
- **Roles:** `Admin` manages accounts, roles and suspensions. `Staff` does the daily work but cannot manage accounts. Admins create staff via **Users → Add staff** or convert a Customer through the Role column; self-conversion and assigning `Admin` are blocked. Navbar shows **Admin** or **Desk**.
- Recording a payment and confirming a return both require a second confirmation dialog; settled rows show a disabled **Settled** state.
