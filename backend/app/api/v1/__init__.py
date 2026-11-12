from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.employees import router as employees_router
from app.api.v1.security_events import router as events_router
from app.api.v1.alerts import router as alerts_router
from app.api.v1.incidents import router as incidents_router
from app.api.v1.simulator import router as simulator_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(employees_router)
api_router.include_router(events_router)
api_router.include_router(alerts_router)
api_router.include_router(incidents_router)
api_router.include_router(simulator_router)
