import pytest
from datetime import datetime, timedelta
from app.services.threat_engine import haversine_distance_km, threat_engine
from app.models.security_log import SecurityLog, EventType
from app.models.alert import SecurityAlert
from app.models.incident import Incident


def test_haversine_distance():
    # New York (40.7128, -74.0060) to London (51.5074, -0.1278) ~5570 km
    dist = haversine_distance_km(40.7128, -74.0060, 51.5074, -0.1278)
    assert 5500 < dist < 5700

    # Same location -> 0 km
    assert haversine_distance_km(10.0, 20.0, 10.0, 20.0) == 0.0


def test_threat_engine_brute_force_detection(db_session):
    now = datetime.utcnow()
    target = "victim_user"
    attacker_ip = "198.51.100.99"

    # Add 5 failed login logs
    for i in range(5):
        log = SecurityLog(
            timestamp=now - timedelta(seconds=(5 - i) * 10),
            event_type=EventType.LOGIN_FAILURE.value,
            username=target,
            ip_address=attacker_ip,
            status_code=401,
            details="Failed password probe.",
        )
        db_session.add(log)
    db_session.commit()

    # Trigger threat engine on latest log
    alerts = threat_engine.process_security_event_sync(db_session, log.id)
    assert len(alerts) >= 1
    assert alerts[0].rule_name == "BRUTE_FORCE_ATTACK"
    assert alerts[0].target_username == target
    assert alerts[0].severity in ["HIGH", "CRITICAL"]

    # Verify incident was automatically created
    incident = db_session.query(Incident).filter(Incident.id == alerts[0].incident_id).first()
    assert incident is not None
    assert incident.target_user == target


def test_threat_engine_impossible_travel_detection(db_session):
    now = datetime.utcnow()
    user = "traveller_user"

    # Log 1: San Francisco at T - 30 minutes
    log1 = SecurityLog(
        timestamp=now - timedelta(minutes=30),
        event_type=EventType.LOGIN_SUCCESS.value,
        username=user,
        ip_address="192.168.1.1",
        city="San Francisco",
        country="United States",
        latitude=37.7749,
        longitude=-122.4194,
        status_code=200,
    )
    db_session.add(log1)
    db_session.commit()

    # Log 2: London at T (30 minutes later, distance ~8600 km => speed ~17200 km/h)
    log2 = SecurityLog(
        timestamp=now,
        event_type=EventType.LOGIN_SUCCESS.value,
        username=user,
        ip_address="82.165.1.1",
        city="London",
        country="United Kingdom",
        latitude=51.5074,
        longitude=-0.1278,
        status_code=200,
    )
    db_session.add(log2)
    db_session.commit()

    alerts = threat_engine.process_security_event_sync(db_session, log2.id)
    assert len(alerts) >= 1
    assert alerts[0].rule_name == "IMPOSSIBLE_TRAVEL"
    assert alerts[0].target_username == user
    assert alerts[0].severity == "HIGH"


def test_threat_engine_privilege_escalation_detection(db_session):
    now = datetime.utcnow()
    user = "sneaky_employee"

    # Add 3 privilege access denied events within 10 minutes
    for i in range(3):
        log = SecurityLog(
            timestamp=now - timedelta(minutes=(3 - i)),
            event_type=EventType.PRIVILEGE_ACCESS_DENIED.value,
            username=user,
            ip_address="10.0.0.50",
            endpoint="/api/v1/users/admin-only",
            http_method="POST",
            status_code=403,
            details="Access denied.",
        )
        db_session.add(log)
    db_session.commit()

    alerts = threat_engine.process_security_event_sync(db_session, log.id)
    assert len(alerts) >= 1
    assert alerts[0].rule_name == "PRIVILEGE_ESCALATION_ATTEMPT"
    assert alerts[0].severity == "CRITICAL"
