from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.security_log import SecurityLog, EventType
from app.schemas.user import UserResponse
from app.core.dependencies import get_current_user, get_client_ip

router = APIRouter(prefix="/employees", tags=["Employee Access & Self-Service"])


class AccessRequestIn(BaseModel):
    resource_name: str = Field(..., max_length=100)
    justification: str = Field(..., max_length=500)
    duration_hours: int = Field(default=8, ge=1, le=72)


class AccessRequestOut(BaseModel):
    request_id: str
    username: str
    resource_name: str
    justification: str
    duration_hours: int
    status: str
    submitted_at: datetime


@router.get("/profile", response_model=UserResponse)
def get_employee_profile(
    current_user: User = Depends(get_current_user),
):
    """Retrieve personal employee identity card and status."""
    return current_user


@router.get("/directory")
def get_employee_directory(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """View corporate employee directory."""
    employees = db.query(User).filter(User.is_active == True).all()
    return [
        {
            "id": emp.id,
            "username": emp.username,
            "full_name": emp.full_name,
            "email": emp.email,
            "department": emp.department,
            "role": emp.role.value if hasattr(emp.role, 'value') else emp.role,
        }
        for emp in employees
    ]


@router.post("/access-request", response_model=AccessRequestOut)
def submit_access_request(
    req_data: AccessRequestIn,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit an elevated entitlement / self-service access request."""
    import uuid

    req_id = f"REQ-{uuid.uuid4().hex[:8].upper()}"
    client_ip = get_client_ip(request)

    # Log access request in audit trail
    log = SecurityLog(
        event_type="access_request_submitted",
        username=current_user.username,
        user_id=current_user.id,
        ip_address=client_ip,
        status_code=200,
        details=f"Access request {req_id} for '{req_data.resource_name}': {req_data.justification}",
    )
    db.add(log)
    db.commit()

    return AccessRequestOut(
        request_id=req_id,
        username=current_user.username,
        resource_name=req_data.resource_name,
        justification=req_data.justification,
        duration_hours=req_data.duration_hours,
        status="PENDING_SECURITY_APPROVAL",
        submitted_at=datetime.utcnow(),
    )


@router.get("/my-activity")
def get_employee_activity(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """View recent personal security and authentication history."""
    logs = db.query(SecurityLog).filter(
        SecurityLog.username == current_user.username
    ).order_by(SecurityLog.timestamp.desc()).limit(limit).all()

    return logs
