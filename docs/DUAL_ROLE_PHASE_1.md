# Phase 1: Role System Foundation

> **Duration:** 1 day (8-10 hours)  
> **Priority:** 🔴 CRITICAL  
> **Deliverable:** Users con roles, dashboard routing funcional

---

## 🎯 Objectives

1. Agregar campo `role` a tabla `users`
2. Crear dependency `CurrentAdmin` para proteger endpoints
3. Implementar role-based dashboard routing
4. Agregar índices para performance

**Al final de Phase 1:**
- ✅ DB tiene columna `users.role`
- ✅ `/dashboard` redirige según role
- ✅ Field agents ven solo sus proyectos
- ✅ Base para admin features

---

## 🗄️ Backend Tasks

### Task 1.1: Database Migration (2 horas)

```python
# backend/alembic/versions/20241107_add_role_system.py
"""Add role system to users

Revision ID: abc123def456
Revises: [previous_revision]
Create Date: 2024-11-07 14:00:00
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'abc123def456'
down_revision = '[previous_revision]'  # Update con el último
branch_labels = None
depends_on = None

def upgrade():
    # 1. Add role enum (optional, pero mejor para PostgreSQL)
    role_enum = postgresql.ENUM('field_agent', 'admin', name='user_role')
    role_enum.create(op.get_bind(), checkfirst=True)
    
    # 2. Add role column
    op.add_column('users', sa.Column(
        'role',
        sa.String(20),
        nullable=False,
        server_default='field_agent'  # Todos los existentes = field_agent
    ))
    
    # 3. Add organizational fields
    op.add_column('users', sa.Column(
        'department',
        sa.String(50),
        nullable=True
    ))
    
    op.add_column('users', sa.Column(
        'manager_id',
        sa.UUID(),
        sa.ForeignKey('users.id', name='fk_users_manager'),
        nullable=True
    ))
    
    # 4. Migrate first user to admin (AJUSTAR SEGÚN TU CASO)
    # Opción A: Primer usuario creado
    op.execute("""
        UPDATE users SET role = 'admin' 
        WHERE id = (SELECT id FROM users ORDER BY created_at LIMIT 1)
    """)
    
    # Opción B: Por email específico
    # op.execute("""
    #     UPDATE users SET role = 'admin' 
    #     WHERE email = 'admin@tuempresa.com'
    # """)
    
    # 5. Create performance indexes
    op.create_index('ix_users_role', 'users', ['role'])
    op.create_index('ix_users_manager', 'users', ['manager_id'])
    op.create_index('ix_users_department', 'users', ['department'])
    
    # 6. Indexes para queries de admin (projects)
    op.create_index(
        'ix_projects_user_status',
        'projects',
        ['user_id', 'status']
    )
    
    op.create_index(
        'ix_projects_created_desc',
        'projects',
        [sa.text('created_at DESC')]
    )

def downgrade():
    # Drop indexes
    op.drop_index('ix_projects_created_desc', 'projects')
    op.drop_index('ix_projects_user_status', 'projects')
    op.drop_index('ix_users_department', 'users')
    op.drop_index('ix_users_manager', 'users')
    op.drop_index('ix_users_role', 'users')
    
    # Drop columns
    op.drop_column('users', 'manager_id')
    op.drop_column('users', 'department')
    op.drop_column('users', 'role')
    
    # Drop enum
    op.execute('DROP TYPE IF EXISTS user_role')
```

**Testing:**
```bash
cd backend

# Apply migration
docker-compose exec app alembic upgrade head

# Verify columns exist
docker-compose exec postgres psql -U postgres -d waste_platform \
  -c "\d users"

# Verify first user is admin
docker-compose exec postgres psql -U postgres -d waste_platform \
  -c "SELECT id, email, role FROM users;"

# Verify indexes
docker-compose exec postgres psql -U postgres -d waste_platform \
  -c "\d+ users"
```

---

### Task 1.2: User Model Update (1 hora)

