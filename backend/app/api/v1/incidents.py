from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.incident import Incident, IncidentStatus, IncidentSeverity
from app.models.session import UserSession
from app.models.security_log import SecurityLog, EventType
from app.schemas.incident import (
    IncidentCreate,
    IncidentUpdate,
    IncidentResponse,
    IncidentAssignRequest,
    IncidentResolveRequest,
)
from app.schemas.auth import MessageResponse
from app.core.dependencies import require_roles, get_client_ip
from app.services.incident_service import IncidentService
from app.config import settings

router = APIRouter(prefix="/incidents", tags=["Incident Response & Management"])


def _format_incident_response(inc: Incident) -> IncidentResponse:
    assigned_name = inc.assigned_to.full_name if inc.assigned_to else None
    resolved_name = inc.resolved_by.full_name if inc.resolved_by else None
    alerts_cnt = len(inc.alerts) if inc.alerts else 0

    return IncidentResponse(
        id=inc.id,
        title=inc.title,
        description=inc.description,
        severity=inc.severity,
        status=inc.status,
        target_user=inc.target_user,
        source_ip=inc.source_ip,
        assigned_to_id=inc.assigned_to_id,
        assigned_to_name=assigned_name,
        mitigation_actions=inc.mitigation_actions,
        resolution_notes=inc.resolution_notes,
        resolved_at=inc.resolved_at,
        resolved_by_id=inc.resolved_by_id,
        resolved_by_name=resolved_name,
        created_at=inc.created_at,
        updated_at=inc.updated_at,
        alerts_count=alerts_cnt,
    )


@router.get("/", response_model=List[IncidentResponse])
def list_incidents(
    status: Optional[str] = Query(None, description="Filter by status: OPEN, INVESTIGATING, CONTAINED, RESOLVED, CLOSED"),
    severity: Optional[str] = Query(None, description="Filter by severity: LOW, MEDIUM, HIGH, CRITICAL"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.SECURITY_ANALYST)),
    db: Session = Depends(get_db),
):
    """Retrieve security incidents. Requires Security Analyst or Admin role."""
    incidents = IncidentService.get_incidents(
        db=db,
        incident_status=status.upper() if status else None,
        severity=severity.upper() if severity else None,
        skip=skip,
        limit=limit,
    )
    return [_format_incident_response(i) for i in incidents]


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(
    incident_id: int,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.SECURITY_ANALYST)),
    db: Session = Depends(get_db),
):
    """Get detailed information for a specific security incident."""
    inc = IncidentService.get_incident_by_id(db, incident_id)
    return _format_incident_response(inc)


@router.post("/", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
def create_incident(
    incident_in: IncidentCreate,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.SECURITY_ANALYST)),
    db: Session = Depends(get_db),
):
    """Manually initiate a new security incident."""
    inc = IncidentService.create_incident(db, incident_in, current_user=current_user)
    return _format_incident_response(inc)


@router.put("/{incident_id}", response_model=IncidentResponse)
def update_incident(
    incident_id: int,
    incident_in: IncidentUpdate,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.SECURITY_ANALYST)),
    db: Session = Depends(get_db),
):
    """Update incident investigation attributes and containment status."""
    inc = IncidentService.update_incident(db, incident_id, incident_in, current_user=current_user)
    return _format_incident_response(inc)


@router.post("/{incident_id}/assign", response_model=IncidentResponse)
def assign_incident_analyst(
    incident_id: int,
    assign_in: IncidentAssignRequest,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.SECURITY_ANALYST)),
    db: Session = Depends(get_db),
):
    """Assign security incident to an analyst for active investigation."""
    inc = IncidentService.assign_incident(
        db=db,
        incident_id=incident_id,
        analyst_id=assign_in.assigned_to_id,
        current_user=current_user,
    )
    return _format_incident_response(inc)


@router.post("/{incident_id}/resolve", response_model=IncidentResponse)
def resolve_incident(
    incident_id: int,
    resolve_in: IncidentResolveRequest,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.SECURITY_ANALYST)),
    db: Session = Depends(get_db),
):
    """
    Resolve incident with root-cause and mitigation documentation.
    Requires Security Analyst or Admin role.
    """
    inc = IncidentService.resolve_incident(
        db=db,
        incident_id=incident_id,
        resolve_in=resolve_in,
        current_user=current_user,
    )
    return _format_incident_response(inc)


@router.post("/{incident_id}/suspend-target", response_model=IncidentResponse)
def suspend_incident_target_user(
    incident_id: int,
    request: Request,
    duration_minutes: int = Query(60, ge=5, le=1440),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.SECURITY_ANALYST)),
    db: Session = Depends(get_db),
):
    """
    Automated Incident Response Action:
    Execute immediate containment by temporarily suspending the targeted user account
    and revoking all active sessions.
    """
    client_ip = get_client_ip(request)
    inc = IncidentService.get_incident_by_id(db, incident_id)
    if not inc.target_user:
        raise HTTPException(status_code=400, detail="Incident does not have a designated target user.")

    target = db.query(User).filter(User.username == inc.target_user).first()
    if not target:
        raise HTTPException(status_code=404, detail=f"Target user '{inc.target_user}' not found in directory.")

    now = datetime.utcnow()
    target.is_locked = True
    target.lockout_until = now + timedelta(minutes=duration_minutes)

    # Invalidate all active sessions for immediate containment
    db.query(UserSession).filter(
        UserSession.user_id == target.id,
        UserSession.is_revoked == False,
    ).update({"is_revoked": True, "revoked_at": now})

    action_text = f"Automated Containment: User '{target.username}' suspended for {duration_minutes} minutes and all active sessions revoked."
    inc.mitigation_actions = (inc.mitigation_actions or "") + f"\n[{now.strftime('%Y-%m-%d %H:%M:%S')}] {action_text}"
    inc.status = IncidentStatus.CONTAINED.value

    # Log security containment event
    log = SecurityLog(
        event_type=EventType.ACCOUNT_LOCKED.value,
        username=target.username,
        user_id=target.id,
        ip_address=client_ip,
        status_code=403,
        details=f"Target account suspended via Incident #{inc.id} response containment action by '{current_user.username}'.",
    )
    db.add(log)
    db.commit()
    db.refresh(inc)

    return _format_incident_response(inc)
