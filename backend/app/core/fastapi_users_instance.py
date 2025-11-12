"""
FastAPI Users instance configuration.

This is the main FastAPI Users object that ties everything together:
- User model
- User manager
- Authentication backends
- Type-safe dependencies

Best Practices:
    - Single source of truth for FastAPI Users
    - Type-safe with generics
    - Reusable dependencies
    - Clean imports for routes
"""

import uuid
from fastapi_users import FastAPIUsers

from app.models.user import User
from app.core.user_manager import get_user_manager
from app.core.auth_backend import auth_backend


# Main FastAPI Users instance
# This is the core object that provides all FastAPI Users functionality
fastapi_users = FastAPIUsers[User, uuid.UUID](
    get_user_manager,
    [auth_backend],
)

# Dependency to get current active user
# Use this in your routes to require authentication
# Example:
#   @router.get("/protected")
#   async def protected_route(user: User = Depends(current_active_user)):
#       return {"user_id": user.id}
current_active_user = fastapi_users.current_user(active=True)

# Dependency to get current superuser
# Use this in your admin routes
# Example:
#   @router.get("/admin")
#   async def admin_route(user: User = Depends(current_superuser)):
#       return {"admin": user.email}
current_superuser = fastapi_users.current_user(active=True, superuser=True)

# Dependency to get current verified user
# Use this when you need email verification
# Example:
#   @router.get("/verified-only")
#   async def verified_route(user: User = Depends(current_verified_user)):
#       return {"verified_user": user.email}
current_verified_user = fastapi_users.current_user(active=True, verified=True)

# Optional: Get current user without raising exception if not authenticated
# Returns None if not authenticated
# Example:
#   @router.get("/optional-auth")
#   async def optional_route(user: Optional[User] = Depends(current_active_user_optional)):
#       if user:
#           return {"authenticated": True, "user_id": user.id}
#       return {"authenticated": False}
current_active_user_optional = fastapi_users.current_user(active=True, optional=True)
