# Dual-Role System - Reusability Strategy

> **How to reuse this system in H2O Allegiant (Water Platform)**

---

## 🎯 Design Philosophy

El sistema de roles fue diseñado para ser **domain-agnostic**:
- Usuarios tienen roles (no importa si venden waste o water)
- Admins supervisan equipos (misma UI, diferentes métricas)
- Approval workflow aplica a cualquier tipo de propuesta

**Principio:** Construir patrones genéricos, customizar solo el contenido.

---

## 🔄 Shared Components (100% Reusable)

### Backend Patterns

#### 1. User Model with Roles
```python
# SHARED CODE (copiar tal cual a ambas plataformas)

class UserRole(str, Enum):
    FIELD_AGENT = "field_agent"
    ADMIN = "admin"

class User(SQLAlchemyBaseUserTable[UUID], BaseModel):
    role = Column(String(20), default=UserRole.FIELD_AGENT)
    department = Column(String(50))
    manager_id = Column(UUID, ForeignKey("users.id"))
    
    # Helper methods
    def is_admin(self) -> bool:
        return self.role == UserRole.ADMIN
    
    def can_view_project(self, project) -> bool:
        if self.is_admin():
            return True
        return project.user_id == self.id
```

**Usage en Waste:** ✅ Ya implementado  
**Usage en Water:** Copiar exactamente igual

---

#### 2. Role-Based Dependencies
```python
# SHARED CODE

def require_role(*allowed_roles: str):
    def dependency(user: CurrentUser) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(403, "Access denied")
        return user
    return dependency

CurrentAdmin = Annotated[User, Depends(require_role("admin"))]
```

**Usage en Waste:** Projects, Proposals, Admin endpoints  
**Usage en Water:** Projects (water designs), Proposals (engineering proposals)

---

#### 3. Admin Stats Endpoint Pattern
```python
# SHARED PATTERN (adaptar métricas)

@router.get("/admin/team-stats")
async def get_team_stats(admin: CurrentAdmin, db: AsyncDB):
    # Total projects (MISMO)
    total_projects = await db.scalar(select(func.count(Project.id)))
    
    # Total revenue (MISMO)
    total_revenue = await db.scalar(select(func.sum(Project.budget)))
    
    # Active agents (MISMO)
    active_agents = await db.scalar(
        select(func.count(User.id))
        .where(User.role == "field_agent")
    )
    
    # Status breakdown (MISMO)
    status_breakdown = await db.execute(
        select(Project.status, func.count(Project.id))
        .group_by(Project.status)
    )
    
    # PLATFORM-SPECIFIC METRICS:
    # Waste: tons_diverted, waste_streams_count
    # Water: total_flow_rate, treatment_technologies
    
    return { "total_projects": ..., "total_revenue": ... }
```

**Waste Platform:**
```python
# Additional metrics
tons_diverted = await db.scalar(
    select(func.sum(Project.project_data['tons_per_year']))
)
```

**Water Platform:**
```python
# Additional metrics
total_flow_rate = await db.scalar(
    select(func.sum(Project.project_data['flow_rate_mgd']))
)
```

---

#### 4. Approval Workflow (100% Reusable)
```python
# SHARED CODE (identical for both platforms)

class ApprovalStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    REVISION = "revision"

@router.post("/{proposal_id}/approve")
async def approve_proposal(
    proposal_id: UUID,
    comments: str | None,
    admin: CurrentAdmin,
    db: AsyncDB
):
    proposal.approval_status = ApprovalStatus.APPROVED
    proposal.reviewed_by = admin.id
    proposal.reviewed_at = datetime.utcnow()
    # ... rest identical
```

**Usage:** Exactamente igual en ambas plataformas. El contenido de la propuesta cambia, pero el workflow no.

---

### Frontend Patterns

#### 1. Auth Store with Role
```typescript
// SHARED CODE (lib/stores/auth-store.ts)

interface User {
  id: string;
  email: string;
  role: "field_agent" | "admin";
  department: string | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // ... state
  isAdmin: () => get().user?.role === "admin",
  isFieldAgent: () => get().user?.role === "field_agent",
}));
```

**Usage:** Idéntico en ambas plataformas.

---

#### 2. Dashboard Routing
```typescript
// SHARED CODE (app/dashboard/page.tsx)

export default function DashboardPage() {
  const { isAdmin, isFieldAgent } = useAuthStore();
  
  if (isAdmin()) {
    redirect("/dashboard/admin");
  }
  
  redirect("/dashboard/agent");
}
```

