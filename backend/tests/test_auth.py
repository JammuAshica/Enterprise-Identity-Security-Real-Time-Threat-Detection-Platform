import pytest
from app.models.user import User
from app.models.session import UserSession
from app.core.security import verify_password, hash_password


def test_login_success(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "test_admin", "password": "Password@123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "test_admin"
    assert data["user"]["role"] == "admin"


def test_login_invalid_password(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "test_admin", "password": "WrongPassword!"},
    )
    assert response.status_code == 401
    assert "Invalid credentials" in response.json()["detail"]


def test_login_nonexistent_user(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "unknown_ghost", "password": "SomePassword123!"},
    )
    assert response.status_code == 401
    assert "Invalid username or password" in response.json()["detail"]


def test_refresh_token_flow(client):
    # First login
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": "test_employee", "password": "Password@123"},
    )
    assert login_res.status_code == 200
    refresh_token = login_res.json()["refresh_token"]

    # Refresh
    refresh_res = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_res.status_code == 200
    new_data = refresh_res.json()
    assert "access_token" in new_data
    assert new_data["user"]["username"] == "test_employee"


def test_logout_revokes_token(client, employee_headers, db_session):
    # Check /me is accessible
    me_res = client.get("/api/v1/auth/me", headers=employee_headers)
    assert me_res.status_code == 200

    # Logout
    logout_res = client.post("/api/v1/auth/logout", headers=employee_headers)
    assert logout_res.status_code == 200

    # Try accessing /me again with same token -> should be 401 revoked
    me_after = client.get("/api/v1/auth/me", headers=employee_headers)
    assert me_after.status_code == 401
    assert "revoked" in me_after.json()["detail"]


def test_session_listing_and_revocation(client, employee_headers, db_session):
    # List sessions
    sessions_res = client.get("/api/v1/auth/sessions", headers=employee_headers)
    assert sessions_res.status_code == 200
    sessions = sessions_res.json()
    assert len(sessions) >= 1

    session_id = sessions[0]["id"]
    # Revoke specific session
    del_res = client.delete(f"/api/v1/auth/sessions/{session_id}", headers=employee_headers)
    assert del_res.status_code == 200

    # Verify session is marked revoked in DB
    s = db_session.query(UserSession).filter(UserSession.id == session_id).first()
    assert s.is_revoked is True


def test_password_hash_and_verify():
    pw = "SuperSecure@999"
    hashed = hash_password(pw)
    assert verify_password(pw, hashed) is True
    assert verify_password("WrongOne", hashed) is False
