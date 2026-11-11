import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class AlertSeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class SecurityAlert(Base):
    __tablename__ = "security_alerts"

    id = Column(Integer, primary_key=True, index=True)
    rule_name = Column(String(100), index=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(20), index=True, nullable=False, default=AlertSeverity.MEDIUM.value)
    target_username = Column(String(50), nullable=True, index=True)
    source_ip = Column(String(45), nullable=True, index=True)
    metadata_json = Column(Text, nullable=True)
    is_acknowledged = Column(Boolean, default=False, nullable=False)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)

    incident = relationship("Incident", back_populates="alerts")
