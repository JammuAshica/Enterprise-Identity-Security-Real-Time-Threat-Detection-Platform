from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, Request
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.user import User, UserRole
from app.models.security_log import SecurityLog, EventType
from app.models.alert import SecurityAlert
from app.models.incident import Incident
from app.schemas.security_log import SecurityLogResponse, SecurityLogCreate
from app.core.dependencies import get_current_user, require_roles, get_client_ip, get_user_agent
from app.services.threat_engine import threat_engine

router = APIRouter(prefix="/security-events", tags=["Security Events & Audit Logs"])


@router.get("/", response_model=List[SecurityLogResponse])
def get_security_audit_logs(
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    username: Optional[str] = Query(None, description="Search by username"),
    ip_address: Optional[str] = Query(None, description="Search by IP address"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.SECURITY_ANALYST)),
    db: Session = Depends(get_db),
):
    """
    Searchable audit logs API with filtering by event type, username, IP, and pagination.
    Requires Security Analyst or Admin role.
    """
    query = db.query(SecurityLog)
    if event_type:
        query = query.filter(SecurityLog.event_type == event_type)
    if username:
        query = query.filter(SecurityLog.username.ilike(f"%{username}%"))
    if ip_address:
        query = query.filter(SecurityLog.ip_address.ilike(f"%{ip_address}%"))

    return query.order_by(SecurityLog.timestamp.desc()).offset(skip).limit(limit).all()


@router.post("/ingest", response_model=SecurityLogResponse)
async def ingest_security_event(
    log_in: SecurityLogCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Ingest a security event log, process asynchronously through the threat engine,
    and broadcast live over WebSockets.
    """
    client_ip = log_in.ip_address or get_client_ip(request)
    user_agent = log_in.user_agent or get_user_agent(request)

    log = SecurityLog(
        timestamp=datetime.utcnow(),
        event_type=log_in.event_type,
        username=log_in.username or current_user.username,
        user_id=log_in.user_id or current_user.id,
        ip_address=client_ip,
        city=log_in.city,
        country=log_in.country,
        latitude=log_in.latitude,
        longitude=log_in.longitude,
        user_agent=user_agent,
        endpoint=log_in.endpoint,
        http_method=log_in.http_method,
        status_code=log_in.status_code,
        details=log_in.details,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    # Threat engine analysis
    alerts = threat_engine.process_security_event_sync(db, log.id)

    # Broadcast event payload
    event_payload = {
        "type": "NEW_SECURITY_EVENT",
        "data": {
            "id": log.id,
            "timestamp": log.timestamp.isoformat(),
            "event_type": log.event_type,
            "username": log.username,
            "ip_address": log.ip_address,
            "city": log.city,
            "country": log.country,
            "status_code": log.status_code,
            "details": log.details,
        },
        "alerts_triggered": len(alerts),
    }
    await threat_engine.broadcast_event(event_payload)

    return log


@router.get("/stats")
def get_dashboard_statistics(
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.SECURITY_ANALYST)),
    db: Session = Depends(get_db),
):
    """
    Real-time SOC telemetry statistics for interactive dashboard widgets:
    event counts, failure rate, active alerts by severity, incident counts.
    """
    total_logs = db.query(SecurityLog).count()
    failed_logins = db.query(SecurityLog).filter(SecurityLog.event_type == EventType.LOGIN_FAILURE.value).count()
    successful_logins = db.query(SecurityLog).filter(SecurityLog.event_type == EventType.LOGIN_SUCCESS.value).count()
    locked_accounts = db.query(User).filter(User.is_locked == True).count()

    total_alerts = db.query(SecurityAlert).count()
    critical_alerts = db.query(SecurityAlert).filter(SecurityAlert.severity == "CRITICAL").count()
    high_alerts = db.query(SecurityAlert).filter(SecurityAlert.severity == "HIGH").count()
    medium_alerts = db.query(SecurityAlert).filter(SecurityAlert.severity == "MEDIUM").count()
    low_alerts = db.query(SecurityAlert).filter(SecurityAlert.severity == "LOW").count()

    total_incidents = db.query(Incident).count()
    open_incidents = db.query(Incident).filter(Incident.status.in_(["OPEN", "INVESTIGATING"])).count()
    resolved_incidents = db.query(Incident).filter(Incident.status == "RESOLVED").count()

    # Event distribution by type (top 6)
    event_counts = (
        db.query(SecurityLog.event_type, func.count(SecurityLog.id))
        .group_by(SecurityLog.event_type)
        .order_by(func.count(SecurityLog.id).desc())
        .limit(6)
        .all()
    )

    return {
        "total_events": total_logs,
        "failed_logins": failed_logins,
        "successful_logins": successful_logins,
        "locked_accounts": locked_accounts,
        "alerts": {
            "total": total_alerts,
            "critical": critical_alerts,
            "high": high_alerts,
            "medium": medium_alerts,
            "low": low_alerts,
        },
        "incidents": {
            "total": total_incidents,
            "open": open_incidents,
            "resolved": resolved_incidents,
        },
        "event_distribution": [{"type": e[0], "count": e[1]} for e in event_counts],
    }


@router.websocket("/ws")
async def security_feed_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time live security events stream.
    Subscribers receive live threat alerts and authentication events.
    """
    await threat_engine.register_websocket(websocket)
    try:
        while True:
            # Keep-alive ping/pong
            await websocket.receive_text()
    except WebSocketDisconnect:
        threat_engine.unregister_websocket(websocket)
    except Exception:
        threat_engine.unregister_websocket(websocket)
