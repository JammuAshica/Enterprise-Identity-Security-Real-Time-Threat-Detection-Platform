from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.models.incident import IncidentSeverity, IncidentStatus


class IncidentCreate(BaseModel):
    title: str = Field(..., max_length=255)
    description: str
    severity: IncidentSeverity = IncidentSeverity.MEDIUM
    target_user: Optional[str] = None
    source_ip: Optional[str] = None
    assigned_to_id: Optional[int] = None
    mitigation_actions: Optional[str] = None


class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[IncidentSeverity] = None
    status: Optional[IncidentStatus] = None
    assigned_to_id: Optional[int] = None
    mitigation_actions: Optional[str] = None
    resolution_notes: Optional[str] = None


class IncidentAssignRequest(BaseModel):
    assigned_to_id: int


class IncidentResolveRequest(BaseModel):
    resolution_notes: str
    mitigation_actions: Optional[str] = None


class IncidentResponse(BaseModel):
    id: int
    title: str
    description: str
    severity: str
    status: str
    target_user: Optional[str] = None
    source_ip: Optional[str] = None
    assigned_to_id: Optional[int] = None
    assigned_to_name: Optional[str] = None
    mitigation_actions: Optional[str] = None
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolved_by_id: Optional[int] = None
    resolved_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    alerts_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)
