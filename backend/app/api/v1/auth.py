from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.session import UserSession
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    SessionResponse,
    MessageResponse,
    UserSessionInfo,
)
from app.core.dependencies import (
    get_current_user,
    get_client_ip,
    get_user_agent,
)
from app.services.auth_service import AuthService
from app.services.threat_engine import threat_engine
from app.models.security_log import SecurityLog

router = APIRouter(prefix="/auth", tags=["Authentication & Session Management"])


@router.post("/login", response_model=TokenResponse)
def login(
    request: Request,
    login_data: LoginRequest,
    city: Optional[str] = None,
    country: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    db: Session = Depends(get_db),
):
    """
    Authenticate user with username and password.
    Enforces account lockout mechanisms and tracks active sessions.
    """
    client_ip = get_client_ip(request)
    user_agent = get_user_agent(request)

    # GeoIP simulation header or parameter override for realistic testing
    req_city = request.headers.get("X-Geo-City", city)
    req_country = request.headers.get("X-Geo-Country", country)
    req_lat = float(request.headers.get("X-Geo-Lat", latitude or 0)) if (request.headers.get("X-Geo-Lat") or latitude) else None
    req_lon = float(request.headers.get("X-Geo-Lon", longitude or 0)) if (request.headers.get("X-Geo-Lon") or longitude) else None

    result = AuthService.authenticate_user(
        db=db,
        username_or_email=login_data.username,
        password=login_data.password,
        ip_address=client_ip,
        user_agent=user_agent,
        city=req_city,
        country=req_country,
        latitude=req_lat,
        longitude=req_lon,
    )

    # Evaluate the most recent log through threat engine
    latest_log = db.query(SecurityLog).order_by(SecurityLog.id.desc()).first()
    if latest_log:
        threat_engine.process_security_event_sync(db, latest_log.id)

    return result


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(
    request: Request,
    refresh_data: RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    """
    Issue a new JWT access token using an unrevoked refresh token.
    Rotates session credentials and validates revocation status.
    """
    client_ip = get_client_ip(request)
    user_agent = get_user_agent(request)
    return AuthService.refresh_access_token(
        db=db,
        refresh_token=refresh_data.refresh_token,
        ip_address=client_ip,
        user_agent=user_agent,
    )


@router.post("/logout", response_model=MessageResponse)
def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Revoke current user session and blacklist active JWT token.
    """
    client_ip = get_client_ip(request)
    user_agent = get_user_agent(request)
    token_jti = getattr(request.state, "token_jti", None)

    if token_jti:
        AuthService.logout_user(
            db=db,
            token_jti=token_jti,
            user_id=current_user.id,
            ip_address=client_ip,
            user_agent=user_agent,
        )

    return MessageResponse(message="Successfully logged out; session revoked.")


@router.get("/me", response_model=UserSessionInfo)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    """Retrieve authenticated user's current identity and role claims."""
    return UserSessionInfo(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        department=current_user.department,
        role=current_user.role.value if hasattr(current_user.role, 'value') else current_user.role,
        is_active=current_user.is_active,
        is_locked=current_user.is_locked,
    )


@router.get("/sessions", response_model=List[SessionResponse])
def get_user_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all active and historical sessions for the current user."""
    sessions = db.query(UserSession).filter(
        UserSession.user_id == current_user.id
    ).order_by(UserSession.created_at.desc()).all()
    return sessions


@router.delete("/sessions/{session_id}", response_model=MessageResponse)
def revoke_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Revoke a specific session (User self-service or Admin)."""
    AuthService.revoke_session_by_id(db=db, session_id=session_id, requesting_user=current_user)
    return MessageResponse(message=f"Session {session_id} has been revoked.")
