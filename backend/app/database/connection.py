from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import logging

POSTGRES_URL = "postgresql://postgres:1234@localhost:5432/project_manager_db"
SQLITE_URL = "sqlite:///./project_manager_db.sqlite"

try:
    engine = create_engine(POSTGRES_URL, connect_args={"connect_timeout": 2})
    # Test connection
    with engine.connect() as conn:
        pass
    logging.info("Connected to PostgreSQL database.")
except Exception as e:
    logging.warning(f"PostgreSQL connection failed ({e}). Falling back to SQLite database.")
    engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()