**Usage:** Estructura idéntica. Las páginas `/admin` y `/agent` tienen contenido diferente.

---

#### 3. Admin Dashboard Layout
```typescript
// SHARED STRUCTURE (app/dashboard/admin/page.tsx)

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1>Admin Dashboard</h1>
        <Badge>Admin</Badge>
      </div>
      
      {/* KPI Cards - DIFFERENT METRICS */}
      <TeamStatsCards stats={stats} />
      
      {/* Agent Leaderboard - SAME STRUCTURE */}
      <AgentLeaderboard />
      
      {/* All Projects - SAME TABLE */}
      <AllProjectsTable />
    </div>
  );
}
```

**Waste Platform:**
- KPIs: Total Revenue, Tons Diverted, Waste Streams

**Water Platform:**
- KPIs: Total Revenue, Flow Rate Capacity, Treatment Technologies

---

## 🔀 Platform-Specific Customizations

### Database Schema

#### Shared Tables (identical)
```sql
users (role, department, manager_id)
projects (user_id, status, budget, created_at)
proposals (approval_status, reviewed_by, reviewed_at)
```

#### Platform-Specific Tables

**Waste Platform:**
```sql
companies (industry_type, waste_generation_rate)
locations (facility_type, operational_hours)
project.project_data (JSONB):
  - waste_streams[]
  - upcycling_pathways[]
  - diversion_rate_target
```

**Water Platform:**
```sql
companies (industry_type, water_usage_mgd)
locations (facility_type, peak_demand_mgd)
project.project_data (JSONB):
  - influent_characteristics{}
  - treatment_train[]
  - flow_rate_mgd
  - design_standards
```

---

### API Endpoints

#### Shared Structure
```
/api/v1/
  /auth/                    ✅ Identical
  /projects/                ✅ Same structure, different data
  /proposals/               ✅ Same structure, different AI content
  /admin/
    /team-stats             ⚠️ Same structure, different metrics
    /team-projects          ✅ Identical
    /agent-leaderboard      ✅ Identical
    /approval-queue         ✅ Identical
```

#### Platform-Specific Endpoints

**Waste Platform:**
```
/api/v1/waste-streams/
/api/v1/upcycling-pathways/
```

**Water Platform:**
```
/api/v1/treatment-technologies/
/api/v1/design-calculations/
```

---

### Frontend Components

#### Shared Components (copy to water platform)
```
lib/stores/auth-store.ts           ✅ Identical
lib/api/admin.ts                   ✅ Identical
components/features/admin-dashboard/
  ├── approval-queue.tsx           ✅ Identical
  ├── approval-dialog.tsx          ✅ Identical
  ├── agent-leaderboard.tsx        ✅ Identical
  └── all-projects-table.tsx       ⚠️ Adapt column labels
```

#### Platform-Specific Components

**Waste Platform:**
```
components/features/waste-streams/
components/features/upcycling/
team-stats-cards.tsx (waste metrics)
```

**Water Platform:**
```
components/features/water-quality/
components/features/treatment-design/
team-stats-cards.tsx (water metrics)
```

---

## 📋 Migration Guide: Waste → Water

### Step 1: Copy Core Role System

```bash
# Backend
cp waste-platform/app/models/user.py water-platform/app/models/user.py
cp waste-platform/app/api/dependencies.py water-platform/app/api/dependencies.py
cp waste-platform/alembic/versions/*_add_role_system.py water-platform/alembic/versions/

# Frontend
cp waste-platform/lib/stores/auth-store.ts water-platform/lib/stores/auth-store.ts
cp waste-platform/app/dashboard/page.tsx water-platform/app/dashboard/page.tsx
```

### Step 2: Copy Admin Dashboard Structure

```bash
# Backend
cp waste-platform/app/api/v1/admin.py water-platform/app/api/v1/admin.py

# Frontend
cp -r waste-platform/components/features/admin-dashboard/ \
      water-platform/components/features/admin-dashboard/
```

### Step 3: Adapt Platform-Specific Metrics

**File:** `water-platform/app/api/v1/admin.py`

```python
@router.get("/team-stats")
async def get_team_stats(...):
    # Shared metrics (keep as-is)
    total_projects = ...
    total_revenue = ...
    active_agents = ...
    
    # Replace waste-specific with water-specific
    # OLD (waste):
    # tons_diverted = await db.scalar(
    #     select(func.sum(Project.project_data['tons_per_year']))
    # )
    
    # NEW (water):
    total_flow_capacity = await db.scalar(
        select(func.sum(Project.project_data['flow_rate_mgd']))
    )
    
    return {
        "total_projects": total_projects,
        "total_revenue": total_revenue,
        # ...
        "total_flow_capacity": total_flow_capacity,  # Water-specific
    }
```

