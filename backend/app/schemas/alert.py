from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class AlertResponse(BaseModel):
    id: int
    rule_name: str
    title: str
    description: str
    severity: str
    target_username: Optional[str] = None
    source_ip: Optional[str] = None
    metadata_json: Optional[str] = None
    is_acknowledged: bool
    incident_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AlertAcknowledgeRequest(BaseModel):
    is_acknowledged: bool = True
