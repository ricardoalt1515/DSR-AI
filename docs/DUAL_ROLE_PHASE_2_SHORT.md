# Phase 2: Admin Dashboard (Condensed)

> **Duration:** 2-3 days  
> **Priority:** 🔴 CRITICAL

---

## Backend: Admin Router

Create `/backend/app/api/v1/admin.py` with:

### Endpoints:
1. `GET /admin/team-stats` - KPIs (revenue, projects, agents)
2. `GET /admin/team-projects` - All projects with filters
3. `GET /admin/agent-leaderboard` - Top performers
4. `GET /admin/agents` - List of agents (for filters)

### Key Features:
- All endpoints protected with `CurrentAdmin` dependency
- Support pagination, search, filters, sorting
- Return aggregated metrics across team
- Include agent info in project responses

### Register in `main.py`:
```python
from app.api.v1 import admin
app.include_router(admin.router, prefix="/api/v1")
```

---

## Frontend Components

### 1. Admin API Client (`lib/api/admin.ts`)
```typescript
export class AdminAPI {
  static async getTeamStats(days: number): Promise<TeamStats>
  static async getTeamProjects(params): Promise<ProjectSummary[]>
  static async getAgentLeaderboard(days, limit): Promise<AgentStats[]>
  static async getAllAgents(): Promise<UserRead[]>
}
```

### 2. Team Stats Cards (`components/features/admin-dashboard/team-stats-cards.tsx`)
- Total Revenue card
- Recent Revenue card
- Total Projects card
- Active Agents card
- Avg Deal Size card

### 3. Agent Leaderboard (`components/features/admin-dashboard/agent-leaderboard.tsx`)
- Ranked list of top agents
- Metrics: revenue, project count, avg progress
- Time window selector (7/30/90 days)

### 4. All Projects Table (`components/features/admin-dashboard/all-projects-table.tsx`)
- Searchable/filterable table
- Filters: search, agent, status
- Pagination
- Links to project details

### 5. Admin Dashboard Page (`app/dashboard/admin/page.tsx`)
```typescript
- Time window selector
- TeamStatsCards component
- Tabs: Overview / Leaderboard / All Projects
- AgentLeaderboard component
- AllProjectsTable component
```

---

## Testing Checklist

### Backend:
- [ ] Admin can access all endpoints
- [ ] Field agent gets 403 on admin endpoints
- [ ] Team stats return correct aggregations
- [ ] Filters/search work correctly
- [ ] Leaderboard ranks by revenue

### Frontend:
- [ ] Admin dashboard loads without errors
- [ ] Stats cards display correct numbers
- [ ] Leaderboard shows agents
- [ ] Project table is searchable/filterable
- [ ] Pagination works
- [ ] Links navigate correctly

---

## File References

Full implementation details in:
- Backend code: See Phase 2 task breakdowns
- Frontend components: See component examples
- Test scripts: See testing section

Key patterns are reusable for water platform.
