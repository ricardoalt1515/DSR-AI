# Dual-Role System - Executive Summary

> **Quick overview of the complete dual-role implementation plan**

---

## 🎯 What We're Building

A **role-based access control system** that separates:

**Field Agents** (Vendedores móviles)
- On-site data collection
- Generate AI proposals
- See only THEIR projects
- Submit proposals for review

**Admins** (Gerentes de supervisión)
- View ALL team data
- Review/approve proposals
- Track team performance
- Manage workflow

---

## 📊 Implementation Plan

| Phase | Duration | Priority | Deliverable |
|-------|----------|----------|-------------|
| **Phase 1: Roles** | 1 día | 🔴 CRITICAL | Users con roles, dashboard routing |
| **Phase 2: Admin Dashboard** | 2-3 días | 🔴 CRITICAL | KPIs, todos los proyectos, leaderboard |
| **Phase 3: Approval** | 2 días | 🟡 IMPORTANTE | Approve/reject workflow |
| **Testing & Polish** | 1 día | 🟢 FINAL | E2E tests, bug fixes |
| **TOTAL** | **6-7 días** | | Sistema completo |

---

## 🏗️ Architecture Changes

### Database
```sql
-- New fields
users:
  + role (field_agent | admin)
  + department
  + manager_id (self-FK)

proposals:
  + approval_status (draft | submitted | approved | rejected)
  + reviewed_by (FK users)
  + reviewed_at
  + review_comments

-- New indexes (performance)
CREATE INDEX ix_users_role ON users(role);
CREATE INDEX ix_projects_user_status ON projects(user_id, status);
CREATE INDEX ix_proposals_approval_status ON proposals(approval_status);
```

### API Routes
```
/api/v1/
  /projects/              (now filtered by role)
  /proposals/
    POST /{id}/submit     ← NEW
    POST /{id}/approve    ← NEW (admin only)
    POST /{id}/reject     ← NEW (admin only)
  /admin/                 ← NEW ROUTER
    GET /team-stats
    GET /team-projects
    GET /agent-leaderboard
    GET /approval-queue
```

### Frontend Routes
```
/dashboard → redirects by role:
  ├── /dashboard/agent   (field agent view)
  └── /dashboard/admin   (admin view with team data)
```

---

## 🔑 Key Features

### Phase 1: Foundation
✅ Users have `role` field  
✅ Dashboard routes by role  
✅ Field agents see only their data  
✅ Admins can access `/admin/*` endpoints  

### Phase 2: Admin Dashboard
✅ Team KPIs (revenue, projects, agents)  
✅ View ALL projects with search/filters  
✅ Agent leaderboard (ranked by revenue)  
✅ Professional UI with charts  

### Phase 3: Approval Workflow
✅ Field agents submit proposals for review  
✅ Admins see approval queue  
✅ Approve/reject with feedback  
✅ Agents can revise and resubmit  
✅ Timeline tracks all actions  

---

## 💡 Design Highlights

### 1. Reusable Architecture
- **80% del código** es reutilizable para water platform
- Patterns genéricos, contenido específico

### 2. Performance First
- Índices compuestos para queries rápidas
- Eager loading evita N+1 queries
- Paginación en todas las listas

### 3. Security Built-In
- Role-based dependencies (`CurrentAdmin`)
- Permission checks en cada endpoint
- Field agents can't see other's data

### 4. Extensible
- Fácil agregar roles (`supervisor`, `analyst`)
- Approval workflow soporta versiones
- Timeline events para audit trail

---

## 📁 Key Files

### Backend Core
```
app/models/user.py              # User model + roles
app/api/dependencies.py         # CurrentAdmin dependency
app/api/v1/admin.py             # Admin endpoints (NEW)
app/api/v1/proposals.py         # Approval endpoints
alembic/versions/
  ├── *_add_role_system.py      # Phase 1 migration
  └── *_add_proposal_approval.py # Phase 3 migration
```

### Frontend Core
```
lib/stores/auth-store.ts        # Auth with role
lib/api/admin.ts                # Admin API client (NEW)
app/dashboard/
  ├── page.tsx                  # Role-based router
  ├── agent/page.tsx            # Field agent dashboard
  └── admin/page.tsx            # Admin dashboard (NEW)
components/features/admin-dashboard/
  ├── team-stats-cards.tsx
  ├── agent-leaderboard.tsx
  ├── all-projects-table.tsx
  ├── approval-queue.tsx
  └── approval-dialog.tsx
```

---

## 🚀 Getting Started

### 1. Review Documentation
- [ ] Read `DUAL_ROLE_OVERVIEW.md` - Architecture
- [ ] Read `DUAL_ROLE_PHASE_1.md` - Role system details
- [ ] Read `DUAL_ROLE_REUSABILITY.md` - How to reuse in water platform

