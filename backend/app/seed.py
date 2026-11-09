"""
Seed data script to populate the database with initial library books.
Can be executed directly or called on application startup.
"""
from sqlmodel import Session, select
from app.database import engine
from app.models.book import Book

SAMPLE_BOOKS = [
    Book(
        title="Clean Code: A Handbook of Agile Software Craftsmanship",
        author="Robert C. Martin",
        category="Computer Science",
        price=4.99,
        is_available=True,
        description="A handbook of craftsmanship principles for writing elegant, readable, and maintainable software.",
        cover_image="https://images.unsplash.com/photo-1532012164546-f432f2e3777a?w=400&auto=format&fit=crop&q=80"
    ),
    Book(
        title="Designing Data-Intensive Applications",
        author="Martin Kleppmann",
        category="Computer Science",
        price=6.50,
        is_available=True,
        description="The definitive guide to the architecture, storage, and processing of distributed data systems.",
        cover_image="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80"
    ),
    Book(
        title="Dune",
        author="Frank Herbert",
        category="Science Fiction",
        price=3.50,
        is_available=False,
        description="Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides, heir to a noble family.",
        cover_image="https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&auto=format&fit=crop&q=80"
    ),
    Book(
        title="Neuromancer",
        author="William Gibson",
        category="Science Fiction",
        price=2.99,
        is_available=True,
        description="The seminal cyberpunk novel following Case, a washed-up computer hacker hired for one last job.",
        cover_image="https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=400&auto=format&fit=crop&q=80"
    ),
    Book(
        title="Meditations",
        author="Marcus Aurelius",
        category="Philosophy",
        price=1.99,
        is_available=True,
        description="Private notes and philosophical reflections on Stoic philosophy and living with purpose.",
        cover_image="https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&auto=format&fit=crop&q=80"
    ),
    Book(
        title="Thinking, Fast and Slow",
        author="Daniel Kahneman",
        category="Psychology",
        price=3.99,
        is_available=True,
        description="An exploration of the two systems that drive the way we think: intuition vs. deliberative logic.",
        cover_image="https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=400&auto=format&fit=crop&q=80"
    ),
    Book(
        title="Steve Jobs",
        author="Walter Isaacson",
        category="Biography",
        price=5.00,
        is_available=False,
        description="The exclusive biography of the creative entrepreneur whose passion for perfection revolutionized six industries.",
        cover_image="https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&auto=format&fit=crop&q=80"
    ),
    Book(
        title="Sapiens: A Brief History of Humankind",
        author="Yuval Noah Harari",
        category="History",
        price=4.50,
        is_available=True,
        description="Explores how biology and history have defined us and enhanced our understanding of what it means to be human.",
        cover_image="https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=400&auto=format&fit=crop&q=80"
    )
]


def seed_database():
    """Populate database if no books exist yet."""
    with Session(engine) as session:
        try:
            existing_books = session.exec(select(Book)).first()
        except Exception as e:
            session.rollback()
            from app.database import init_db
            init_db()
            existing_books = None

        if existing_books is None:
            print("[INFO] Seeding initial book collection...")
            session.add_all(SAMPLE_BOOKS)
            session.commit()
            print(f"[SUCCESS] Seeded {len(SAMPLE_BOOKS)} books into the database.")
        else:
            print("[INFO] Database already contains books. Skipping seed.")


if __name__ == "__main__":
    from app.database import init_db
    init_db()
    seed_database()

