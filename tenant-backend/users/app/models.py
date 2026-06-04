from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from enum import Enum


class UserRole(str, Enum):
    member = "member"
    staff = "staff"
    admin = "admin"


class MemberRelation(str, Enum):
    PRIMARY = "PRIMARY"
    SPOUSE = "SPOUSE"
    CHILD = "CHILD"
    OTHER = "OTHER"


# =============================================================================
# USER MODELS
# =============================================================================

class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.member
    member_number: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v):
        return str(v).lower().strip()


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    member_number: Optional[str] = None
    is_active: Optional[bool] = None
    force_password_change: Optional[bool] = None
    notes: Optional[str] = None

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v):
        if v:
            return str(v).lower().strip()
        return v


class UserResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    role: UserRole
    member_number: Optional[str]
    is_active: bool
    force_password_change: bool
    notes: Optional[str]


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v):
        return str(v).lower().strip()


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    role: str
    force_password_change: bool = False


# =============================================================================
# MEMBER MODELS
# =============================================================================

class MemberCreate(BaseModel):
    first_name: str
    last_name: str
    relation: MemberRelation = MemberRelation.PRIMARY
    dietary_flags: List[str] = []
    notes: Optional[str] = None


class MemberUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    relation: Optional[MemberRelation] = None
    dietary_flags: Optional[List[str]] = None
    notes: Optional[str] = None


class MemberResponse(BaseModel):
    id: int
    user_id: int
    first_name: str
    last_name: str
    relation: MemberRelation
    dietary_flags: List[str]
    notes: Optional[str]
    is_active: bool