```python
# backend/app/models/user.py
from enum import Enum
from sqlalchemy import String, UUID, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from fastapi_users.db import SQLAlchemyBaseUserTable

from app.models.base import BaseModel

class UserRole(str, Enum):
    """User role enum"""
    FIELD_AGENT = "field_agent"
    ADMIN = "admin"
    # Future expansion:
    # SUPERVISOR = "supervisor"
    # ANALYST = "analyst"
    # SUPER_ADMIN = "super_admin"

class User(SQLAlchemyBaseUserTable[UUID], BaseModel):
    """User model with role-based access"""
    
    # Existing fields (from fastapi-users)
    # id, email, hashed_password, is_active, is_superuser, is_verified
    
    # Profile fields (existing)
    first_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    
    # Role system (NEW)
    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=UserRole.FIELD_AGENT,
        index=True,
        comment="User role: field_agent, admin, etc."
    )
    
    department: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        index=True,
        comment="Department: Sales, Operations, Engineering"
    )
    
    manager_id: Mapped[UUID | None] = mapped_column(
        UUID,
        ForeignKey("users.id", name="fk_users_manager"),
        nullable=True,
        index=True,
        comment="Manager (for hierarchical permissions)"
    )
    
    # Relationships
    manager: Mapped["User | None"] = relationship(
        "User",
        remote_side="User.id",
        foreign_keys=[manager_id],
        back_populates="direct_reports"
    )
    
    direct_reports: Mapped[list["User"]] = relationship(
        "User",
        back_populates="manager",
        foreign_keys="User.manager_id"
    )
    
    # Existing relationship
    projects: Mapped[list["Project"]] = relationship(
        "Project",
        back_populates="user",
        foreign_keys="Project.user_id"
    )
    
    # Helper methods
    def is_admin(self) -> bool:
        """Check if user is admin"""
        return self.role == UserRole.ADMIN
    
    def is_field_agent(self) -> bool:
        """Check if user is field agent"""
        return self.role == UserRole.FIELD_AGENT
    
    def can_view_project(self, project: "Project") -> bool:
        """Check if user can view a project"""
        if self.is_admin():
            return True  # Admins see everything
        return str(project.user_id) == str(self.id)
    
    def can_edit_project(self, project: "Project") -> bool:
        """Check if user can edit a project"""
        # Only project owner can edit (even admins can't edit other's projects)
        return str(project.user_id) == str(self.id)
    
    def can_delete_project(self, project: "Project") -> bool:
        """Check if user can delete a project"""
        if self.is_admin():
            return True  # Admins can delete any project
        return str(project.user_id) == str(self.id)
    
    @property
    def display_name(self) -> str:
        """Get display name (full name or email)"""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        elif self.first_name:
            return self.first_name
        return self.email
```

**Testing:**
```bash
cd backend

# Check model import
docker-compose exec app python -c "from app.models.user import User, UserRole; print('OK')"

# Verify enum values
docker-compose exec app python -c "
from app.models.user import UserRole
print(list(UserRole))
"
```

---

### Task 1.3: API Dependencies (1.5 horas)

```python
# backend/app/api/dependencies.py
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.models.user import User, UserRole
from app.core.auth import current_active_user

# Type aliases (existing)
AsyncDB = Annotated[AsyncSession, Depends(get_async_session)]
CurrentUser = Annotated[User, Depends(current_active_user)]

# Role-based dependencies (NEW)
def require_role(*allowed_roles: str):
    """
    Dependency factory for role-based access control.
    
    Usage:
        CurrentAdmin = Annotated[User, Depends(require_role("admin"))]
        
        @router.get("/admin/stats")
        async def get_stats(admin: CurrentAdmin):
            # Only admins can access
    """
    def dependency(user: CurrentUser) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}"
            )
        return user
    return dependency

# Convenience type aliases
CurrentAdmin = Annotated[User, Depends(require_role(UserRole.ADMIN))]
CurrentFieldAgent = Annotated[User, Depends(require_role(UserRole.FIELD_AGENT))]
CurrentAnyRole = Annotated[User, Depends(require_role(UserRole.ADMIN, UserRole.FIELD_AGENT))]

# Future expansion
# CurrentSupervisor = Annotated[User, Depends(require_role(UserRole.ADMIN, UserRole.SUPERVISOR))]
# CurrentReadOnly = Annotated[User, Depends(require_role(UserRole.ANALYST))]
```

**Testing:**
```bash
# Test dependency
docker-compose exec app python -c "
from app.api.dependencies import CurrentAdmin
print('Dependencies imported OK')
"
```

