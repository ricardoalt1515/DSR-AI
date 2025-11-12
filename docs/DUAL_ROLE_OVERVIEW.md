# Dual-Role System - Overview & Architecture

> **Version:** 1.0  
> **Target Platforms:** Waste Platform + H2O Allegiant (Water)  
> **Design Philosophy:** Build once, deploy twice

---

## 📋 Executive Summary

Sistema de roles para separar **Field Agents** (vendedores móviles) de **Admins** (gerentes de supervisión).

**Beneficios:**
- Field agents solo ven sus proyectos → enfoque en ventas
- Admins ven todo el equipo → supervisión y aprobaciones
- Arquitectura reutilizable para ambas plataformas

---

## 🎯 User Personas

### Field Agent (`field_agent`)
- **Contexto:** On-site en empresas (móvil)
- **Tareas:**
  - Registrar companies, locations, assessments
  - Capturar datos técnicos
  - Generar propuestas con IA
  - Enviar propuestas para revisión
- **Scope:** Solo **SUS** proyectos
- **Ejemplo:** Vendedor visitando plantas industriales

### Admin (`admin`)
- **Contexto:** Oficina (desktop)
- **Tareas:**
  - Ver **TODOS** los proyectos de **TODOS** los agentes
  - Aprobar/rechazar propuestas
  - Ver KPIs del equipo (revenue, conversión)
  - Leaderboard de agentes
- **Scope:** **TODO** en la organización
- **Ejemplo:** Gerente regional supervisando 10 vendedores

### Roles Futuros (No MVP)
- `supervisor`: Manager intermedio (ve subset de agentes)
- `analyst`: Solo lectura para BI
- `super_admin`: Gestión de usuarios, config

---

## 🏗️ Cambios de Arquitectura

### Database Schema

```
users
├── id (existing)
├── email
├── role ←NEW (field_agent | admin)
├── department ←NEW (Sales, Operations, etc.)
└── manager_id ←NEW (FK self-referencing)

projects
├── user_id (FK users) ← Agent owner
├── status
└── INDEX (user_id, status) ←NEW for performance

proposals
├── project_id (FK)
├── approval_status ←NEW (draft | submitted | approved | rejected)
├── reviewed_by ←NEW (FK users - admin who reviewed)
├── reviewed_at ←NEW
├── review_comments ←NEW
└── submitted_at ←NEW (for SLA tracking)
```

### API Routes

```
/api/v1/
├── auth/              (sin cambios)
├── projects/          (ahora filtrado por role)
├── proposals/         (+ approval endpoints)
│   ├── POST /{id}/submit
│   ├── POST /{id}/approve    ← Admin only
│   └── POST /{id}/reject     ← Admin only
└── admin/             ←NEW router
    ├── GET /team-stats
    ├── GET /team-projects    (todos los agentes)
    ├── GET /agent-leaderboard
    └── GET /approval-queue
```

### Frontend Routes

```
/dashboard → redirige según role:

├── [field_agent] → /dashboard/agent
│   ├── Stats personales
│   ├── Mis companies/locations
│   └── Mis propuestas (con status de review)
│
└── [admin] → /dashboard/admin
    ├── KPIs del equipo
    ├── Todos los proyectos (searchable, filterable)
    ├── Approval queue
    └── Agent leaderboard
```

---

## 📊 Implementation Phases

| Fase | Duración | Prioridad | Deliverable |
|------|----------|-----------|-------------|
| **1: Role System** | 1 día | 🔴 CRÍTICO | Users con role, dashboard routing |
| **2: Admin Dashboard** | 2-3 días | 🔴 CRÍTICO | Vista de equipo completo, KPIs |
| **3: Approval Workflow** | 2 días | 🟡 IMPORTANTE | Aprobar/rechazar propuestas |
| **Testing & Polish** | 1 día | 🟢 FINAL | E2E tests, UX refinements |
| **TOTAL** | **6-7 días** | | Sistema completo |

---

## 🔑 Key Design Decisions

### 1. Role-Based Access Control (RBAC)

**Patrón:** Dependency injection para roles
```python
# Backend
CurrentAdmin = Annotated[User, Depends(require_role("admin"))]

@router.get("/admin/team-stats")
async def get_team_stats(admin: CurrentAdmin):
    # Solo admins pueden acceder
```

**Beneficio:** Type-safe, fácil de extender (agregar `supervisor`, etc.)

### 2. Performance Indexes

