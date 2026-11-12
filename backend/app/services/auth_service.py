from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
import jwt

from app.config import settings
from app.models.user import User, UserRole
from app.models.session import UserSession
from app.models.security_log import SecurityLog, EventType
from app.core.security import (
    verify_password,
    hash_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)


class AuthService:
    @staticmethod
    def authenticate_user(
        db: Session,
        username_or_email: str,
        password: str,
        ip_address: str,
        user_agent: Optional[str] = None,
        city: Optional[str] = None,
        country: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Authenticate user with credential verification, account lockout checks,
        session generation, and comprehensive audit logging.
        """
        now = datetime.utcnow()
        # Find user by username or email
        user = db.query(User).filter(
            (User.username == username_or_email) | (User.email == username_or_email)
        ).first()

        if not user:
            # Log login failure with unknown username for SIEM anomaly detection
            log = SecurityLog(
                event_type=EventType.LOGIN_FAILURE.value,
                username=username_or_email,
                ip_address=ip_address,
                city=city,
                country=country,
                latitude=latitude,
                longitude=longitude,
                user_agent=user_agent,
                status_code=401,
                details=f"Login failure: User '{username_or_email}' does not exist.",
            )
            db.add(log)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password.",
            )

        # Check account activation
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated. Please contact your system administrator.",
            )

        # Check account lockout status
        if user.is_locked:
            if user.lockout_until and user.lockout_until > now:
                remaining_minutes = max(1, int((user.lockout_until - now).total_seconds() / 60))
                # Log attempt on locked account
                log = SecurityLog(
                    event_type=EventType.LOGIN_FAILURE.value,
                    username=user.username,
                    user_id=user.id,
                    ip_address=ip_address,
                    city=city,
                    country=country,
                    latitude=latitude,
                    longitude=longitude,
                    user_agent=user_agent,
                    status_code=403,
                    details=f"Login rejected: Account is locked until {user.lockout_until.isoformat()}.",
                )
                db.add(log)
                db.commit()
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Account is temporarily locked due to excessive failed attempts. Try again in {remaining_minutes} minute(s).",
                )
            elif user.lockout_until and user.lockout_until <= now:
                # Lockout duration has elapsed; unlock account automatically
                user.is_locked = False
                user.failed_login_attempts = 0
                user.lockout_until = None
                db.commit()

        # Verify password
        if not verify_password(password, user.hashed_password):
            user.failed_login_attempts += 1
            details = f"Failed password attempt ({user.failed_login_attempts}/{settings.MAX_FAILED_LOGIN_ATTEMPTS})."

            # Check if threshold reached for automatic lockout
            if user.failed_login_attempts >= settings.MAX_FAILED_LOGIN_ATTEMPTS:
                user.is_locked = True
                user.lockout_until = now + timedelta(minutes=settings.ACCOUNT_LOCKOUT_DURATION_MINUTES)
                details += f" Account locked for {settings.ACCOUNT_LOCKOUT_DURATION_MINUTES} minutes."

                # Log account locked event
                lock_log = SecurityLog(
                    event_type=EventType.ACCOUNT_LOCKED.value,
                    username=user.username,
                    user_id=user.id,
                    ip_address=ip_address,
                    city=city,
                    country=country,
                    latitude=latitude,
                    longitude=longitude,
                    user_agent=user_agent,
                    status_code=403,
                    details=f"Account automatically locked due to {user.failed_login_attempts} consecutive failed attempts.",
                )
                db.add(lock_log)

            fail_log = SecurityLog(
                event_type=EventType.LOGIN_FAILURE.value,
                username=user.username,
                user_id=user.id,
                ip_address=ip_address,
                city=city,
                country=country,
                latitude=latitude,
                longitude=longitude,
                user_agent=user_agent,
                status_code=401,
                details=details,
            )
            db.add(fail_log)
            db.commit()

            if user.is_locked:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Account has been locked due to {settings.MAX_FAILED_LOGIN_ATTEMPTS} failed login attempts. Try again in {settings.ACCOUNT_LOCKOUT_DURATION_MINUTES} minutes.",
                )
            else:
                remaining = settings.MAX_FAILED_LOGIN_ATTEMPTS - user.failed_login_attempts
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Invalid credentials. {remaining} attempt(s) remaining before account lockout.",
                )

        # Successful login: reset failed attempts
        user.failed_login_attempts = 0
        user.is_locked = False
        user.lockout_until = None
        user.last_login_at = now
        user.last_login_ip = ip_address

        # Issue access & refresh tokens
        access_token, access_jti = create_access_token(
            data={"sub": str(user.id), "username": user.username, "role": user.role.value if hasattr(user.role, 'value') else user.role}
        )
        refresh_token, refresh_jti = create_refresh_token(
            data={"sub": str(user.id), "username": user.username}
        )

        # Record active session in database
        expires_at = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        session_record = UserSession(
            user_id=user.id,
            token_jti=access_jti,
            refresh_token_jti=refresh_jti,
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=now,
            expires_at=expires_at,
            is_revoked=False,
        )
        db.add(session_record)

        # Log success event
        success_log = SecurityLog(
            event_type=EventType.LOGIN_SUCCESS.value,
            username=user.username,
            user_id=user.id,
            ip_address=ip_address,
            city=city,
            country=country,
            latitude=latitude,
            longitude=longitude,
            user_agent=user_agent,
            status_code=200,
            details=f"Successful authentication for {user.username} ({user.role.value if hasattr(user.role, 'value') else user.role}).",
        )
        db.add(success_log)
        db.commit()

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "department": user.department,
                "role": user.role.value if hasattr(user.role, 'value') else user.role,
                "is_active": user.is_active,
                "is_locked": user.is_locked,
            },
        }

    @staticmethod
    def refresh_access_token(
        db: Session,
        refresh_token: str,
        ip_address: str,
        user_agent: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Validate refresh token and issue a new access token while checking revocation."""
        try:
            payload = decode_token(refresh_token)
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has expired. Please log in again.",
            )
        except jwt.PyJWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token.",
            )

        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type: expected refresh token.",
            )

        user_id = payload.get("sub")
        refresh_jti = payload.get("jti")
        if not user_id or not refresh_jti:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Malformed token claims.",
            )

        # Find corresponding session
        session_record = db.query(UserSession).filter(
            UserSession.refresh_token_jti == refresh_jti,
            UserSession.user_id == int(user_id),
        ).first()

        if not session_record or session_record.is_revoked:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has been revoked or expired.",
            )

        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user or not user.is_active or user.is_locked:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive or locked.",
            )

        # Generate new access token
        new_access_token, new_access_jti = create_access_token(
            data={"sub": str(user.id), "username": user.username, "role": user.role.value if hasattr(user.role, 'value') else user.role}
        )

        # Update session with new access JTI
        session_record.token_jti = new_access_jti
        session_record.ip_address = ip_address
        if user_agent:
            session_record.user_agent = user_agent

        # Log refresh event
        refresh_log = SecurityLog(
            event_type=EventType.TOKEN_REFRESH.value,
            username=user.username,
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            status_code=200,
            details="Access token refreshed successfully.",
        )
        db.add(refresh_log)
        db.commit()

        return {
            "access_token": new_access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "department": user.department,
                "role": user.role.value if hasattr(user.role, 'value') else user.role,
                "is_active": user.is_active,
                "is_locked": user.is_locked,
            },
        }

    @staticmethod
    def logout_user(
        db: Session,
        token_jti: str,
        user_id: int,
        ip_address: str,
        user_agent: Optional[str] = None,
    ) -> None:
        """Revoke current active session and record audit log."""
        session_record = db.query(UserSession).filter(
            UserSession.token_jti == token_jti,
            UserSession.user_id == user_id,
        ).first()

        now = datetime.utcnow()
        if session_record:
            session_record.is_revoked = True
            session_record.revoked_at = now

        user = db.query(User).filter(User.id == user_id).first()
        username = user.username if user else f"user_{user_id}"

        log = SecurityLog(
            event_type=EventType.LOGOUT.value,
            username=username,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            status_code=200,
            details="User logged out; session token revoked.",
        )
        db.add(log)
        db.commit()

    @staticmethod
    def revoke_session_by_id(
        db: Session,
        session_id: int,
        requesting_user: User,
    ) -> None:
        """Revoke a specific session with authorization check."""
        session_record = db.query(UserSession).filter(UserSession.id == session_id).first()
        if not session_record:
            raise HTTPException(status_code=404, detail="Session not found.")

        # Non-admins can only revoke their own sessions
        req_role = requesting_user.role.value if hasattr(requesting_user.role, 'value') else requesting_user.role
        if req_role != UserRole.ADMIN.value and session_record.user_id != requesting_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to revoke another user's session.")

        session_record.is_revoked = True
        session_record.revoked_at = datetime.utcnow()
        db.commit()