### Step 4: Adapt Team Stats Cards

**File:** `water-platform/components/features/admin-dashboard/team-stats-cards.tsx`

```typescript
export default function TeamStatsCards({ stats }: { stats: TeamStats }) {
  return (
    <div className="grid grid-cols-5 gap-6">
      {/* Shared cards (keep) */}
      <Card>
        <CardTitle>Total Revenue</CardTitle>
        <div>{stats.total_revenue}</div>
      </Card>
      
      <Card>
        <CardTitle>Total Projects</CardTitle>
        <div>{stats.total_projects}</div>
      </Card>
      
      <Card>
        <CardTitle>Active Agents</CardTitle>
        <div>{stats.active_agents}</div>
      </Card>
      
      {/* Replace waste-specific with water-specific */}
      <Card>
        <CardTitle>Flow Capacity</CardTitle>
        <div>{stats.total_flow_capacity} MGD</div>  {/* Was: Tons Diverted */}
      </Card>
      
      <Card>
        <CardTitle>Technologies</CardTitle>
        <div>{stats.technology_count}</div>  {/* Was: Waste Streams */}
      </Card>
    </div>
  );
}
```

### Step 5: Copy Approval Workflow (No Changes)

```bash
# Backend
cp waste-platform/alembic/versions/*_add_proposal_approval.py \
   water-platform/alembic/versions/

# Models already updated in Step 1

# Frontend
cp waste-platform/components/features/admin-dashboard/approval-queue.tsx \
   water-platform/components/features/admin-dashboard/
   
cp waste-platform/components/features/admin-dashboard/approval-dialog.tsx \
   water-platform/components/features/admin-dashboard/
```

**No adaptations needed** - approval workflow is domain-agnostic.

---

## 🎨 Customization Points

### 1. KPI Metrics
**Location:** `admin.py` → `get_team_stats()`  
**Change:** Add/remove metrics based on domain

### 2. Project Table Columns
**Location:** `all-projects-table.tsx`  
**Change:** Adapt column labels (e.g., "Waste Type" → "Water Quality")

### 3. Leaderboard Metrics
**Location:** `agent-leaderboard.tsx`  
**Optional:** Add domain-specific metrics (e.g., "Avg Treatment Efficiency")

### 4. Proposal Content Display
**Location:** `approval-dialog.tsx`  
**Change:** Render AI output differently (waste: pathways, water: treatment train)

---

## ✅ Validation Checklist

After porting to water platform:

- [ ] Users have role field
- [ ] Dashboard routes by role (admin vs agent)
- [ ] Field agents see only their projects
- [ ] Admins see all projects with filters
- [ ] Agent leaderboard displays correctly
- [ ] Team stats show water-specific metrics
- [ ] Approval workflow works (submit → approve/reject)
- [ ] Permissions enforced (403 for unauthorized)
- [ ] No breaking changes to water-specific features

---

## 📊 Summary

### 100% Reusable (Copy-Paste)
- User model (role, department, manager_id)
- Role dependencies (CurrentAdmin, require_role)
- Approval workflow (entire flow)
- Auth store (frontend)
- Dashboard routing
- Approval queue UI
- Agent leaderboard structure

### 80% Reusable (Minor Adaptations)
- Admin stats endpoint (change metrics)
- Team stats cards (change card labels)
- All projects table (change column labels)

### Platform-Specific (Build Separately)
- Project data models (waste streams vs water quality)
- AI agent prompts (waste upcycling vs water treatment)
- Domain-specific endpoints (/waste-streams vs /treatment-technologies)

---

## 🚀 Benefits

1. **Faster Development:** Reutilizar 80% del código
2. **Consistent UX:** Ambas plataformas tienen misma experiencia
3. **Easier Maintenance:** Fix once, deploy twice
4. **Proven Patterns:** Sistema ya testado en waste platform
5. **Scalable:** Fácil agregar más roles (supervisor, analyst)

---

## 📚 Next Steps

1. Implementar sistema completo en waste platform (validar patterns)
2. Documentar edge cases y lecciones aprendidas
3. Copiar core components a water platform
4. Adaptar métricas específicas de agua
5. Test end-to-end en ambas plataformas
