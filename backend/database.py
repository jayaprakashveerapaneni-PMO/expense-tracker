from sqlmodel import SQLModel, create_engine, Session

# SQLite stores the whole database in a single file next to this code.
DATABASE_URL = "sqlite:///expenses.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


def init_db() -> None:
    """Create the tables (from models.py) if they don't exist yet."""
    SQLModel.metadata.create_all(engine)


def get_session():
    """Give each API request its own database session, closed automatically."""
    with Session(engine) as session:
        yield session
