from datetime import datetime
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.incident import Incident, IncidentStatus, IncidentSeverity
from app.models.user import User, UserRole
from app.models.security_log import SecurityLog, EventType
from app.schemas.incident import (
    IncidentCreate,
    IncidentUpdate,
    IncidentAssignRequest,
    IncidentResolveRequest,
)


class IncidentService:
    @staticmethod
    def get_incidents(
        db: Session,
        incident_status: Optional[str] = None,
        severity: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Incident]:
        query = db.query(Incident)
        if incident_status:
            query = query.filter(Incident.status == incident_status)
        if severity:
            query = query.filter(Incident.severity == severity)
        return query.order_by(Incident.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def get_incident_by_id(db: Session, incident_id: int) -> Incident:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")
        return incident

    @staticmethod
    def create_incident(db: Session, incident_in: IncidentCreate, current_user: Optional[User] = None) -> Incident:
        incident = Incident(
            title=incident_in.title,
            description=incident_in.description,
            severity=incident_in.severity.value if hasattr(incident_in.severity, 'value') else incident_in.severity,
            status=IncidentStatus.OPEN.value,
            target_user=incident_in.target_user,
            source_ip=incident_in.source_ip,
            assigned_to_id=incident_in.assigned_to_id,
            mitigation_actions=incident_in.mitigation_actions,
        )
        db.add(incident)
        db.commit()
        db.refresh(incident)
        return incident

    @staticmethod
    def assign_incident(
        db: Session,
        incident_id: int,
        analyst_id: int,
        current_user: User,
    ) -> Incident:
        """Assign incident to an analyst or admin with authorization checks."""
        incident = IncidentService.get_incident_by_id(db, incident_id)

        target_analyst = db.query(User).filter(User.id == analyst_id).first()
        if not target_analyst:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target analyst not found.")

        analyst_role = target_analyst.role.value if hasattr(target_analyst.role, 'value') else target_analyst.role
        if analyst_role not in [UserRole.SECURITY_ANALYST.value, UserRole.ADMIN.value]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incidents can only be assigned to users with Security Analyst or Admin roles.",
            )

        incident.assigned_to_id = analyst_id
        if incident.status == IncidentStatus.OPEN.value:
            incident.status = IncidentStatus.INVESTIGATING.value

        log = SecurityLog(
            event_type=EventType.INCIDENT_STATUS_CHANGE.value,
            username=current_user.username,
            user_id=current_user.id,
            ip_address="127.0.0.1",
            status_code=200,
            details=f"Incident #{incident.id} assigned to '{target_analyst.username}' by '{current_user.username}'. Status: {incident.status}.",
        )
        db.add(log)
        db.commit()
        db.refresh(incident)
        return incident

    @staticmethod
    def update_incident(
        db: Session,
        incident_id: int,
        incident_in: IncidentUpdate,
        current_user: User,
    ) -> Incident:
        incident = IncidentService.get_incident_by_id(db, incident_id)
        update_data = incident_in.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if field in ("severity", "status") and hasattr(value, "value"):
                value = value.value
            setattr(incident, field, value)

        log = SecurityLog(
            event_type=EventType.INCIDENT_STATUS_CHANGE.value,
            username=current_user.username,
            user_id=current_user.id,
            ip_address="127.0.0.1",
            status_code=200,
            details=f"Incident #{incident.id} updated by '{current_user.username}'. Status: {incident.status}, Severity: {incident.severity}.",
        )
        db.add(log)
        db.commit()
        db.refresh(incident)
        return incident

    @staticmethod
    def resolve_incident(
        db: Session,
        incident_id: int,
        resolve_in: IncidentResolveRequest,
        current_user: User,
    ) -> Incident:
        """Resolve an incident, record mitigation notes, resolver, and timestamp."""
        incident = IncidentService.get_incident_by_id(db, incident_id)

        now = datetime.utcnow()
        incident.status = IncidentStatus.RESOLVED.value
        incident.resolution_notes = resolve_in.resolution_notes
        if resolve_in.mitigation_actions:
            incident.mitigation_actions = (incident.mitigation_actions or "") + f"\n[Resolution Action]: {resolve_in.mitigation_actions}"
        incident.resolved_at = now
        incident.resolved_by_id = current_user.id

        log = SecurityLog(
            event_type=EventType.INCIDENT_STATUS_CHANGE.value,
            username=current_user.username,
            user_id=current_user.id,
            ip_address="127.0.0.1",
            status_code=200,
            details=f"Incident #{incident.id} marked as RESOLVED by '{current_user.username}'. Notes: {resolve_in.resolution_notes}",
        )
        db.add(log)
        db.commit()
        db.refresh(incident)
        return incident