---

### Task 1.4: Update User Schemas (1 hora)

```python
# backend/app/schemas/user.py
from datetime import datetime
from uuid import UUID
from pydantic import EmailStr

from app.schemas.base import BaseSchema

class UserRead(BaseSchema):
    """User schema for reading (responses)"""
    id: UUID
    email: EmailStr
    first_name: str | None
    last_name: str | None
    role: str  # ← NEW
    department: str | None  # ← NEW
    manager_id: UUID | None  # ← NEW
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime

class UserUpdate(BaseSchema):
    """User schema for self-update"""
    first_name: str | None = None
    last_name: str | None = None
    department: str | None = None
    # Note: Users cannot change their own role

class AdminUserUpdate(BaseSchema):
    """Admin-only user update schema"""
    first_name: str | None = None
    last_name: str | None = None
    department: str | None = None
    role: str | None = None  # ← Admin can change roles
    manager_id: UUID | None = None
    is_active: bool | None = None

class UserStats(BaseSchema):
    """User statistics (for leaderboard)"""
    id: UUID
    name: str
    email: EmailStr
    department: str | None
    project_count: int
    total_revenue: float
    avg_progress: float
```

---

### Task 1.5: Update Projects Endpoint (1.5 horas)

```python
# backend/app/api/v1/projects.py
from fastapi import APIRouter, Query, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from uuid import UUID

from app.api.dependencies import CurrentUser, AsyncDB
from app.models import Project, Location, Company
from app.schemas import ProjectSummary, ProjectDetail, ProjectCreate

router = APIRouter(prefix="/projects", tags=["projects"])

@router.get("/", response_model=list[ProjectSummary])
async def get_projects(
    user: CurrentUser,  # Any authenticated user
    db: AsyncDB,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None)
):
    """
    Get projects - scoped by user role.
    
    - Field agents: See only their own projects
    - Admins: See all projects (use /admin/team-projects for filtering)
    """
    
    # Base query with eager loading
    query = select(Project).options(
        selectinload(Project.location_rel).selectinload(Location.company),
        selectinload(Project.user)
    )
    
    # Role-based filtering
    if user.role == "field_agent":
        query = query.where(Project.user_id == user.id)
    # Admins see all (no filter)
    
    # Optional status filter
    if status:
        query = query.where(Project.status == status)
    
    # Order by most recent
    query = query.order_by(Project.created_at.desc())
    
    # Pagination
    query = query.offset((page - 1) * size).limit(size)
    
    # Execute
    result = await db.execute(query)
    projects = result.scalars().all()
    
    return [ProjectSummary.model_validate(p) for p in projects]

@router.get("/{project_id}", response_model=ProjectDetail)
async def get_project(
    project_id: UUID,
    user: CurrentUser,
    db: AsyncDB
):
    """Get project detail - with permission check"""
    
    result = await db.execute(
        select(Project)
        .options(
            selectinload(Project.location_rel).selectinload(Location.company),
            selectinload(Project.user),
            selectinload(Project.proposals)
        )
        .where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Permission check
    if not user.can_view_project(project):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this project"
        )
    
    return ProjectDetail.model_validate(project)

@router.post("/", response_model=ProjectDetail, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    user: CurrentUser,
    db: AsyncDB
):
    """Create new project - auto-assign to current user"""
    
    # Verify location exists and user has access
    result = await db.execute(
        select(Location).where(Location.id == data.location_id)
    )
    location = result.scalar_one_or_none()
    
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found"
        )
    
    # Create project
    project = Project(
        **data.model_dump(),
        user_id=user.id  # Auto-assign to current user
    )
    
    db.add(project)
    await db.commit()
    await db.refresh(project)
    
    return ProjectDetail.model_validate(project)

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    user: CurrentUser,
    db: AsyncDB
):
    """Delete project - only owner or admin"""
    
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Permission check
    if not user.can_delete_project(project):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this project"
        )
    
    await db.delete(project)
    await db.commit()
```

**Testing:**
```bash
cd backend

# Test with field agent token
curl -H "Authorization: Bearer $AGENT_TOKEN" \
  http://localhost:8000/api/v1/projects

# Test with admin token (should see all)
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8000/api/v1/projects
```

---

