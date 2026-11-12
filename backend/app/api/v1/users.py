from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    PasswordChangeRequest,
    LockoutStatusResponse,
)
from app.schemas.auth import MessageResponse
from app.core.dependencies import (
    get_current_user,
    require_roles,
    get_client_ip,
)
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["User & Access Management (Admin)"])


@router.get("/", response_model=List[UserResponse])
def list_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.SECURITY_ANALYST)),
    db: Session = Depends(get_db),
):
    """List enterprise users. Requires Admin or Security Analyst role."""
    return UserService.get_users(db, skip=skip, limit=limit)


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """Provision a new user account. Requires Admin role."""
    return UserService.create_user(db, user_in, created_by=current_user.username)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get user profile by ID. Admin, Analyst, or own account."""
    curr_role = current_user.role.value if hasattr(current_user.role, 'value') else current_user.role
    if curr_role not in [UserRole.ADMIN.value, UserRole.SECURITY_ANALYST.value] and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view other user profiles.")
    return UserService.get_user_by_id(db, user_id)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """Update user account attributes. Requires Admin role."""
    return UserService.update_user(db, user_id, user_in)


@router.post("/{user_id}/lock", response_model=UserResponse)
def lock_user_account(
    user_id: int,
    request: Request,
    reason: Optional[str] = "Manual administrative lock",
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.SECURITY_ANALYST)),
    db: Session = Depends(get_db),
):
    """
    Manually lock/suspend a user account and terminate all active sessions.
    Requires Admin or Security Analyst role.
    """
    client_ip = get_client_ip(request)
    return UserService.lock_user(db, user_id=user_id, admin_user=current_user, ip_address=client_ip, reason=reason)


@router.post("/{user_id}/unlock", response_model=UserResponse)
def unlock_user_account(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.SECURITY_ANALYST)),
    db: Session = Depends(get_db),
):
    """
    Unlock a locked user account and reset failed login counters.
    Requires Admin or Security Analyst role.
    """
    client_ip = get_client_ip(request)
    return UserService.unlock_user(db, user_id=user_id, admin_user=current_user, ip_address=client_ip)


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    pwd_data: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change current user's password and invalidate existing sessions."""
    UserService.change_password(
        db=db,
        user=current_user,
        current_pw=pwd_data.current_password,
        new_pw=pwd_data.new_password,
    )
    return MessageResponse(message="Password successfully updated; existing sessions revoked.")
