"""
User models for authentication and authorization.

This module defines the User SQLAlchemy model and related Pydantic schemas
for user registration, login, and data validation.
"""

from datetime import datetime

from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy import Boolean, Column, DateTime, Integer, String

from ..database import Base

# Password hashing context
pwd_context = CryptContext(schemes=['pbkdf2_sha256'], deprecated='auto')


class User(Base):
    """User database model."""

    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def verify_password(self, password: str) -> bool:
        """Verify a password against the hashed password."""
        result: bool = pwd_context.verify(password, self.hashed_password)  # type: ignore[arg-type]
        return result

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using pbkdf2_sha256."""
        result: str = pwd_context.hash(password)
        return result


class UserBase(BaseModel):
    """Base user schema."""

    email: EmailStr
    username: str
    full_name: str | None = None
    is_active: bool = True
    is_superuser: bool = False


class UserCreate(UserBase):
    """Schema for user creation."""

    password: str


class UserUpdate(BaseModel):
    """Schema for user updates."""

    email: EmailStr | None = None
    username: str | None = None
    full_name: str | None = None
    is_active: bool | None = None
    password: str | None = None


class UserInDB(UserBase):
    """Schema for user in database."""

    id: int
    created_at: datetime
    updated_at: datetime


class UserResponse(BaseModel):
    """Response model for user data."""

    model_config = {'from_attributes': True}

    id: int
    email: str
    username: str
    full_name: str | None = None
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime


class Token(BaseModel):
    """Token schema."""

    access_token: str
    token_type: str = 'bearer'


class TokenData(BaseModel):
    """Token data schema."""

    username: str | None = None
