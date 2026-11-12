from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.synthetic_data import SyntheticSecuritySimulator

router = APIRouter(prefix="/simulator", tags=["Synthetic Attack Simulator & Demo"])


@router.post("/seed")
def seed_demo_data(db: Session = Depends(get_db)):
    """Initialize database with default enterprise accounts, roles, and baseline telemetry."""
    return SyntheticSecuritySimulator.seed_initial_demo_database(db)


@router.post("/attack/brute-force")
def simulate_brute_force(
    target_username: str = Query("john_doe", description="Username to target"),
    attempts: int = Query(6, ge=3, le=20),
    db: Session = Depends(get_db),
):
    """
    Trigger a simulated credential brute-force attack.
    Demonstrates rate-limiting, alert thresholding, automated account lockout, and incident creation.
    """
    return SyntheticSecuritySimulator.simulate_brute_force_attack(
        db=db,
        target_username=target_username,
        attempts=attempts,
    )


@router.post("/attack/impossible-travel")
def simulate_impossible_travel(
    username: str = Query("sarah_connor", description="User for impossible travel anomaly"),
    db: Session = Depends(get_db),
):
    """
    Trigger a simulated Impossible Travel anomaly (London -> Tokyo in 20 minutes).
    Demonstrates geospatial distance/time velocity calculations and automated incident triage.
    """
    return SyntheticSecuritySimulator.simulate_impossible_travel(
        db=db,
        username=username,
    )


@router.post("/attack/privilege-escalation")
def simulate_privilege_escalation(
    username: str = Query("john_doe", description="Employee username attempting privilege escalation"),
    db: Session = Depends(get_db),
):
    """
    Trigger simulated unauthorized privilege escalation probing against elevated endpoints.
    Demonstrates RBAC denial logging and critical escalation alerting.
    """
    return SyntheticSecuritySimulator.simulate_privilege_escalation(
        db=db,
        username=username,
    )


@router.post("/traffic/benign")
def simulate_benign_traffic(db: Session = Depends(get_db)):
    """Simulate routine enterprise authentication telemetry."""
    return SyntheticSecuritySimulator.simulate_benign_traffic(db)
