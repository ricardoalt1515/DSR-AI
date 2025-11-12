"""
FastAPI Users authentication backend configuration.

Configures the authentication strategy and transport mechanism:
- JWT Strategy: Token generation and validation
- Bearer Transport: How tokens are sent (Authorization header)

Best Practices:
    - JWT for stateless authentication
    - Bearer tokens in Authorization header (industry standard)
    - Configurable token lifetime
    - Uses existing SECRET_KEY for consistency
    - Type-safe configuration
"""

from fastapi_users.authentication import (
    AuthenticationBackend,
    BearerTransport,
    JWTStrategy,
)

from app.core.config import settings


def get_jwt_strategy() -> JWTStrategy:
    """
    Configure JWT strategy for access tokens.
    
    Best Practices:
        - Uses same SECRET_KEY as application
        - Token lifetime matches existing system
        - Standard HS256 algorithm
        - Stateless (no database lookups needed)
    
    Returns:
        JWTStrategy: Configured JWT strategy
    """
    return JWTStrategy(
        secret=settings.SECRET_KEY,
        lifetime_seconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        algorithm=settings.ALGORITHM,
    )


# Bearer transport: tokens sent in Authorization: Bearer <token> header
# This is the industry standard for JWT authentication
bearer_transport = BearerTransport(
    tokenUrl=f"{settings.API_V1_PREFIX}/auth/jwt/login"
)


# Authentication backend: combines transport + strategy
# This is what FastAPI Users uses to authenticate requests
auth_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)