## 💻 Frontend Tasks

### Task 1.6: Update Auth Store (1 hora)

```typescript
// frontend/lib/stores/auth-store.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: "field_agent" | "admin";  // ← NEW
  department: string | null;      // ← NEW
  is_active: boolean;
  is_verified: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  
  // Actions
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  
  // Helper methods (NEW)
  isAdmin: () => boolean;
  isFieldAgent: () => boolean;
  displayName: () => string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      setAuth: (user, token) => {
        set({
          user,
          token,
          isAuthenticated: true
        });
      },
      
      clearAuth: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false
        });
      },
      
      isAdmin: () => {
        return get().user?.role === "admin";
      },
      
      isFieldAgent: () => {
        return get().user?.role === "field_agent";
      },
      
      displayName: () => {
        const user = get().user;
        if (!user) return "";
        
        if (user.first_name && user.last_name) {
          return `${user.first_name} ${user.last_name}`;
        }
        if (user.first_name) {
          return user.first_name;
        }
        return user.email;
      }
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

---

### Task 1.7: Dashboard Routing (1 hora)

```typescript
// frontend/app/dashboard/page.tsx
"use client";

import { useAuthStore } from "@/lib/stores/auth-store";
import { redirect } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { user, isAdmin, isFieldAgent } = useAuthStore();

  useEffect(() => {
    if (!user) {
      redirect("/login");
      return;
    }

    // Role-based routing
    if (isAdmin()) {
      redirect("/dashboard/admin");
    } else if (isFieldAgent()) {
      redirect("/dashboard/agent");
    }
  }, [user, isAdmin, isFieldAgent]);

  // Loading state while redirecting
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    </div>
  );
}
```

---

### Task 1.8: Field Agent Dashboard (30 min)

```bash
# Rename existing dashboard to field-agent-dashboard
mv frontend/components/features/dashboard/dashboard-page.tsx \
   frontend/components/features/dashboard/field-agent-dashboard.tsx
```

```typescript
// frontend/app/dashboard/agent/page.tsx
"use client";

import { useAuthStore } from "@/lib/stores/auth-store";
import FieldAgentDashboard from "@/components/features/dashboard/field-agent-dashboard";
import { Badge } from "@/components/ui/badge";

export default function AgentDashboardPage() {
  const { displayName } = useAuthStore();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {displayName()}
          </p>
        </div>
        <Badge variant="outline">Field Agent</Badge>
      </div>

      <FieldAgentDashboard />
    </div>
  );
}
```

---

### Task 1.9: Admin Dashboard Placeholder (30 min)

```typescript
// frontend/app/dashboard/admin/page.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Team oversight and management
          </p>
        </div>
        <Badge>Admin</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="h-5 w-5" />
            Under Construction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Admin features will be implemented in Phase 2:
          </p>
          <ul className="list-disc list-inside mt-4 space-y-2 text-sm">
            <li>Team statistics and KPIs</li>
            <li>All projects from all agents</li>
            <li>Agent performance leaderboard</li>
            <li>Approval queue (Phase 3)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## ✅ Phase 1 Checklist

### Backend
- [ ] Migration created and applied
- [ ] User model updated with role, department, manager_id
- [ ] UserRole enum defined
- [ ] CurrentAdmin dependency created
- [ ] User schemas updated
- [ ] Projects endpoint updated with role filtering
- [ ] Permission methods tested (can_view_project, etc.)

### Frontend
- [ ] Auth store includes role field
- [ ] isAdmin() and isFieldAgent() helpers work
- [ ] /dashboard routes correctly by role
- [ ] /dashboard/agent shows field agent view
- [ ] /dashboard/admin shows placeholder
- [ ] TypeScript types updated

### Testing
- [ ] Migration runs without errors
- [ ] First user is admin
- [ ] Field agent can only see their projects
- [ ] Admin can see all projects
- [ ] 403 error when field agent tries admin endpoint
- [ ] Dashboard routing works for both roles

---

## 🚀 Ready for Phase 2

Once Phase 1 is complete, you have:
- ✅ Solid role foundation
- ✅ Proper access control
- ✅ Performance indexes
- ✅ Room to grow (supervisor, analyst roles)

**Next:** Implement admin dashboard with team stats and project views.
