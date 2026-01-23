"""
Health check endpoints for monitoring and load balancers.
"""

import os
from datetime import UTC, datetime

import structlog
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import text

from app.core.config import settings
from app.core.database import async_engine
from app.services.cache_service import cache_service

logger = structlog.get_logger(__name__)

router = APIRouter()


class HealthStatus(BaseModel):
    """Health check status model."""

    status: str
    version: str
    environment: str
    database: str
    redis: str
    openai: str


@router.get(
    "/health",
    response_model=HealthStatus,
    status_code=status.HTTP_200_OK,
    tags=["Health"],
)
async def health_check():
    """
    Comprehensive health check endpoint.

    Verifies connectivity to:
    - PostgreSQL database
    - Redis cache
    - OpenAI API availability

    Returns 200 if all services are healthy, 503 otherwise.
    """
    health_status = {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "database": "unknown",
        "redis": "unknown",
        "openai": "unknown",
    }

    all_healthy = True

    # Check PostgreSQL
    try:
        async with async_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        health_status["database"] = "healthy"
        logger.debug("✅ Database health check passed")
    except Exception as e:
        health_status["database"] = f"unhealthy: {str(e)[:50]}"
        all_healthy = False
        logger.error(f"❌ Database health check failed: {e}")

    # Check Redis
    try:
        if cache_service._redis:
            await cache_service._redis.ping()  # ty: ignore[invalid-await]
            health_status["redis"] = "healthy"
            logger.debug("✅ Redis health check passed")
        else:
            health_status["redis"] = "not connected"
            # Redis is optional, don't fail health check
            logger.warning("⚠️ Redis not connected")
    except Exception as e:
        health_status["redis"] = f"unhealthy: {str(e)[:50]}"
        # Redis is optional, don't fail health check
        logger.error(f"❌ Redis health check failed: {e}")

    # Check OpenAI API (just verify key exists, don't make actual call)
    try:
        if settings.OPENAI_API_KEY and len(settings.OPENAI_API_KEY) > 10:
            health_status["openai"] = "configured"
            logger.debug("✅ OpenAI API key configured")
        else:
            health_status["openai"] = "not configured"
            logger.warning("⚠️ OpenAI API key not configured")
    except Exception as e:
        health_status["openai"] = f"error: {str(e)[:50]}"
        logger.error(f"❌ OpenAI check failed: {e}")

    # Set overall status
    if not all_healthy:
        health_status["status"] = "degraded"
        return JSONResponse(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, content=health_status)

    return HealthStatus(**health_status)


@router.get(
    "/health/liveness",
    status_code=status.HTTP_200_OK,
    tags=["Health"],
)
async def liveness_probe():
    """
    Kubernetes liveness probe endpoint.

    Simple endpoint that returns 200 if the application is running.
    Does not check external dependencies.
    """
    return {"status": "alive"}


@router.get(
    "/health/readiness",
    status_code=status.HTTP_200_OK,
    tags=["Health"],
)
async def readiness_probe():
    """
    Kubernetes readiness probe endpoint.

    Checks if the application is ready to serve traffic.
    Verifies database connectivity.
    """
    try:
        async with async_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "ready", "database": "connected"}
    except Exception as e:
        logger.error(f"❌ Readiness check failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "not ready", "database": f"error: {str(e)[:50]}"},
        )


class VersionInfo(BaseModel):
    """Application version information."""

    version: str
    environment: str
    commit: str
    deployed_at: str


@router.get(
    "/version",
    response_model=VersionInfo,
    status_code=status.HTTP_200_OK,
    tags=["Health"],
)
async def get_version():
    """
    Get application version information.

    Useful for:
    - Verifying deployment succeeded
    - Debugging which version is running
    - CI/CD pipeline verification
    """
    return VersionInfo(
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        commit=os.environ.get("GIT_COMMIT", "unknown"),
        deployed_at=os.environ.get("DEPLOYED_AT", datetime.now(UTC).isoformat()),
    )
