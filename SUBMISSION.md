# Technical review response

## Changes in this update

- Added a Docker Compose stack for PostgreSQL, the FastAPI backend, and the Nginx-served React frontend.
- Configured the browser client to use same-origin `/api/v1` requests so both Vite's development proxy and the Nginx container proxy connect to the backend.
- Added Docker build-context exclusions, clarified environment setup, and documented local and container workflows.
- Configured pytest-cov to report module statement coverage and fail below 80%.
- Added contribution clarification guidance in [CONTRIBUTING.md](./CONTRIBUTING.md).

## Verification results

- Backend: `docker compose --profile test run --build --rm tests` — **24 passed**, **87.39% statement coverage against PostgreSQL** (80% required). One deprecation warning was emitted by Starlette's test client dependency.
- Frontend: `npm run build` — **passed** with Vite 5.4.21.
- `git diff --check` — **passed**.
- The submitter confirmed that the Docker Compose app loaded, allowed login, recorded simulated events, and displayed an incident. The isolated PostgreSQL Compose test profile was run successfully during this update.
- Tests now require a dedicated PostgreSQL database via `TEST_DATABASE_URL`; the Compose `test` profile provides a separate PostgreSQL test database/volume. The suite verifies JWT login/refresh/logout/session revocation, RBAC, lockout, simulator endpoints, threat rules, and incident lifecycle.

## Contribution clarification

The existing repository already contained the application, demo users, core API/UI, security workflows, and test suite. This update adds the Docker deployment wiring, same-origin API configuration, coverage threshold, ignore rules, and submission/developer documentation. These changes were prepared with AI assistance; accurately disclose that assistance and credit original contributors according to the Git history and applicable project terms.

## Confidentiality check scope and limitation

A local scan of the working tree found no matches for the checked private-key, common cloud-key, GitHub-token, and generic hard-coded secret patterns. Demo-account passwords are now supplied through private environment variables rather than source code. The `.env.example` file contains placeholders only and must be copied and customized locally; never commit `.env`.

This limited scan does **not** certify that all GitHub forks, repository settings, issues, or external company assets have been reviewed. GitHub `main` was rewritten to remove the old synthetic demo-password strings and use the GitHub account identity for commit attribution. The local recovery bundle includes pre-rewrite history and must not be shared. Existing clones, forks, and hosting caches may retain old commit objects. Inspect repository access/settings before making any broader confidentiality assurance; revoke any real credential that may have been committed.

## Short demonstration

1. Start the stack using either the local steps in [README.md](./README.md) or Docker Compose (`http://localhost:8081` for the containerized frontend).
2. Log in using a seeded demo role and verify the corresponding role-limited pages/actions.
3. Run one Attack Simulator scenario and show the resulting security event, alert, and incident.
4. Sign in again, review active sessions, and revoke a session.
