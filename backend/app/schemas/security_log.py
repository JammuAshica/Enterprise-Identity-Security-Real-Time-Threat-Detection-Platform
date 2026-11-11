from typing import Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class SecurityLogCreate(BaseModel):
    event_type: str
    username: Optional[str] = None
    user_id: Optional[int] = None
    ip_address: str
    city: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    user_agent: Optional[str] = None
    endpoint: Optional[str] = None
    http_method: Optional[str] = None
    status_code: Optional[int] = None
    details: Optional[str] = None


class SecurityLogResponse(BaseModel):
    id: int
    timestamp: datetime
    event_type: str
    username: Optional[str] = None
    user_id: Optional[int] = None
    ip_address: str
    city: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    user_agent: Optional[str] = None
    endpoint: Optional[str] = None
    http_method: Optional[str] = None
    status_code: Optional[int] = None
    details: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class SecurityLogFilter(BaseModel):
    event_type: Optional[str] = None
    username: Optional[str] = None
    ip_address: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit: int = Field(default=50, ge=1, le=500)
    offset: int = Field(default=0, ge=0)
