from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.api.v1 import api_router
from app.services.synthetic_data import SyntheticSecuritySimulator


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure database schema exists
    Base.metadata.create_all(bind=engine)
    
    # Auto-seed initial demo accounts and telemetry if not already present
    db = SessionLocal()
    try:
        SyntheticSecuritySimulator.seed_initial_demo_database(db)
    finally:
        db.close()
    
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Enterprise-grade Identity Security and Real-Time Threat Detection Platform API. "
        "Provides JWT authentication, Role-Based Access Control, session revocation, "
        "asynchronous threat detection, automated incident response, and live SOC event streaming."
    ),
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Health & Status"])
def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "docs_url": "/docs",
        "api_v1": settings.API_V1_STR,
    }


@app.get("/health", tags=["Health & Status"])
def health_check():
    """Service health check endpoint."""
    return {"status": "healthy", "timestamp": "ok"}


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Centralized fallback error handler."""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred.",
            "error_type": type(exc).__name__,
        },
    )
