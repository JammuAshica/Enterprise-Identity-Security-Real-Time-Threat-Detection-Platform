from datetime import datetime
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.models.session import UserSession
from app.models.security_log import SecurityLog, EventType
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import hash_password, verify_password


class UserService:
    @staticmethod
    def create_user(db: Session, user_in: UserCreate, created_by: Optional[str] = None) -> User:
        """Create a new user with unique checks and password hashing."""
        existing_username = db.query(User).filter(User.username == user_in.username).first()
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Username '{user_in.username}' is already registered.",
            )

        existing_email = db.query(User).filter(User.email == user_in.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{user_in.email}' is already registered.",
            )

        hashed_pw = hash_password(user_in.password)
        db_user = User(
            username=user_in.username,
            email=user_in.email,
            full_name=user_in.full_name,
            department=user_in.department,
            role=user_in.role,
            hashed_password=hashed_pw,
            is_active=True,
            is_locked=False,
            failed_login_attempts=0,
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    @staticmethod
    def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
        return db.query(User).offset(skip).limit(limit).all()

    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
        return user

    @staticmethod
    def unlock_user(db: Session, user_id: int, admin_user: User, ip_address: str = "127.0.0.1") -> User:
        """Admin unlock for a locked user account."""
        user = UserService.get_user_by_id(db, user_id)
        user.is_locked = False
        user.failed_login_attempts = 0
        user.lockout_until = None

        log = SecurityLog(
            event_type=EventType.ACCOUNT_UNLOCKED.value,
            username=user.username,
            user_id=user.id,
            ip_address=ip_address,
            status_code=200,
            details=f"Account manually unlocked by administrator '{admin_user.username}'.",
        )
        db.add(log)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def lock_user(db: Session, user_id: int, admin_user: User, ip_address: str = "127.0.0.1", reason: str = "Administrative action") -> User:
        """Admin manual lock for suspicious user account."""
        user = UserService.get_user_by_id(db, user_id)
        user.is_locked = True
        
        # Revoke all active sessions for this user upon manual lock
        db.query(UserSession).filter(
            UserSession.user_id == user_id,
            UserSession.is_revoked == False,
        ).update({"is_revoked": True, "revoked_at": datetime.utcnow()})

        log = SecurityLog(
            event_type=EventType.ACCOUNT_LOCKED.value,
            username=user.username,
            user_id=user.id,
            ip_address=ip_address,
            status_code=403,
            details=f"Account manually suspended by '{admin_user.username}'. Reason: {reason}",
        )
        db.add(log)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def update_user(db: Session, user_id: int, user_in: UserUpdate) -> User:
        user = UserService.get_user_by_id(db, user_id)
        update_data = user_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def change_password(db: Session, user: User, current_pw: str, new_pw: str) -> None:
        """Validate current password, update to new hash, revoke all other active sessions."""
        if not verify_password(current_pw, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password verification failed.",
            )

        user.hashed_password = hash_password(new_pw)
        # Revoke all current sessions to force re-authentication
        db.query(UserSession).filter(
            UserSession.user_id == user.id,
            UserSession.is_revoked == False,
        ).update({"is_revoked": True, "revoked_at": datetime.utcnow()})

        log = SecurityLog(
            event_type=EventType.PASSWORD_CHANGE.value,
            username=user.username,
            user_id=user.id,
            ip_address="127.0.0.1",
            status_code=200,
            details="User password changed; all active sessions revoked.",
        )
        db.add(log)
        db.commit()

    @staticmethod
    def get_user_sessions(db: Session, user_id: int) -> List[UserSession]:
        return db.query(UserSession).filter(UserSession.user_id == user_id).order_by(UserSession.created_at.desc()).all()
