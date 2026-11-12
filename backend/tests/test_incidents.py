import pytest
from app.models.incident import Incident, IncidentStatus
from app.models.user import User


def test_incident_lifecycle(client, analyst_headers, db_session):
    # 1. Create Incident
    payload = {
        "title": "Suspicious Lateral Movement",
        "description": "Port scanning and credential spray detected across internal VLAN.",
        "severity": "HIGH",
        "target_user": "test_employee",
        "source_ip": "10.0.10.15",
    }
    create_res = client.post("/api/v1/incidents/", json=payload, headers=analyst_headers)
    assert create_res.status_code == 201
    inc_data = create_res.json()
    inc_id = inc_data["id"]
    assert inc_data["status"] == "OPEN"

    # 2. Assign Analyst
    analyst = db_session.query(User).filter(User.username == "test_analyst").first()
    assign_res = client.post(
        f"/api/v1/incidents/{inc_id}/assign",
        json={"assigned_to_id": analyst.id},
        headers=analyst_headers,
    )
    assert assign_res.status_code == 200
    assert assign_res.json()["assigned_to_id"] == analyst.id
    assert assign_res.json()["status"] == "INVESTIGATING"

    # 3. Containment: Suspend target account
    suspend_res = client.post(
        f"/api/v1/incidents/{inc_id}/suspend-target?duration_minutes=30",
        headers=analyst_headers,
    )
    assert suspend_res.status_code == 200
    assert suspend_res.json()["status"] == "CONTAINED"

    # Verify user in DB is actually locked
    target_user = db_session.query(User).filter(User.username == "test_employee").first()
    assert target_user.is_locked is True

    # 4. Resolve Incident
    resolve_payload = {
        "resolution_notes": "Host isolated, compromised credentials rotated, malware signature purged.",
        "mitigation_actions": "Firewall rule ACL-998 applied.",
    }
    resolve_res = client.post(
        f"/api/v1/incidents/{inc_id}/resolve",
        json=resolve_payload,
        headers=analyst_headers,
    )
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "RESOLVED"
    assert resolve_res.json()["resolution_notes"] == resolve_payload["resolution_notes"]
    assert resolve_res.json()["resolved_at"] is not None
