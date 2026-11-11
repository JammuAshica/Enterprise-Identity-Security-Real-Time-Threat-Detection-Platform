import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from app.database import Base


class EventType(str, enum.Enum):
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILURE = "login_failure"
    ACCOUNT_LOCKED = "account_locked"
    ACCOUNT_UNLOCKED = "account_unlocked"
    TOKEN_REFRESH = "token_refresh"
    LOGOUT = "logout"
    PRIVILEGE_ACCESS_DENIED = "privilege_access_denied"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    PASSWORD_CHANGE = "password_change"
    INCIDENT_STATUS_CHANGE = "incident_status_change"


class SecurityLog(Base):
    __tablename__ = "security_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)
    event_type = Column(String(50), index=True, nullable=False)
    username = Column(String(50), index=True, nullable=True)
    user_id = Column(Integer, index=True, nullable=True)
    ip_address = Column(String(45), index=True, nullable=False)
    city = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    user_agent = Column(String(255), nullable=True)
    endpoint = Column(String(255), nullable=True)
    http_method = Column(String(10), nullable=True)
    status_code = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
