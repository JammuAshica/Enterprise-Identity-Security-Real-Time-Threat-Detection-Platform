import json
from datetime import datetime, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.models.security_log import SecurityLog, EventType
from app.models.alert import SecurityAlert, AlertSeverity
from app.models.incident import Incident, IncidentStatus, IncidentSeverity
from app.core.security import hash_password
from app.services.threat_engine import threat_engine


class SyntheticSecuritySimulator:
    """
    Synthetic Security Event Generator and Attack Simulator.
    Simulates real-world cyber attack scenarios and baseline traffic
    for automated testing and demonstration.
    """

    @staticmethod
    def seed_initial_demo_database(db: Session) -> Dict[str, Any]:
        """Initialize database with default enterprise users and baseline telemetry."""
        # 1. Create Default Users
        users_to_create = [
            {
                "username": "admin",
                "email": "admin@enterprise.sec",
                "full_name": "Chief Security Officer",
                "department": "Security Operations & IT",
                "role": UserRole.ADMIN,
                "password": "Admin@Enterprise2026!",
            },
            {
                "username": "analyst_jane",
                "email": "jane.analyst@enterprise.sec",
                "full_name": "Jane Chen (Lead SOC Analyst)",
                "department": "Security Operations Center",
                "role": UserRole.SECURITY_ANALYST,
                "password": "Analyst@Enterprise2026!",
            },
            {
                "username": "john_doe",
                "email": "john.doe@enterprise.sec",
                "full_name": "John Doe",
                "department": "Software Engineering",
                "role": UserRole.EMPLOYEE,
                "password": "Employee@Enterprise2026!",
            },
            {
                "username": "sarah_connor",
                "email": "sarah.connor@enterprise.sec",
                "full_name": "Sarah Connor",
                "department": "Infrastructure & Cloud",
                "role": UserRole.EMPLOYEE,
                "password": "Employee@Enterprise2026!",
            },
        ]

        created_users = []
        for u_data in users_to_create:
            existing = db.query(User).filter(User.username == u_data["username"]).first()
            if not existing:
                user = User(
                    username=u_data["username"],
                    email=u_data["email"],
                    full_name=u_data["full_name"],
                    department=u_data["department"],
                    role=u_data["role"],
                    hashed_password=hash_password(u_data["password"]),
                    is_active=True,
                    is_locked=False,
                )
                db.add(user)
                created_users.append(u_data["username"])
        db.commit()

        # 2. Seed Baseline Normal Logs if empty
        log_count = db.query(SecurityLog).count()
        if log_count < 5:
            now = datetime.utcnow()
            baseline_events = [
                SecurityLog(
                    timestamp=now - timedelta(hours=5),
                    event_type=EventType.LOGIN_SUCCESS.value,
                    username="admin",
                    ip_address="192.168.1.10",
                    city="San Francisco",
                    country="United States",
                    latitude=37.7749,
                    longitude=-122.4194,
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0",
                    status_code=200,
                    details="Admin console login from corporate VPN.",
                ),
                SecurityLog(
                    timestamp=now - timedelta(hours=4),
                    event_type=EventType.LOGIN_SUCCESS.value,
                    username="analyst_jane",
                    ip_address="192.168.1.25",
                    city="San Francisco",
                    country="United States",
                    latitude=37.7749,
                    longitude=-122.4194,
                    user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
                    status_code=200,
                    details="SOC Analyst shift startup session.",
                ),
                SecurityLog(
                    timestamp=now - timedelta(hours=3),
                    event_type=EventType.LOGIN_SUCCESS.value,
                    username="john_doe",
                    ip_address="10.0.5.42",
                    city="Austin",
                    country="United States",
                    latitude=30.2672,
                    longitude=-97.7431,
                    user_agent="Mozilla/5.0 (X11; Linux x86_64)",
                    status_code=200,
                    details="Developer workspace workstation login.",
                ),
            ]
            db.add_all(baseline_events)
            db.commit()

        return {"message": "Demo database successfully initialized.", "created_users": created_users}

    @staticmethod
    def simulate_brute_force_attack(db: Session, target_username: str = "john_doe", attempts: int = 6) -> Dict[str, Any]:
        """
        Simulate an active credential stuffing / brute-force attack from a malicious external IP.
        """
        attacker_ip = "198.51.100.44"
        now = datetime.utcnow()
        logs_created = []

        for i in range(attempts):
            t = now - timedelta(seconds=(attempts - i) * 10)
            log = SecurityLog(
                timestamp=t,
                event_type=EventType.LOGIN_FAILURE.value,
                username=target_username,
                ip_address=attacker_ip,
                city="Moscow",
                country="Russian Federation",
                latitude=55.7558,
                longitude=37.6173,
                user_agent="Python-requests/2.31.0 (Automated Attacker Tool)",
                status_code=401,
                details=f"Automated credential brute-force probe #{i+1} against user '{target_username}'.",
            )
            db.add(log)
            db.commit()
            db.refresh(log)
            logs_created.append(log.id)

            # Process through threat engine
            threat_engine.process_security_event_sync(db, log.id)

        return {
            "scenario": "Brute Force Attack",
            "target": target_username,
            "attacker_ip": attacker_ip,
            "attempts": attempts,
            "logs_created": len(logs_created),
            "status": "Attack simulated; brute-force rule evaluated, alert and incident generated.",
        }

    @staticmethod
    def simulate_impossible_travel(db: Session, username: str = "sarah_connor") -> Dict[str, Any]:
        """
        Simulate Impossible Travel: User authenticates from London and then Tokyo 20 minutes later.
        Distance ~9,560 km in 0.33 hours => Speed ~28,600 km/h (Physically impossible).
        """
        now = datetime.utcnow()
        # Event 1: London, UK
        log1 = SecurityLog(
            timestamp=now - timedelta(minutes=20),
            event_type=EventType.LOGIN_SUCCESS.value,
            username=username,
            ip_address="82.165.197.1",
            city="London",
            country="United Kingdom",
            latitude=51.5074,
            longitude=-0.1278,
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)",
            status_code=200,
            details="Mobile app authentication in London HQ.",
        )
        db.add(log1)
        db.commit()
        db.refresh(log1)
        threat_engine.process_security_event_sync(db, log1.id)

        # Event 2: Tokyo, Japan (20 mins later)
        log2 = SecurityLog(
            timestamp=now,
            event_type=EventType.LOGIN_SUCCESS.value,
            username=username,
            ip_address="133.242.18.5",
            city="Tokyo",
            country="Japan",
            latitude=35.6762,
            longitude=139.6503,
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0",
            status_code=200,
            details="Web portal login attempt from Tokyo IP.",
        )
        db.add(log2)
        db.commit()
        db.refresh(log2)
        alerts = threat_engine.process_security_event_sync(db, log2.id)

        return {
            "scenario": "Impossible Travel Anomaly",
            "username": username,
            "origin": "London, UK (51.5074, -0.1278)",
            "destination": "Tokyo, Japan (35.6762, 139.6503)",
            "time_delta": "20 minutes",
            "alerts_triggered": len(alerts),
            "status": "Impossible travel evaluated and incident created.",
        }

    @staticmethod
    def simulate_privilege_escalation(db: Session, username: str = "john_doe") -> Dict[str, Any]:
        """
        Simulate unauthorized privilege escalation probing by a regular employee against restricted endpoints.
        """
        endpoints = [
            "/api/v1/users/admin/export-all",
            "/api/v1/security-events/delete-logs",
            "/api/v1/system/privilege-override",
            "/api/v1/admin/sudo",
        ]
        now = datetime.utcnow()
        attacker_ip = "10.0.88.19"
        alerts = []

        for i, ep in enumerate(endpoints):
            log = SecurityLog(
                timestamp=now - timedelta(minutes=(len(endpoints) - i) * 2),
                event_type=EventType.PRIVILEGE_ACCESS_DENIED.value,
                username=username,
                ip_address=attacker_ip,
                user_agent="Mozilla/5.0 (X11; Linux x86_64; curl/8.4.0)",
                endpoint=ep,
                http_method="POST",
                status_code=403,
                details=f"Unauthorized access denied. Role 'employee' lacks permission for endpoint '{ep}'.",
            )
            db.add(log)
            db.commit()
            db.refresh(log)
            new_alerts = threat_engine.process_security_event_sync(db, log.id)
            alerts.extend(new_alerts)

        return {
            "scenario": "Privilege Escalation Attempt",
            "username": username,
            "endpoints_probed": endpoints,
            "alerts_triggered": len(alerts),
            "status": "Repeated unauthorized access attempts recorded and escalated to Critical incident.",
        }

    @staticmethod
    def simulate_benign_traffic(db: Session) -> Dict[str, Any]:
        """Simulate realistic routine enterprise operations."""
        now = datetime.utcnow()
        samples = [
            ("john_doe", "10.0.5.42", "Austin", "United States", 30.2672, -97.7431, EventType.LOGIN_SUCCESS.value, "Normal developer sign-in"),
            ("sarah_connor", "192.168.1.55", "San Francisco", "United States", 37.7749, -122.4194, EventType.TOKEN_REFRESH.value, "Automated token renewal"),
            ("analyst_jane", "192.168.1.25", "San Francisco", "United States", 37.7749, -122.4194, EventType.LOGIN_SUCCESS.value, "Analyst session refresh"),
        ]

        created = 0
        for user, ip, city, country, lat, lon, ev_type, det in samples:
            log = SecurityLog(
                timestamp=now - timedelta(minutes=5 * created),
                event_type=ev_type,
                username=user,
                ip_address=ip,
                city=city,
                country=country,
                latitude=lat,
                longitude=lon,
                status_code=200,
                details=det,
            )
            db.add(log)
            created += 1
        db.commit()

        return {"scenario": "Benign Telemetry", "events_recorded": created}
