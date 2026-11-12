import pytest
from app.models.user import User


def test_automatic_lockout_after_max_failed_attempts(client, db_session, admin_headers):
    # Target: test_employee
    username = "test_employee"

    # Send 4 failed login attempts
    for i in range(4):
        res = client.post("/api/v1/auth/login", json={"username": username, "password": "WrongPassword"})
        assert res.status_code == 401

    # Check user is not yet locked
    u = db_session.query(User).filter(User.username == username).first()
    assert u.is_locked is False
    assert u.failed_login_attempts == 4

    # 5th failed attempt -> triggers lockout!
    res_5 = client.post("/api/v1/auth/login", json={"username": username, "password": "WrongPassword"})
    assert res_5.status_code == 403
    assert "locked" in res_5.json()["detail"].lower()

    # User is now locked
    db_session.refresh(u)
    assert u.is_locked is True
    assert u.lockout_until is not None

    # Even with correct password, login is blocked while locked
    res_correct_while_locked = client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": "Password@123"},
    )
    assert res_correct_while_locked.status_code == 403
    assert "locked" in res_correct_while_locked.json()["detail"].lower()

    # Admin unlocks the account
    unlock_res = client.post(f"/api/v1/users/{u.id}/unlock", headers=admin_headers)
    assert unlock_res.status_code == 200
    assert unlock_res.json()["is_locked"] is False

    # Now login with correct password succeeds
    login_success = client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": "Password@123"},
    )
    assert login_success.status_code == 200
    assert login_success.json()["user"]["is_locked"] is False


def test_admin_manual_lock_and_unlock(client, admin_headers, db_session):
    u = db_session.query(User).filter(User.username == "test_employee").first()
    assert u.is_locked is False

    # Admin locks user
    lock_res = client.post(f"/api/v1/users/{u.id}/lock", headers=admin_headers)
    assert lock_res.status_code == 200
    assert lock_res.json()["is_locked"] is True

    # Admin unlocks user
    unlock_res = client.post(f"/api/v1/users/{u.id}/unlock", headers=admin_headers)
    assert unlock_res.status_code == 200
    assert unlock_res.json()["is_locked"] is False
