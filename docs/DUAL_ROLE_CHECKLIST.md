# Dual-Role System - Implementation Checklist

> Use este documento para trackear el progreso de implementación

---

## ✅ Phase 1: Role System Foundation (1 día)

### Backend
- [ ] **Migration** `20241107_add_role_system.py`
  - [ ] Add `role`, `department`, `manager_id` to users
  - [ ] Set first user as admin
  - [ ] Create indexes (ix_users_role, ix_projects_user_status, etc.)
  - [ ] Run `alembic upgrade head`
  - [ ] Verify in psql: `\d users`

- [ ] **User Model** (`app/models/user.py`)
  - [ ] Create `UserRole` enum
  - [ ] Add role, department, manager_id fields
  - [ ] Add manager/direct_reports relationships
  - [ ] Add helper methods (is_admin, can_view_project, etc.)
  - [ ] Test imports: `from app.models.user import User, UserRole`

- [ ] **Dependencies** (`app/api/dependencies.py`)
  - [ ] Create `require_role()` factory function
  - [ ] Define `CurrentAdmin` type alias
  - [ ] Test: admin can access, field agent gets 403

- [ ] **Schemas** (`app/schemas/user.py`)
  - [ ] Add `role`, `department`, `manager_id` to UserRead
  - [ ] Create AdminUserUpdate schema (for role changes)

- [ ] **Projects Endpoint** (`app/api/v1/projects.py`)
  - [ ] Update GET /projects with role-based filtering
  - [ ] Add permission check in GET /projects/{id}
  - [ ] Test: field agent sees only theirs, admin sees all

### Frontend
- [ ] **Auth Store** (`lib/stores/auth-store.ts`)
  - [ ] Add `role`, `department` to User interface
  - [ ] Add `isAdmin()`, `isFieldAgent()` helpers
  - [ ] Test localStorage persistence

- [ ] **Dashboard Routing** (`app/dashboard/page.tsx`)
  - [ ] Redirect by role (admin → /admin, agent → /agent)
  - [ ] Test with both user types

- [ ] **Field Agent Dashboard** (`app/dashboard/agent/page.tsx`)
  - [ ] Rename existing dashboard component
  - [ ] Add "Field Agent" badge
  - [ ] Verify stats show only user's projects

- [ ] **Admin Dashboard Placeholder** (`app/dashboard/admin/page.tsx`)
  - [ ] Create placeholder with "Coming Soon" message
  - [ ] Add "Admin" badge

### Testing
- [ ] Run backend: `docker-compose up`
- [ ] Login as admin → redirects to /dashboard/admin
- [ ] Login as field agent → redirects to /dashboard/agent
- [ ] Field agent API call returns only their projects
- [ ] Admin API call returns all projects
- [ ] Field agent trying admin endpoint → 403

---

## ✅ Phase 2: Admin Dashboard (2-3 días)

### Backend
- [ ] **Admin Router** (`app/api/v1/admin.py`)
  - [ ] Create new file with admin router
  - [ ] Implement GET /team-stats
  - [ ] Implement GET /team-projects (with filters)
  - [ ] Implement GET /agent-leaderboard
  - [ ] Implement GET /agents
  - [ ] All endpoints use `CurrentAdmin` dependency

- [ ] **Register Router** (`app/main.py`)
  - [ ] Import admin router
  - [ ] Register: `app.include_router(admin.router, prefix="/api/v1")`

- [ ] **Test Endpoints**
  - [ ] GET /admin/team-stats returns correct KPIs
  - [ ] GET /admin/team-projects with search filter works
  - [ ] GET /admin/team-projects with agent_id filter works
  - [ ] GET /admin/agent-leaderboard ranks by revenue
  - [ ] GET /admin/agents returns list of field agents
  - [ ] Field agent gets 403 on all admin endpoints

### Frontend
- [ ] **Admin API Client** (`lib/api/admin.ts`)
  - [ ] Create AdminAPI class
  - [ ] Implement getTeamStats()
  - [ ] Implement getTeamProjects()
  - [ ] Implement getAgentLeaderboard()
  - [ ] Implement getAllAgents()
  - [ ] Define TypeScript interfaces

- [ ] **Team Stats Cards** (`components/features/admin-dashboard/team-stats-cards.tsx`)
  - [ ] Create component with 5 KPI cards
  - [ ] Display: total revenue, recent revenue, projects, agents, avg deal size
  - [ ] Use Lucide icons
  - [ ] Style with Tailwind

