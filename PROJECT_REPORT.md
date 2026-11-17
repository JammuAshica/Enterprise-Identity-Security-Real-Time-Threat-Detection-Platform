# Project report: Enterprise Identity Security & Real-Time Threat Detection Platform

**Repository:** [JammuAshica/Enterprise-Identity-Security-Real-Time-Threat-Detection-Platform](https://github.com/JammuAshica/Enterprise-Identity-Security-Real-Time-Threat-Detection-Platform)

## Executive summary

This project is a demonstration identity-security and security-operations platform. It combines a FastAPI backend and React dashboard to demonstrate authentication, authorization, security-event collection, threat detection, alerts, and incident response. It is a synthetic-data demo, not a production-ready security product.

## Architecture and technologies

- **Frontend:** React 18, Vite, Tailwind CSS, served by Vite in local development or Nginx in the Docker deployment.
- **Backend:** Python 3.11+, FastAPI, SQLAlchemy, and JWT-based access and refresh tokens.
- **Persistence:** SQLite for local development and automated tests; PostgreSQL for the Docker Compose deployment.
- **Containers:** Docker Compose coordinates PostgreSQL, the API, and the frontend. The frontend sends same-origin `/api/v1` requests; Vite and Nginx proxy those requests to the API.

## Main capabilities

- Authentication, access/refresh tokens, logout, session listing and revocation.
- Role-based access for administrators, security analysts, and employees.
- User administration, employee self-service, audit/security event feeds, and alert acknowledgement.
- Synthetic brute-force, impossible-travel, privilege-escalation, and benign-traffic scenarios.
- Threat rules that can create alerts and incidents, with analyst assignment, containment, and resolution workflows.

## Local demonstration and Docker deployment

The submitter ran the prior Docker Compose version and confirmed that the application loaded, login succeeded, the simulated impossible-travel event appeared in Live SOC Feed, and the corresponding incident details were visible. The credential-configuration changes in this update need a fresh Docker rebuild and login check before describing the updated container version as re-verified.

For a repeatable Docker run, install Docker Desktop, create a private `.env` from `.env.example`, replace all placeholders, and run from the repository root:

```powershell
docker compose up --build
```

The frontend is served at `http://localhost:8081`; API health and interactive documentation are at `http://localhost:8000/health` and `http://localhost:8000/docs`. Stop the stack with `Ctrl+C`, then `docker compose down`; the named database volume is retained. The Docker runtime was not independently inspected from this authoring session, so retain `docker compose ps` output or screenshots if the manager requires deployment evidence.

## Automated verification

Verified from the repository during this update:

- Backend: `backend\.venv\Scripts\python.exe -m pytest` — **24 tests passed**, **87.55% total statement coverage**, above the configured 80% minimum.
- Frontend: `npm run build` — **passed** with Vite 5.4.21.
- `git diff --check` — **passed**.

The backend tests use isolated in-memory SQLite. They cover authentication/token lifecycle, RBAC, lockout, API behavior, threat-engine rules, and incident handling. They do not constitute a PostgreSQL-specific automated integration suite.

## Changes prepared for this submission

- Added PostgreSQL/backend/frontend Docker Compose deployment configuration and Dockerfiles.
- Updated the frontend API base to same-origin routing for the local Vite proxy and containerized Nginx proxy.
- Moved demo-account passwords to required private environment values, removed prefilled login passwords, and synchronized existing seeded demo-account password hashes at startup.
- Added Docker build-context ignore files and ignored `backend/.venv/`.
- Configured pytest coverage reporting and an 80% minimum.
- Updated setup/deployment instructions and added contribution and submission guidance.

These are changes prepared with AI assistance. The submitter should confirm the diff, describe their own review/testing accurately, and credit the original project authors and any other contributors based on repository history.

## Confidentiality and credential assessment

The `.env` file and local database are ignored and were not found in Git's current tracked-file list. A limited working-tree scan found no matches for the checked private-key, common cloud-key, GitHub-token, and generic hard-coded secret patterns. The local Git history has been rewritten to replace the three former synthetic demo passwords; a search confirmed the old strings are absent from all reachable local refs. The public GitHub remote has **not yet** been updated and still needs an approved force-push before its branch history is rewritten. The private local recovery bundle contains the pre-rewrite history and must not be shared. No actual company credential was identified by these limited checks. This is not a complete audit of repository history, forks, settings, or company assets.

Demo-account passwords are required from `DEMO_ADMIN_PASSWORD`, `DEMO_ANALYST_PASSWORD`, and `DEMO_EMPLOYEE_PASSWORD`; `.env.example` includes placeholders that must be replaced. The login page no longer pre-fills passwords, and startup updates seeded demo accounts to the configured local passwords. Never use these accounts in production.

Before sharing the repository, add the new demo password settings to your existing private `.env` and verify that `.env` is not tracked (`git ls-files .env` should print nothing). The rewritten local `main` must be force-pushed to the public remote to replace its old history; collaborators will need to re-clone or carefully reset their local branches. GitHub caches, forks, and existing clones may retain old commit objects. Inspect the full Git history and public repository access, and revoke/rotate any real credential if one was ever committed. If a real secret was committed, deleting it from the latest files is insufficient; remove it from history and rotate it.

## Suggested demonstration sequence

1. Show successful login and the dashboard.
2. Show the simulated London-to-Tokyo login records in **Live SOC Feed**.
3. Open the **Incident Response** queue and select the related incident to show its details.
4. Assign an analyst. Avoid temporary suspension unless intentionally demonstrating account containment; it locks the target account.
5. Show the test summary above and provide the repository link.

## Related documentation

- [README.md](./README.md) — setup, tests, and Docker run instructions.
- [CONTRIBUTING.md](./CONTRIBUTING.md) — contribution clarification template.
- [SUBMISSION.md](./SUBMISSION.md) — technical review response and verification summary.