**Índices compuestos para queries comunes:**
```sql
CREATE INDEX ix_projects_user_status ON projects(user_id, status);
CREATE INDEX ix_projects_created_desc ON projects(created_at DESC);
CREATE INDEX ix_proposals_approval_created ON proposals(approval_status, created_at);
```

**Por qué:** Con 50+ agentes y 1000+ proyectos, queries sin índices serían lentas.

### 3. Approval Status Flow

```
draft → submitted → [approved | rejected] → revision → submitted
  ↑                                            ↓
  └────────────── agent can re-work ──────────┘
```

**Estados:**
- `draft`: Agent editando
- `submitted`: Listo para admin review
- `approved`: Admin aprobó (puede enviar a cliente)
- `rejected`: Admin rechazó con comentarios
- `revision`: Agent re-trabajando después de rechazo

### 4. Soft Relationships (manager_id)

```python
# User model
manager_id: Mapped[UUID | None]  # Self-referencing FK

manager: Mapped["User | None"] = relationship(...)
direct_reports: Mapped[list["User"]] = relationship(...)
```

**Beneficio futuro:** Supervisors pueden ver solo sus direct_reports.

---

## 🔄 Reusability Strategy

### Shared Patterns (Waste + Water)

**Backend:**
- Same `User` model (role, department, manager_id)
- Same `CurrentAdmin` dependency
- Same approval workflow (proposals/reports)
- Same admin endpoints structure

**Frontend:**
- Same auth store logic
- Same role-based routing pattern
- Same admin dashboard layout
- Diferencia: domain-specific content

### Platform-Specific

**Waste Platform:**
- Projects = waste assessments
- Proposals = upcycling feasibility reports
- Metrics: tons diverted, revenue from waste streams

**Water Platform:**
- Projects = water treatment designs
- Proposals = engineering proposals
- Metrics: flow rate, treatment train specs, CAPEX/OPEX

---

## 📁 File Organization

```
backend/
├── app/
│   ├── models/
│   │   ├── user.py          ← Add role, department, manager_id
│   │   └── proposal.py      ← Add approval fields
│   ├── api/
│   │   ├── dependencies.py  ← Add CurrentAdmin
│   │   └── v1/
│   │       ├── admin.py     ← NEW: Admin endpoints
│   │       ├── projects.py  ← UPDATE: Role filtering
│   │       └── proposals.py ← UPDATE: Approval endpoints
│   └── alembic/versions/
│       └── YYYYMMDD_add_role_system.py  ← Migration

frontend/
├── app/
│   └── dashboard/
│       ├── page.tsx          ← Router by role
│       ├── agent/
│       │   └── page.tsx      ← Field agent dashboard
│       └── admin/
│           └── page.tsx      ← Admin dashboard
├── components/features/
│   └── admin-dashboard/      ← NEW: Admin components
│       ├── team-stats-cards.tsx
│       ├── all-projects-table.tsx
│       ├── agent-leaderboard.tsx
│       └── approval-queue.tsx
└── lib/
    ├── stores/
    │   └── auth-store.ts     ← UPDATE: Add role
    └── api/
        └── admin.ts          ← NEW: Admin API client
```

---

## 🎯 Success Metrics

**Phase 1 Complete:**
- ✅ Users have role field in DB
- ✅ `/dashboard` routes correctly by role
- ✅ Field agents see only their projects
- ✅ Admins can access new `/admin/*` endpoints

**Phase 2 Complete:**
- ✅ Admin dashboard shows team KPIs
- ✅ Admins can view ALL projects with filters
- ✅ Agent leaderboard displays top performers
- ✅ Performance indexes prevent slow queries

**Phase 3 Complete:**
- ✅ Proposals have approval workflow
- ✅ Admins can approve/reject with comments
- ✅ Field agents see review status
- ✅ Timeline events track approval history

---

## 📚 Reference Documents

- **Phase 1 Details:** `DUAL_ROLE_PHASE_1.md`
- **Phase 2 Details:** `DUAL_ROLE_PHASE_2.md`
- **Phase 3 Details:** `DUAL_ROLE_PHASE_3.md`
- **Implementation Checklist:** `DUAL_ROLE_CHECKLIST.md`
- **Testing Guide:** `DUAL_ROLE_TESTING.md`

---

## 🚀 Next Steps

1. Review este overview con el equipo
2. Aprobar arquitectura antes de empezar
3. Comenzar con Phase 1 (foundation crítica)
4. Validar con usuarios reales después de Phase 2
5. Iterar basado en feedback
