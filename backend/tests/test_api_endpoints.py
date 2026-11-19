import pytest
from pydantic import ValidationError
from app.models.alert import SecurityAlert
from app.models.user import User
from app.config import Settings, settings
from app.core.security import hash_password, verify_password


def test_demo_account_passwords_must_be_unique():
    with pytest.raises(ValidationError, match="Each demo account must have a different password"):
        Settings(
            DATABASE_URL="postgresql://test:test@localhost/security_platform",
            DEMO_ADMIN_PASSWORD="unique-admin-password",
            DEMO_ANALYST_PASSWORD="unique-analyst-password",
            DEMO_EMPLOYEE_PASSWORD="unique-employee-password",
            DEMO_SARAH_PASSWORD="unique-admin-password",
        )


def test_root_and_health(client):
    r1 = client.get("/")
    assert r1.status_code == 200
    assert r1.json()["status"] == "online"

    r2 = client.get("/health")
    assert r2.status_code == 200
    assert r2.json()["status"] == "healthy"


def test_employee_endpoints(client, employee_headers):
    # Profile
    p_res = client.get("/api/v1/employees/profile", headers=employee_headers)
    assert p_res.status_code == 200
    assert p_res.json()["username"] == "test_employee"

    # Directory
    d_res = client.get("/api/v1/employees/directory", headers=employee_headers)
    assert d_res.status_code == 200
    assert len(d_res.json()) >= 3

    # Access request
    req_payload = {
        "resource_name": "Production Kubernetes Cluster",
        "justification": "Incident hotfix deployment",
        "duration_hours": 4,
    }
    req_res = client.post("/api/v1/employees/access-request", json=req_payload, headers=employee_headers)
    assert req_res.status_code == 200
    assert req_res.json()["status"] == "PENDING_SECURITY_APPROVAL"

    # My activity
    act_res = client.get("/api/v1/employees/my-activity", headers=employee_headers)
    assert act_res.status_code == 200


def test_security_events_stats_and_logs(client, analyst_headers):
    # Stats
    stats_res = client.get("/api/v1/security-events/stats", headers=analyst_headers)
    assert stats_res.status_code == 200
    data = stats_res.json()
    assert "total_events" in data
    assert "alerts" in data
    assert "incidents" in data

    # Audit logs
    logs_res = client.get("/api/v1/security-events/?limit=10", headers=analyst_headers)
    assert logs_res.status_code == 200


def test_alerts_acknowledge(client, analyst_headers, db_session):
    alert = SecurityAlert(
        rule_name="TEST_RULE",
        title="Test Alert Title",
        description="Test alert description",
        severity="MEDIUM",
        target_username="test_user",
        source_ip="1.2.3.4",
        is_acknowledged=False,
    )
    db_session.add(alert)
    db_session.commit()
    db_session.refresh(alert)

    # Acknowledge
    ack_res = client.post(
        f"/api/v1/alerts/{alert.id}/acknowledge",
        json={"is_acknowledged": True},
        headers=analyst_headers,
    )
    assert ack_res.status_code == 200
    assert ack_res.json()["is_acknowledged"] is True


def test_synthetic_simulator_endpoints(client, db_session):
    # Seed
    seed_res = client.post("/api/v1/simulator/seed")
    assert seed_res.status_code == 200

    admin = db_session.query(User).filter(User.username == "admin").first()
    assert admin is not None
    assert verify_password(settings.DEMO_ADMIN_PASSWORD, admin.hashed_password)

    demo_accounts = [
        ("admin", settings.DEMO_ADMIN_PASSWORD),
        ("analyst_jane", settings.DEMO_ANALYST_PASSWORD),
        ("john_doe", settings.DEMO_EMPLOYEE_PASSWORD),
        ("sarah_connor", settings.DEMO_SARAH_PASSWORD),
    ]
    assert len({password for _, password in demo_accounts}) == len(demo_accounts)
    for username, password in demo_accounts:
        user = db_session.query(User).filter(User.username == username).first()
        assert user is not None
        assert verify_password(password, user.hashed_password)

    admin.hashed_password = hash_password("outdated-demo-password")
    db_session.commit()
    client.post("/api/v1/simulator/seed")
    db_session.refresh(admin)
    assert verify_password(settings.DEMO_ADMIN_PASSWORD, admin.hashed_password)

    # Brute force
    bf_res = client.post("/api/v1/simulator/attack/brute-force?target_username=test_employee&attempts=5")
    assert bf_res.status_code == 200
    assert bf_res.json()["scenario"] == "Brute Force Attack"

    # Impossible travel
    it_res = client.post("/api/v1/simulator/attack/impossible-travel?username=test_employee")
    assert it_res.status_code == 200
    assert it_res.json()["scenario"] == "Impossible Travel Anomaly"

    # Benign telemetry
    ben_res = client.post("/api/v1/simulator/traffic/benign")
    assert ben_res.status_code == 200
