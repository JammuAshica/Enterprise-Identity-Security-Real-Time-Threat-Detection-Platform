import pytest
from app.models.security_log import SecurityLog, EventType


def test_admin_access_allowed(client, admin_headers):
    # Admin accesses user listing
    res = client.get("/api/v1/users/", headers=admin_headers)
    assert res.status_code == 200
    assert len(res.json()) >= 3


def test_employee_forbidden_from_admin_route(client, employee_headers, db_session):
    # Employee attempts to access user creation
    new_user = {
        "username": "attacker_user",
        "email": "attacker@evil.com",
        "full_name": "Attacker",
        "department": "Engineering",
        "role": "admin",
        "password": "Password@123",
    }
    res = client.post("/api/v1/users/", json=new_user, headers=employee_headers)
    assert res.status_code == 403
    assert "Insufficient permissions" in res.json()["detail"]

    # Verify that unauthorized attempt was logged in security_logs
    log = db_session.query(SecurityLog).filter(
        SecurityLog.event_type == EventType.PRIVILEGE_ACCESS_DENIED.value,
        SecurityLog.username == "test_employee",
    ).first()
    assert log is not None
    assert log.status_code == 403


def test_security_analyst_access_to_incidents(client, analyst_headers):
    res = client.get("/api/v1/incidents/", headers=analyst_headers)
    assert res.status_code == 200


def test_employee_forbidden_from_incidents(client, employee_headers):
    res = client.get("/api/v1/incidents/", headers=employee_headers)
    assert res.status_code == 403
    assert "Insufficient permissions" in res.json()["detail"]


def test_admin_can_provision_new_user(client, admin_headers):
    user_payload = {
        "username": "new_dev",
        "email": "dev@company.com",
        "full_name": "New Developer",
        "department": "Engineering",
        "role": "employee",
        "password": "SecurePassword@2026",
    }
    res = client.post("/api/v1/users/", json=user_payload, headers=admin_headers)
    assert res.status_code == 201
    assert res.json()["username"] == "new_dev"
