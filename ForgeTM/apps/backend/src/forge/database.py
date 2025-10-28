"""
Database configuration and session management.

This module sets up SQLAlchemy for database operations,
including engine creation, session management, and base model definitions.
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, sessionmaker

from .config import settings

# Create SQLAlchemy engine
engine = create_engine(
    settings.database_url,
    connect_args={'check_same_thread': False} if 'sqlite' in settings.database_url else {},
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables() -> None:
    """Create all tables defined in models."""
    Base.metadata.create_all(bind=engine)