- [ ] **Agent Leaderboard** (`components/features/admin-dashboard/agent-leaderboard.tsx`)
  - [ ] Fetch and display top agents
  - [ ] Show: rank, name, revenue, projects, progress
  - [ ] Add time window selector (7/30/90 days)
  - [ ] Handle loading and empty states

- [ ] **All Projects Table** (`components/features/admin-dashboard/all-projects-table.tsx`)
  - [ ] Create searchable/filterable table
  - [ ] Add filters: search, agent, status
  - [ ] Implement pagination
  - [ ] Add sorting options
  - [ ] Link to project detail pages

- [ ] **Admin Dashboard Page** (`app/dashboard/admin/page.tsx`)
  - [ ] Replace placeholder with real dashboard
  - [ ] Add time window selector
  - [ ] Render TeamStatsCards
  - [ ] Add tabs (Overview, Leaderboard, Projects)
  - [ ] Render AgentLeaderboard
  - [ ] Render AllProjectsTable

### Testing
- [ ] Admin dashboard loads without errors
- [ ] Stats cards show correct numbers
- [ ] Leaderboard displays agents with metrics
- [ ] Projects table is searchable
- [ ] Filters work (agent, status, search)
- [ ] Pagination works
- [ ] Click project row → navigates to detail
- [ ] Time window changes update stats

---

## ✅ Phase 3: Approval Workflow (2 días)

### Backend
- [ ] **Migration** (`20241107_add_proposal_approval.py`)
  - [ ] Add approval_status, reviewed_by, reviewed_at, review_comments, submitted_at
  - [ ] Create indexes (ix_proposals_approval_status, etc.)
  - [ ] Run migration
  - [ ] Verify fields exist

- [ ] **Proposal Model** (`app/models/proposal.py`)
  - [ ] Create ApprovalStatus enum
  - [ ] Add approval fields
  - [ ] Add reviewer relationship
  - [ ] Add helper methods (review_time_hours, can_be_submitted, etc.)

- [ ] **Approval Endpoints** (`app/api/v1/proposals.py`)
  - [ ] POST /{id}/submit (field agent submits)
  - [ ] POST /{id}/approve (admin approves)
  - [ ] POST /{id}/reject (admin rejects with comments)
  - [ ] POST /{id}/revise (agent starts revision)
  - [ ] All create timeline events

- [ ] **Admin Queue Endpoint** (`app/api/v1/admin.py`)
  - [ ] GET /approval-queue (returns submitted proposals)
  - [ ] Order by submitted_at (FIFO)
  - [ ] Include project and agent info

- [ ] **Update Schemas** (`app/schemas/proposal.py`)
  - [ ] Add approval fields to ProposalDetail
  - [ ] Add reviewer relationship

### Frontend
- [ ] **Proposals API** (`lib/api/proposals.ts`)
  - [ ] Add submit() method
  - [ ] Add approve() method
  - [ ] Add reject() method
  - [ ] Add startRevision() method

- [ ] **Approval Queue** (`components/features/admin-dashboard/approval-queue.tsx`)
  - [ ] Fetch and display pending proposals
  - [ ] Show project name, agent, submission date
  - [ ] "Review" button opens dialog
  - [ ] Badge shows count

- [ ] **Approval Dialog** (`components/features/admin-dashboard/approval-dialog.tsx`)
  - [ ] Display proposal content (AI output)
  - [ ] Textarea for comments
  - [ ] Approve button (comments optional)
  - [ ] Reject button (comments required)
  - [ ] Handle loading states
  - [ ] Show success/error toasts

- [ ] **Proposal Status Badge** (`components/features/proposals/proposal-status-badge.tsx`)
  - [ ] Display status badge (draft, submitted, approved, rejected, revision)
  - [ ] Show admin feedback for rejected proposals
  - [ ] Use appropriate colors/icons

- [ ] **Field Agent - Submit Button**
  - [ ] Add "Submit for Review" button to proposal page
  - [ ] Disable if already submitted/approved
  - [ ] Call ProposalsAPI.submit()
  - [ ] Show success message

### Testing
- [ ] Field agent generates proposal → status = draft
- [ ] Field agent clicks "Submit for Review" → status = submitted
- [ ] Admin sees proposal in approval queue
- [ ] Admin opens approval dialog → sees content
- [ ] Admin approves with optional comments → status = approved
- [ ] Admin rejects with comments → status = rejected
- [ ] Field agent sees "Needs Revision" badge + feedback
- [ ] Field agent clicks "Start Revision" → status = revision
- [ ] Field agent resubmits → status = submitted (back in queue)
- [ ] Timeline events created for all actions
- [ ] Permissions: field agent can't approve, admin can't submit

