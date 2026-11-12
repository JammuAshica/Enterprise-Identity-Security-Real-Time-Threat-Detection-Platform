from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Username or Email")
    password: str = Field(..., min_length=1, description="Password")


class UserSessionInfo(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    department: str
    role: str
    is_active: bool
    is_locked: bool


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserSessionInfo


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class SessionResponse(BaseModel):
    id: int
    token_jti: str
    ip_address: str
    user_agent: Optional[str] = None
    created_at: datetime
    expires_at: datetime
    is_revoked: bool
    revoked_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None
