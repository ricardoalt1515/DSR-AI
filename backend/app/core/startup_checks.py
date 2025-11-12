"""
Production-ready startup validation.
Validates critical configuration before accepting traffic.
"""

import structlog
from app.core.config import settings

logger = structlog.get_logger(__name__)


def validate_production_config() -> None:
    """
    Validate critical configuration for production readiness.
    Fails fast if misconfigured to prevent production incidents.
    """
    if settings.ENVIRONMENT != "production":
        logger.info("Skipping production validation (not in production mode)")
        return
    
    errors = []
    
    # 1. HTTPS enforcement
    if not settings.BACKEND_URL.startswith("https://"):
        errors.append("BACKEND_URL must use HTTPS in production")
    
    # 2. Strong SECRET_KEY
    if len(settings.SECRET_KEY) < 32:
        errors.append("SECRET_KEY must be at least 32 characters")
    
    # 3. CORS validation
    for origin in settings.cors_origins_list:
        if "localhost" in origin.lower():
            errors.append(f"Production CORS cannot include localhost: {origin}")
        if not origin.startswith("https://"):
            errors.append(f"Production CORS must use HTTPS: {origin}")
    
    # 4. Database not localhost
    if settings.POSTGRES_SERVER in ["localhost", "127.0.0.1"]:
        errors.append("POSTGRES_SERVER cannot be localhost in production")
    
    # 5. Redis not localhost
    if settings.REDIS_HOST in ["localhost", "127.0.0.1"]:
        errors.append("REDIS_HOST cannot be localhost in production")
    
    # 6. Debug mode disabled
    if settings.DEBUG:
        errors.append("DEBUG must be False in production")
    
    # 7. Storage configured
    if settings.USE_LOCAL_STORAGE:
        logger.warning("⚠️ Using local storage in production (should use S3)")
    
    # If errors found, fail startup
    if errors:
        logger.error("❌ Production configuration validation failed:")
        for error in errors:
            logger.error(f"  - {error}")
        raise ValueError(f"Invalid production configuration: {len(errors)} error(s) found")
    
    logger.info("✅ Production configuration validation passed")


def validate_required_secrets() -> None:
    """
    Validate that required secrets are configured.
    Works in all environments.
    """
    required = {
        "OPENAI_API_KEY": settings.OPENAI_API_KEY,
        "SECRET_KEY": settings.SECRET_KEY,
        "POSTGRES_PASSWORD": settings.POSTGRES_PASSWORD,
    }
    
    missing = []
    placeholder_values = ["your-", "sk-your-", "change-this"]
    
    for key, value in required.items():
        if not value:
            missing.append(f"{key} is not set")
        elif any(placeholder in value.lower() for placeholder in placeholder_values):
            missing.append(f"{key} has placeholder value")
    
    if missing:
        logger.error("❌ Required secrets validation failed:")
        for error in missing:
            logger.error(f"  - {error}")
        raise ValueError(f"Missing or invalid secrets: {len(missing)} error(s) found")
    
    logger.info("✅ Required secrets validation passed")
