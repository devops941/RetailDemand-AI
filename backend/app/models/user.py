from beanie import Document
from pymongo import IndexModel, ASCENDING
from pydantic import EmailStr, Field
from typing import List, Optional
from datetime import datetime


class Permission(Document):
    name: str
    description: str = ""

    class Settings:
        name = "permissions"
        indexes = [IndexModel([("name", ASCENDING)], unique=True)]


class Role(Document):
    name: str
    description: str = ""
    permissions: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "roles"
        indexes = [IndexModel([("name", ASCENDING)], unique=True)]


class User(Document):
    email: EmailStr
    full_name: str
    hashed_password: str
    role: str = "analyst"
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None

    class Settings:
        name = "users"
        indexes = [IndexModel([("email", ASCENDING)], unique=True)]


class RefreshToken(Document):
    user_id: str
    token: str
    expires_at: datetime
    revoked: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "refresh_tokens"
        indexes = [IndexModel([("token", ASCENDING)], unique=True)]
