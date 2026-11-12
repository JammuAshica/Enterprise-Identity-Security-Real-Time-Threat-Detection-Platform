import math
import json
import asyncio
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Set
from fastapi import WebSocket
from sqlalchemy.orm import Session

from app.config import settings
from app.models.security_log import SecurityLog, EventType
from app.models.alert import SecurityAlert, AlertSeverity
from app.models.incident import Incident, IncidentStatus, IncidentSeverity
from app.models.user import User


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two GPS coordinates in kilometers."""
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


class ThreatDetectionEngine:
    """
    Asynchronous Real-Time Threat Detection & Correlation Engine.
    Evaluates streaming authentication logs against detection rules,
    generates severity-classified alerts, triggers automated incident responses,
    and broadcasts events over WebSockets.
    """

    def __init__(self):
        self.active_websockets: Set[WebSocket] = set()

    async def register_websocket(self, websocket: WebSocket):
        await websocket.accept()
        self.active_websockets.add(websocket)

    def unregister_websocket(self, websocket: WebSocket):
        self.active_websockets.discard(websocket)

    async def broadcast_event(self, event_data: Dict[str, Any]):
        """Broadcast live security events or alerts to connected frontend clients."""
        dead_sockets = set()
        for ws in self.active_websockets:
            try:
                await ws.send_json(event_data)
            except Exception:
                dead_sockets.add(ws)
        for dead in dead_sockets:
            self.active_websockets.discard(dead)

    def process_security_event_sync(self, db: Session, log_id: int) -> List[SecurityAlert]:
        """
        Synchronous / celery-ready rule evaluation for a specific security log.
        Can be invoked directly or queued.
        """
        log = db.query(SecurityLog).filter(SecurityLog.id == log_id).first()
        if not log:
            return []

        generated_alerts: List[SecurityAlert] = []

        # 1. Brute-Force Login Detection Rule
        if log.event_type == EventType.LOGIN_FAILURE.value:
            bf_alert = self._evaluate_brute_force(db, log)
            if bf_alert:
                generated_alerts.append(bf_alert)

        # 2. Impossible Travel Anomaly Detection Rule
        if log.event_type in (EventType.LOGIN_SUCCESS.value, EventType.LOGIN_FAILURE.value):
            if log.latitude is not None and log.longitude is not None and log.username:
                it_alert = self._evaluate_impossible_travel(db, log)
                if it_alert:
                    generated_alerts.append(it_alert)

        # 3. Privilege Escalation & Authorization Tampering Rule
        if log.event_type == EventType.PRIVILEGE_ACCESS_DENIED.value:
            pe_alert = self._evaluate_privilege_escalation(db, log)
            if pe_alert:
                generated_alerts.append(pe_alert)

        # 4. Account Lockout Alert
        if log.event_type == EventType.ACCOUNT_LOCKED.value:
            lock_alert = self._evaluate_account_lockout_event(db, log)
            if lock_alert:
                generated_alerts.append(lock_alert)

        return generated_alerts

    def _evaluate_brute_force(self, db: Session, current_log: SecurityLog) -> Optional[SecurityAlert]:
        """
        Detects brute-force attacks within a sliding time window.
        Checks both targeted username attacks and distributed attacks from a single IP.
        """
        window_start = current_log.timestamp - timedelta(minutes=settings.BRUTE_FORCE_WINDOW_MINUTES)

        # Check failures for target username
        user_failures = 0
        if current_log.username:
            user_failures = db.query(SecurityLog).filter(
                SecurityLog.event_type == EventType.LOGIN_FAILURE.value,
                SecurityLog.username == current_log.username,
                SecurityLog.timestamp >= window_start,
            ).count()

        # Check failures from source IP
        ip_failures = db.query(SecurityLog).filter(
            SecurityLog.event_type == EventType.LOGIN_FAILURE.value,
            SecurityLog.ip_address == current_log.ip_address,
            SecurityLog.timestamp >= window_start,
        ).count()

        threshold = settings.BRUTE_FORCE_THRESHOLD

        if user_failures >= threshold or ip_failures >= threshold:
            # Check if alert already created within this window to prevent alert storm
            existing_alert = db.query(SecurityAlert).filter(
                SecurityAlert.rule_name == "BRUTE_FORCE_ATTACK",
                (SecurityAlert.target_username == current_log.username) | (SecurityAlert.source_ip == current_log.ip_address),
                SecurityAlert.created_at >= window_start,
            ).first()

            if existing_alert:
                return None

            severity = AlertSeverity.CRITICAL.value if (user_failures >= 10 or ip_failures >= 10) else AlertSeverity.HIGH.value
            title = f"Brute-Force Attack Detected: {current_log.username or current_log.ip_address}"
            desc = (
                f"Detected {max(user_failures, ip_failures)} failed login attempts within "
                f"{settings.BRUTE_FORCE_WINDOW_MINUTES} minutes. "
                f"Source IP: {current_log.ip_address}. Target User: {current_log.username or 'Multiple'}."
            )

            # Automated Incident Response: Auto-create incident
            incident = Incident(
                title=f"Incident: Brute-Force Login Campaign ({current_log.username or current_log.ip_address})",
                description=desc,
                severity=IncidentSeverity.HIGH.value if severity == AlertSeverity.HIGH.value else IncidentSeverity.CRITICAL.value,
                status=IncidentStatus.OPEN.value,
                target_user=current_log.username,
                source_ip=current_log.ip_address,
                mitigation_actions="Automatic IP rate-limiting flagged. User account lockout recommended or initiated.",
            )
            db.add(incident)
            db.flush()

            # Automated Account Suspension if target user exists and not yet locked
            if current_log.username:
                target_user = db.query(User).filter(User.username == current_log.username).first()
                if target_user and not target_user.is_locked:
                    target_user.is_locked = True
                    target_user.lockout_until = datetime.utcnow() + timedelta(minutes=settings.ACCOUNT_LOCKOUT_DURATION_MINUTES)
                    incident.mitigation_actions += f" Automated temporary suspension applied to user '{current_log.username}'."

            alert = SecurityAlert(
                rule_name="BRUTE_FORCE_ATTACK",
                title=title,
                description=desc,
                severity=severity,
                target_username=current_log.username,
                source_ip=current_log.ip_address,
                metadata_json=json.dumps({
                    "user_failures": user_failures,
                    "ip_failures": ip_failures,
                    "window_minutes": settings.BRUTE_FORCE_WINDOW_MINUTES,
                }),
                incident_id=incident.id,
            )
            db.add(alert)
            db.commit()
            db.refresh(alert)
            return alert

        return None

    def _evaluate_impossible_travel(self, db: Session, current_log: SecurityLog) -> Optional[SecurityAlert]:
        """
        Detects geographically anomalous consecutive logins indicating impossible physical travel.
        Calculates velocity (km/h) between consecutive events.
        """
        # Look for previous geolocated event for this user within the last 12 hours
        twelve_hours_ago = current_log.timestamp - timedelta(hours=12)
        prev_log = db.query(SecurityLog).filter(
            SecurityLog.username == current_log.username,
            SecurityLog.id != current_log.id,
            SecurityLog.latitude.isnot(None),
            SecurityLog.longitude.isnot(None),
            SecurityLog.timestamp >= twelve_hours_ago,
            SecurityLog.timestamp < current_log.timestamp,
        ).order_by(SecurityLog.timestamp.desc()).first()

        if not prev_log or prev_log.latitude is None or prev_log.longitude is None:
            return None

        distance_km = haversine_distance_km(
            prev_log.latitude,
            prev_log.longitude,
            current_log.latitude,
            current_log.longitude,
        )

        # Ignore tiny displacements (< 20 km)
        if distance_km < 20.0:
            return None

        time_delta_hours = (current_log.timestamp - prev_log.timestamp).total_seconds() / 3600.0
        if time_delta_hours <= 0:
            time_delta_hours = 0.001  # Prevent divide by zero

        speed_kmh = distance_km / time_delta_hours

        if speed_kmh > settings.IMPOSSIBLE_TRAVEL_SPEED_KMH:
            # Check duplicate alert in last 1 hour
            recent_alert = db.query(SecurityAlert).filter(
                SecurityAlert.rule_name == "IMPOSSIBLE_TRAVEL",
                SecurityAlert.target_username == current_log.username,
                SecurityAlert.created_at >= current_log.timestamp - timedelta(hours=1),
            ).first()

            if recent_alert:
                return None

            title = f"Impossible Travel Anomaly: {current_log.username}"
            desc = (
                f"User '{current_log.username}' authenticated from two distant locations within {time_delta_hours:.1f} hour(s). "
                f"From {prev_log.city or 'Unknown'}, {prev_log.country or ''} ({prev_log.ip_address}) "
                f"to {current_log.city or 'Unknown'}, {current_log.country or ''} ({current_log.ip_address}). "
                f"Distance: {distance_km:.0f} km. Required travel speed: {speed_kmh:.0f} km/h (threshold: {settings.IMPOSSIBLE_TRAVEL_SPEED_KMH} km/h)."
            )

            # Auto create incident for SOC triage
            incident = Incident(
                title=f"Incident: Impossible Travel Detected for {current_log.username}",
                description=desc,
                severity=IncidentSeverity.HIGH.value,
                status=IncidentStatus.OPEN.value,
                target_user=current_log.username,
                source_ip=current_log.ip_address,
                mitigation_actions="Session flagged for inspection. Forced password reset / MFA re-verification recommended.",
            )
            db.add(incident)
            db.flush()

            alert = SecurityAlert(
                rule_name="IMPOSSIBLE_TRAVEL",
                title=title,
                description=desc,
                severity=AlertSeverity.HIGH.value,
                target_username=current_log.username,
                source_ip=current_log.ip_address,
                metadata_json=json.dumps({
                    "distance_km": round(distance_km, 2),
                    "time_delta_hours": round(time_delta_hours, 2),
                    "speed_kmh": round(speed_kmh, 2),
                    "from_location": f"{prev_log.city}, {prev_log.country}",
                    "to_location": f"{current_log.city}, {current_log.country}",
                }),
                incident_id=incident.id,
            )
            db.add(alert)
            db.commit()
            db.refresh(alert)
            return alert

        return None

    def _evaluate_privilege_escalation(self, db: Session, current_log: SecurityLog) -> Optional[SecurityAlert]:
        """
        Detects repeated unauthorized privilege escalation attempts across elevated endpoints.
        """
        ten_minutes_ago = current_log.timestamp - timedelta(minutes=10)
        denied_count = db.query(SecurityLog).filter(
            SecurityLog.event_type == EventType.PRIVILEGE_ACCESS_DENIED.value,
            SecurityLog.username == current_log.username,
            SecurityLog.timestamp >= ten_minutes_ago,
        ).count()

        if denied_count >= settings.PRIVILEGE_ESCALATION_THRESHOLD:
            # Check existing alert
            existing = db.query(SecurityAlert).filter(
                SecurityAlert.rule_name == "PRIVILEGE_ESCALATION_ATTEMPT",
                SecurityAlert.target_username == current_log.username,
                SecurityAlert.created_at >= ten_minutes_ago,
            ).first()

            if existing:
                return None

            title = f"Privilege Escalation Attempt: {current_log.username}"
            desc = (
                f"User '{current_log.username}' triggered {denied_count} unauthorized privilege denial events "
                f"in 10 minutes. Endpoint: {current_log.endpoint}. IP: {current_log.ip_address}."
            )

            # Auto incident
            incident = Incident(
                title=f"Incident: Unauthorized Privilege Probing by {current_log.username}",
                description=desc,
                severity=IncidentSeverity.CRITICAL.value,
                status=IncidentStatus.OPEN.value,
                target_user=current_log.username,
                source_ip=current_log.ip_address,
                mitigation_actions="Account role privileges audited. Analyst investigation assigned.",
            )
            db.add(incident)
            db.flush()

            alert = SecurityAlert(
                rule_name="PRIVILEGE_ESCALATION_ATTEMPT",
                title=title,
                description=desc,
                severity=AlertSeverity.CRITICAL.value,
                target_username=current_log.username,
                source_ip=current_log.ip_address,
                metadata_json=json.dumps({
                    "denied_count": denied_count,
                    "target_endpoint": current_log.endpoint,
                }),
                incident_id=incident.id,
            )
            db.add(alert)
            db.commit()
            db.refresh(alert)
            return alert

        return None

    def _evaluate_account_lockout_event(self, db: Session, current_log: SecurityLog) -> Optional[SecurityAlert]:
        """Generate high severity alert when an account is locked out."""
        alert = SecurityAlert(
            rule_name="ACCOUNT_LOCKOUT_TRIGGERED",
            title=f"Security Lockout: Account '{current_log.username}' Locked",
            description=f"Account locked following repeated failed logins. Source IP: {current_log.ip_address}.",
            severity=AlertSeverity.HIGH.value,
            target_username=current_log.username,
            source_ip=current_log.ip_address,
            metadata_json=json.dumps({"ip": current_log.ip_address}),
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)
        return alert


# Global singleton instance of Threat Engine
threat_engine = ThreatDetectionEngine()
