from datetime import datetime
from typing import List, Optional, Callable
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import jwt

from app.database import get_db
from app.models.user import User, UserRole
from app.models.session import UserSession
from app.models.security_log import SecurityLog, EventType
from app.core.security import decode_token

security_scheme = HTTPBearer(auto_error=True)


def get_client_ip(request: Request) -> str:
    """Extract real client IP address from request headers or direct client."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


def get_user_agent(request: Request) -> str:
    """Extract user agent from request header."""
    return request.headers.get("User-Agent", "Unknown")


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency that validates JWT access token, checks session revocation in DB,
    and returns authenticated User model.
    """
    token = credentials.credentials
    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token has expired. Please refresh your session.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Validate token type
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type for access authentication.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    token_jti = payload.get("jti")
    if not user_id or not token_jti:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing required claims.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check session revocation status in database (Blacklist/Active Session Management)
    session_record = db.query(UserSession).filter(
        UserSession.token_jti == token_jti,
        UserSession.user_id == int(user_id),
    ).first()

    if not session_record or session_record.is_revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked or session has been terminated.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token does not exist.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated.",
        )

    # Check lockout
    now = datetime.utcnow()
    if user.is_locked:
        if user.lockout_until and user.lockout_until > now:
            remaining = int((user.lockout_until - now).total_seconds() / 60)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account is currently locked. Try again in {remaining} minute(s) or contact administrator.",
            )
        elif user.lockout_until and user.lockout_until <= now:
            # Auto-unlock if lockout window has expired
            user.is_locked = False
            user.failed_login_attempts = 0
            user.lockout_until = None
            db.commit()

    # Attach current session jti to request state for downstream handlers if needed
    request.state.current_user = user
    request.state.token_jti = token_jti
    return user


def require_roles(*allowed_roles: UserRole) -> Callable:
    """
    Role-Based Access Control (RBAC) dependency factory.
    Enforces that current authenticated user possesses at least one of the allowed roles.
    Logs privilege escalation / unauthorized access attempts when denied.
    """
    def role_checker(
        request: Request,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        user_role = current_user.role
        if isinstance(user_role, str):
            try:
                user_role = UserRole(user_role)
            except ValueError:
                pass

        if user_role not in allowed_roles:
            # Record unauthorized privilege escalation attempt in security logs
            client_ip = get_client_ip(request)
            user_agent = get_user_agent(request)
            required_str = ", ".join([r.value for r in allowed_roles])
            
            log = SecurityLog(
                event_type=EventType.PRIVILEGE_ACCESS_DENIED.value,
                username=current_user.username,
                user_id=current_user.id,
                ip_address=client_ip,
                user_agent=user_agent,
                endpoint=request.url.path,
                http_method=request.method,
                status_code=status.HTTP_403_FORBIDDEN,
                details=f"Unauthorized access denied. User role: '{current_user.role}'. Required: [{required_str}].",
            )
            db.add(log)
            db.commit()

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Insufficient permissions. Requires one of: [{required_str}].",
            )
        return current_user

    return role_checker
