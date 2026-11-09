
-- create types and names:

-- ================
-- 1. ENUM Types:
-- ================

CREATE TYPE user_role AS ENUM ('Admin', 'Customer');
CREATE TYPE account_status_enum AS ENUM ('Active', 'Flagged', 'Suspended', 'Inactive');
CREATE TYPE copy_status_enum AS ENUM ('Available', 'Rented', 'Maintenance', 'Lost');
CREATE TYPE loan_status_enum AS ENUM ('Active', 'Overdue', 'Returned', 'Returned_Overdue');
CREATE TYPE fine_status_enum AS ENUM ('Paid', 'Unpaid');
CREATE TYPE reservation_status_enum AS ENUM ('Pending', 'Fulfilled', 'Canceled');

-- ============
-- 2. Tables:
-- ============

CREATE TABLE "User" (
    user_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address VARCHAR(255),
    role user_role DEFAULT 'Customer',
    account_status account_status_enum DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Publisher" (
    publisher_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Category" (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Book" (
    book_id SERIAL PRIMARY KEY,
    isbn VARCHAR(20) UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    publication_year INT,
    publisher_id INT REFERENCES "Publisher"(publisher_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Author" (
    author_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Author_Book" (
    book_id INT REFERENCES "Book"(book_id) ON DELETE CASCADE,
    author_id INT REFERENCES "Author"(author_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (book_id, author_id)
);

CREATE TABLE "Book_Category" (
    book_id INT REFERENCES "Book"(book_id) ON DELETE CASCADE,
    category_id INT REFERENCES "Category"(category_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (book_id, category_id)
);

CREATE TABLE "Book_Copy" (
    copy_id SERIAL PRIMARY KEY,
    book_id INT REFERENCES "Book"(book_id) ON DELETE CASCADE,
    status copy_status_enum DEFAULT 'Available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Loan" (
    loan_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES "User"(user_id) ON DELETE RESTRICT,
    copy_id INT REFERENCES "Book_Copy"(copy_id) ON DELETE RESTRICT,
    borrow_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP NOT NULL,
    return_date TIMESTAMP,
    status loan_status_enum DEFAULT 'Active',
    rental_price DECIMAL(10, 2) NOT NULL,
    discount_percentage DECIMAL(5, 2) DEFAULT 0.00,
    final_price DECIMAL(10, 2) NOT NULL,
    fine_amount DECIMAL(10, 2) DEFAULT 0.00,
    fine_status fine_status_enum,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Reservation" (
    reservation_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES "User"(user_id) ON DELETE CASCADE,
    book_id INT REFERENCES "Book"(book_id) ON DELETE CASCADE,
    reservation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status reservation_status_enum DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Review" (
    review_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES "User"(user_id) ON DELETE CASCADE,
    book_id INT REFERENCES "Book"(book_id) ON DELETE CASCADE,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--=================================================================================

--  grand permissions to the website's backend:

-- 1. Database and Schema Access
GRANT CONNECT ON DATABASE db TO website;
GRANT USAGE ON SCHEMA public TO website;

-- 2. Basic DML (Data Manipulation Language) Permissions
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO website;

-- 3. Sequence Permissions (Required for SERIAL primary keys)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO website;


-- 4. DELETE Permissions with Security Restrictions
---- First, grant DELETE on all tables for administrative functions
GRANT DELETE ON ALL TABLES IN SCHEMA public TO website;

---- SECURITY ADVICE IMPLEMENTATION: Revoke DELETE on sensitive tables
REVOKE DELETE ON TABLE "User", "Loan" FROM website;


-- 5. Future Tables and Sequences (Default Privileges)
-- Ensure that any new tables or sequences created later get the same basic permissions automatically
-- Note: DELETE is omitted here for safety. If a future table needs DELETE, it must be granted manually.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE ON TABLES TO website;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO website;

--==========================================================================================================