---

## 🧪 Testing & Polish (1 día)

### End-to-End Testing
- [ ] **Happy Path: Field Agent**
  - [ ] Register/login → redirects to /dashboard/agent
  - [ ] Create company/location/project
  - [ ] Generate AI proposal → status = draft
  - [ ] Submit for review → status = submitted
  - [ ] See "Pending Review" badge

- [ ] **Happy Path: Admin**
  - [ ] Login → redirects to /dashboard/admin
  - [ ] See team KPIs (revenue, projects, agents)
  - [ ] View agent leaderboard
  - [ ] Search/filter all projects
  - [ ] Open approval queue → see pending proposal
  - [ ] Approve proposal → field agent sees "Approved" badge

- [ ] **Rejection Flow**
  - [ ] Admin rejects proposal with comments
  - [ ] Field agent sees feedback
  - [ ] Field agent starts revision
  - [ ] Field agent resubmits
  - [ ] Admin approves

### Performance Testing
- [ ] Load admin dashboard with 100+ projects → < 2s
- [ ] Search projects → instant results
- [ ] Agent leaderboard with 50+ agents → < 1s
- [ ] Check query counts (avoid N+1)

### Permission Testing
- [ ] Field agent tries GET /admin/team-stats → 403
- [ ] Field agent tries POST /{other_user_project}/approve → 403
- [ ] Admin tries to edit field agent's project → 403 (only view)
- [ ] Deleted user's projects still visible to admin

### UI/UX Polish
- [ ] All loading states work (spinners)
- [ ] Empty states have helpful messages
- [ ] Error messages are user-friendly
- [ ] Toast notifications for actions
- [ ] Mobile responsive (especially field agent views)
- [ ] Consistent styling (shadcn/ui)

---

## 📚 Documentation

- [ ] **DUAL_ROLE_OVERVIEW.md** - Architecture overview
- [ ] **DUAL_ROLE_PHASE_1.md** - Role system implementation
- [ ] **DUAL_ROLE_PHASE_2.md** - Admin dashboard implementation
- [ ] **DUAL_ROLE_PHASE_3.md** - Approval workflow implementation
- [ ] **DUAL_ROLE_CHECKLIST.md** - This file ✅
- [ ] Update main README.md with role system info
- [ ] Add API documentation for admin endpoints

---

## 🚀 Deployment

### Waste Platform
- [ ] Run all migrations on production DB
- [ ] Manually set initial admin users
- [ ] Deploy backend (ECR → ECS)
- [ ] Deploy frontend (Amplify)
- [ ] Verify role routing works
- [ ] Test with real users

### H2O Allegiant (Water Platform)
- [ ] Copy role system files
- [ ] Adapt User model (same structure)
- [ ] Adapt admin dashboard (water-specific metrics)
- [ ] Adapt approval workflow (engineering proposals)
- [ ] Run migrations
- [ ] Deploy

---

## 📊 Success Criteria

### Phase 1
✅ Users have roles  
✅ Dashboard routes correctly  
✅ Field agents see only their data  
✅ Admins can access admin endpoints

### Phase 2
✅ Admin dashboard shows team KPIs  
✅ Admins can view/search all projects  
✅ Agent leaderboard displays performance  
✅ UI is professional and usable

### Phase 3
✅ Proposals have approval workflow  
✅ Admins can approve/reject with feedback  
✅ Field agents see review status  
✅ Timeline tracks all actions

### Overall
✅ System is reusable for water platform  
✅ Performance is good (indexes work)  
✅ Permissions are secure  
✅ UX is intuitive for both roles  
✅ No breaking changes to existing features

---

## 💡 Future Enhancements (Post-MVP)

- [ ] **Notifications**: Email/push when proposals need review
- [ ] **Supervisor Role**: Mid-level manager (sees subset of team)
- [ ] **Analytics**: Charts for revenue trends, conversion rates
- [ ] **Bulk Actions**: Approve multiple proposals at once
- [ ] **Proposal Comments**: Thread of feedback (not just final comment)
- [ ] **Audit Log**: Full history of who did what when
- [ ] **Export**: CSV/Excel export of team data
- [ ] **Mobile App**: Native app for field agents
