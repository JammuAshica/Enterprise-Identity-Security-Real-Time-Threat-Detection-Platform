# Contribution clarification

Use this statement in a submission and edit it to accurately reflect the work performed:

> The existing repository provides the core identity-security application, including its FastAPI API, React dashboard, authentication/RBAC/session features, threat rules, incident workflows, and initial tests. For this update, I added/updated: [list only changes you personally made and verified]. The seeded users and event data are synthetic demonstration data; demo passwords are configured locally through a private environment file and are not committed. Original authorship and third-party contributions should be credited according to the repository history and applicable licenses.

Do not claim authorship of pre-existing code. Include the test command and actual result from your own run, rather than reporting a target as a result. For a live demonstration, show successful login, role-based access behavior, one simulated threat, its resulting alert/incident, and session revocation.

## Local checks

From `backend`:

```powershell
.\.venv\Scripts\python.exe -m pytest
```

From `frontend`:

```powershell
npm ci
npm run build
```
