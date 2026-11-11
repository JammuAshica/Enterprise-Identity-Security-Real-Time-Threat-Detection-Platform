from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from app.models.user import UserRole


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)
    department: str = Field(default="Engineering", max_length=100)
    role: UserRole = UserRole.EMPLOYEE


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="Minimum 8 characters password")


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    department: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    is_locked: Optional[bool] = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    is_locked: bool
    failed_login_attempts: int
    lockout_until: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    last_login_ip: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


class LockoutStatusResponse(BaseModel):
    username: str
    is_locked: bool
    failed_attempts: int
    lockout_until: Optional[datetime] = None