### 2. Validate Approach
- [ ] Confirm user personas match your needs
- [ ] Review database schema changes
- [ ] Check if approval workflow fits your process

### 3. Start Implementation
- [ ] Follow `DUAL_ROLE_CHECKLIST.md` step by step
- [ ] Start with Phase 1 (critical foundation)
- [ ] Test thoroughly after each phase

---

## 🎯 Success Criteria

### After Phase 1 (Day 1)
- Login as admin → redirects to `/dashboard/admin`
- Login as field agent → redirects to `/dashboard/agent`
- Field agent sees only their projects
- Admin can access `/admin/team-stats` (field agent gets 403)

### After Phase 2 (Day 4)
- Admin dashboard shows team KPIs
- Admin can search/filter all projects
- Leaderboard displays top agents
- Performance is good (< 2s load time)

### After Phase 3 (Day 6)
- Field agents can submit proposals
- Admins see approval queue
- Approve/reject workflow works
- Timeline events track actions

### Final (Day 7)
- All E2E tests pass
- UI is polished and mobile-friendly
- Ready for production deployment
- Documentation complete

---

## 🔄 Reusability for Water Platform

### Shared (Copy-Paste)
- User model with roles ✅
- Role dependencies ✅
- Approval workflow ✅
- Auth store ✅
- Dashboard routing ✅
- Approval queue UI ✅

### Adapt (Minor Changes)
- Admin stats endpoint (different metrics)
- Team stats cards (different labels)
- Project table columns (domain-specific)

### Build Separately
- Domain models (waste vs water data)
- AI prompts (waste upcycling vs water treatment)
- Domain endpoints (waste-streams vs treatment-technologies)

**Estimated port time:** 2-3 días (vs 6-7 días from scratch)

---

## 📊 Cost-Benefit Analysis

### Time Investment
- **Now:** 6-7 días para waste platform
- **Later:** 2-3 días para water platform
- **Total:** 9-10 días para ambas plataformas

### Alternative (Build Separately)
- **Waste:** 6-7 días
- **Water:** 6-7 días
- **Total:** 12-14 días

### Savings
- **Time saved:** 3-4 días (30% reduction)
- **Consistency:** Same UX en ambas plataformas
- **Maintenance:** Fix once, deploy twice

---

## ⚠️ Critical Considerations

### 1. Migration Strategy
- **First user becomes admin** by default
- Confirm this is correct, or specify admin email
- Existing projects stay with original owners

### 2. Permission Model
- Admins can **view** all projects
- Admins **cannot edit** other's projects (only owner can)
- Admins **can delete** any project (supervisor role)

### 3. Approval Workflow
- Proposals start as **draft** (auto-saved)
- Agent must **submit** for review
- Admin can **approve** or **reject** with feedback
- Agent can **revise** rejected proposals

### 4. Performance
- Indexes are critical (50+ agents, 1000+ projects)
- Eager loading prevents N+1 queries
- Pagination required for large lists

---

## 🎬 Next Steps

### Option A: Start Implementation Now
1. Review Phase 1 details
2. Create first migration
3. Update User model
4. Test role-based routing
5. Move to Phase 2

### Option B: Review & Adjust First
1. Discuss with team
2. Adjust requirements if needed
3. Create custom specs document
4. Get approval
5. Start implementation

---

## 📚 Document Index

- **DUAL_ROLE_OVERVIEW.md** - High-level architecture
- **DUAL_ROLE_PHASE_1.md** - Role system (detailed)
- **DUAL_ROLE_PHASE_2_SHORT.md** - Admin dashboard (condensed)
- **DUAL_ROLE_PHASE_3.md** - Approval workflow (detailed)
- **DUAL_ROLE_CHECKLIST.md** - Implementation checklist
- **DUAL_ROLE_REUSABILITY.md** - Reuse guide for water platform
- **DUAL_ROLE_SUMMARY.md** - This document

---

## 💬 Questions?

Common questions to consider:

**Q: Can we add more roles later (supervisor, analyst)?**  
A: Yes, the system is designed for easy role expansion.

**Q: Can admins also be field agents?**  
A: Not in the current design, but can be added.

**Q: What about notification when proposal approved?**  
A: Phase 3.5 (optional) - email/push notifications.

**Q: How long are proposals in the queue?**  
A: You can add SLA tracking (submitted_at → reviewed_at).

**Q: Can we bulk-approve proposals?**  
A: Not in MVP, but easy to add later.

---

## ✅ Ready to Proceed?

Si estás listo para empezar:
1. Confirm Phase 1 approach
2. I can create the first migration
3. We implement step-by-step together

Si necesitas ajustes:
1. Tell me what to change
2. I'll update the specs
3. We review again before starting
