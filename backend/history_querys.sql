-- 1. enums

CREATE TYPE user_role AS ENUM ('Admin', 'Customer');
CREATE TYPE account_status_enum AS ENUM ('Active', 'Flagged', 'Suspended', 'Inactive');
CREATE TYPE copy_status_enum AS ENUM ('Available', 'Rented', 'Maintenance', 'Lost');
CREATE TYPE loan_status_enum AS ENUM ('Active', 'Overdue', 'Returned', 'Returned_Overdue');
CREATE TYPE fine_status_enum AS ENUM ('Paid', 'Unpaid');
CREATE TYPE reservation_status_enum AS ENUM ('Pending', 'Fulfilled', 'Canceled');

-- 2. tables

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



-- 3. permissions

GRANT CONNECT ON DATABASE db TO website;
GRANT USAGE ON SCHEMA public TO website;

GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO website;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO website;

GRANT DELETE ON ALL TABLES IN SCHEMA public TO website;
REVOKE DELETE ON TABLE "User", "Loan" FROM website;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE ON TABLES TO website;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO website;






-- 4. later changes

-- 4.1
ALTER TABLE "Book_Copy" DROP CONSTRAINT "Book_Copy_book_id_fkey";
ALTER TABLE "Book_Copy"
    ADD CONSTRAINT "Book_Copy_book_id_fkey"
    FOREIGN KEY (book_id) REFERENCES "Book"(book_id) ON DELETE RESTRICT;

-- 4.2
ALTER TABLE "Book" ADD COLUMN is_active BOOLEAN DEFAULT TRUE;





-- 5. later changes

-- 5.1
DO $$
BEGIN
    CREATE TYPE payment_status_enum AS ENUM ('Pending', 'Paid', 'Waived');
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

ALTER TABLE "Loan"
    ADD COLUMN IF NOT EXISTS payment_status payment_status_enum DEFAULT 'Pending',
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30),
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS paid_by INT REFERENCES "User"(user_id) ON DELETE SET NULL;

UPDATE "Loan"
SET payment_status = CASE
        WHEN status IN ('Returned', 'Returned_Overdue') THEN 'Paid'::payment_status_enum
        ELSE 'Pending'::payment_status_enum
    END,
    paid_at = CASE
        WHEN status IN ('Returned', 'Returned_Overdue') THEN return_date
        ELSE NULL
    END
WHERE payment_status IS NULL OR payment_status = 'Pending';

ALTER TABLE "Loan" DROP CONSTRAINT IF EXISTS ck_loan_paid_at;
ALTER TABLE "Loan"
    ADD CONSTRAINT ck_loan_paid_at
    CHECK ((payment_status = 'Paid'::payment_status_enum) = (paid_at IS NOT NULL));

GRANT SELECT, INSERT, UPDATE ON "Loan" TO website;



-- 5.2
ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS national_id VARCHAR(30),
    ADD COLUMN IF NOT EXISTS is_walkin BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS id_verified_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS id_verified_by INT REFERENCES "User"(user_id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_national_id
    ON "User"(national_id)
    WHERE national_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE ON "User" TO website;




-- 5.3
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Staff';

CREATE OR REPLACE FUNCTION fn_check_actor_role() RETURNS trigger AS $$
DECLARE
    actor_id   INT;
    actor_role TEXT;
BEGIN
    IF TG_TABLE_NAME = 'User' THEN
        actor_id := NEW.id_verified_by;
    ELSIF TG_TABLE_NAME = 'Loan' THEN
        actor_id := NEW.paid_by;
    ELSE
        RETURN NEW;
    END IF;

    IF actor_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT role::TEXT INTO actor_role FROM "User" WHERE user_id = actor_id;

    IF actor_role IS NULL OR actor_role NOT IN ('Admin', 'Staff') THEN
        RAISE EXCEPTION
            'Only Admin or Staff may be recorded as actor; user % has role %',
            actor_id, actor_role;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_verified_by ON "User";
CREATE TRIGGER trg_user_verified_by
    BEFORE INSERT OR UPDATE OF id_verified_by ON "User"
    FOR EACH ROW EXECUTE FUNCTION fn_check_actor_role();

DROP TRIGGER IF EXISTS trg_loan_paid_by ON "Loan";
CREATE TRIGGER trg_loan_paid_by
    BEFORE INSERT OR UPDATE OF paid_by ON "Loan"
    FOR EACH ROW EXECUTE FUNCTION fn_check_actor_role();
