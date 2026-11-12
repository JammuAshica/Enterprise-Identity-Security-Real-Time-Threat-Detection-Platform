import os
import sys
import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.database import Base, get_db
from app.main import app
from app.models.user import User, UserRole
from app.core.security import hash_password, create_access_token
from app.models.session import UserSession
from datetime import datetime, timedelta

# Test in-memory SQLite database
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session() -> Generator:
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        # Seed test users
        admin_user = User(
            username="test_admin",
            email="admin@test.sec",
            full_name="Test Administrator",
            department="IT Security",
            role=UserRole.ADMIN,
            hashed_password=hash_password("Password@123"),
            is_active=True,
            is_locked=False,
            failed_login_attempts=0,
        )
        analyst_user = User(
            username="test_analyst",
            email="analyst@test.sec",
            full_name="Test Security Analyst",
            department="SOC",
            role=UserRole.SECURITY_ANALYST,
            hashed_password=hash_password("Password@123"),
            is_active=True,
            is_locked=False,
            failed_login_attempts=0,
        )
        employee_user = User(
            username="test_employee",
            email="employee@test.sec",
            full_name="Test Employee",
            department="Engineering",
            role=UserRole.EMPLOYEE,
            hashed_password=hash_password("Password@123"),
            is_active=True,
            is_locked=False,
            failed_login_attempts=0,
        )
        db.add_all([admin_user, analyst_user, employee_user])
        db.commit()

        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session) -> Generator:
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def _get_auth_header_for_user(db_session, username: str) -> dict:
    user = db_session.query(User).filter(User.username == username).first()
    token, jti = create_access_token({"sub": str(user.id), "username": user.username, "role": user.role.value})
    
    session_rec = UserSession(
        user_id=user.id,
        token_jti=jti,
        ip_address="127.0.0.1",
        created_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(hours=1),
        is_revoked=False,
    )
    db_session.add(session_rec)
    db_session.commit()
    
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(db_session) -> dict:
    return _get_auth_header_for_user(db_session, "test_admin")


@pytest.fixture
def analyst_headers(db_session) -> dict:
    return _get_auth_header_for_user(db_session, "test_analyst")


@pytest.fixture
def employee_headers(db_session) -> dict:
    return _get_auth_header_for_user(db_session, "test_employee")
