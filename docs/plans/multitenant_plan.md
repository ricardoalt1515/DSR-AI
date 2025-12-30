# Plan: Multi-Tenant Architecture con Organizations

## Problema

La plataforma se diseño para uso interno de DSR (single-tenant). Ahora necesita soportar multiples organizaciones (clientes) con aislamiento de datos completo.

## Contexto de Negocio

- **Tu empresa** = Proveedor SaaS (operador de la plataforma)
- **DSR** = Primer cliente/organizacion
- **Futuros clientes** = Mas organizaciones que pagaran por usar la plataforma

```
Tu Empresa (Proveedor SaaS)
    └── Super Admins (organization_id = NULL, is_superuser = true)
            │
            ├── Organizacion: DSR (primer cliente)
            │       └── Usuarios de DSR (org_admin, field_agent, etc.)
            │
            ├── Organizacion: Cliente B (futuro)
            │       └── Usuarios de Cliente B
            │
            └── Organizacion: Cliente C (futuro)
                    └── Usuarios de Cliente C
```

## Solucion

Implementar multi-tenancy mediante un modelo `Organization` que actua como raiz de todos los datos. Cada organizacion tiene sus propios users, companies, locations y projects aislados.

**Nota sobre rutas:** para mantener el doc DRY, los endpoints se describen **sin** el prefijo `settings.API_V1_PREFIX` (hoy: `/api/v1`) a menos que se indique lo contrario.

---

## MVP Multi-Tenant (Scope Explicito)

**Incluido en MVP:**

- Organization model + migracion
- organization_id en todas las tablas (denormalizado)
- FK compuestas para consistencia a nivel BD
- OrganizationContext dependency con header obligatorio
- Filtrado por org en todos los endpoints
- CORS para header X-Organization-Id
- Fix Redis jobs (key + payload con org_id)
- S3: validacion en DB (prefijo por org recomendado, pero puede diferirse)
- Frontend: header, org selector, limpieza de cache

**Diferido (post-MVP):**

- Export/Import ZIP de datos por org
- Auditoria avanzada de accesos cross-org
- Permisos granulares mas alla de org_admin
- (Opcional) Migrar a prefijo S3 por org

---

## Decisiones cerradas (para implementar sin ambiguedad)

- **Roles**
  - **Platform admin**: `role="admin"` ⇄ `is_superuser=true` y `organization_id=NULL`
  - **Tenant admin**: `role="org_admin"`, `is_superuser=false`, `organization_id=<org>`
- **Super admin debe seleccionar org**: en endpoints org-scoped, `is_superuser=true` requiere header `X-Organization-Id` o responde `400`.
- **organization_id nunca viene del payload**: siempre se deriva del contexto (user/header/path).
- **organization_id es inmutable**: no se actualiza ni se “mueve” entre orgs.
- **Redis jobs (MVP)**: visibles solo por el dueño (`user_id`) y siempre scoped por `org_id` + `user_id`; si Redis no esta disponible, endpoints de jobs responden `503` (fail fast).
- **Fail fast en BD (REQUIRED)**: agregar CHECK constraint para evitar estados invalidos en `users` (superuser sin org, usuario normal con org).

---

## Regla Critica: organization_id es INMUTABLE

Una vez asignado, `organization_id` NO debe cambiar. Esto previene:

- Bugs de "mover" datos entre orgs
- Inconsistencias en FK compuestas
- Leaks por estados intermedios

**Aplica a TODAS las tablas:** Company, Location, Project, Proposal, ProjectFile, TimelineEvent

**Implementacion:** Bloquear updates a nivel app (no BD):

```python
# En schemas de update, NO incluir organization_id
class CompanyUpdate(BaseModel):
    name: str | None = None
    industry: str | None = None
    # NO organization_id - inmutable
```

**Cambios de parent tambien deben validar org:**
Si un endpoint permite cambiar parent (ej: mover Location a otro Company), validar que ambos pertenecen a la misma org:

```python
# En update_location, si permite cambiar company_id:
if data.company_id and data.company_id != location.company_id:
    new_company = await db.get(Company, data.company_id)
    if not new_company or new_company.organization_id != org.id:
        raise HTTPException(404, "Company not found")
```

---

## Fase 1: Modelo Organization y Migracion (Backend)

### 1.1 Crear modelo Organization

**Archivo nuevo**: `backend/app/models/organization.py`

```python
class Organization(BaseModel):
    __tablename__ = "organizations"

    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(100), nullable=False, unique=True, index=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    settings = Column(JSONB, default=dict)  # Config flexible por org
    is_active = Column(Boolean, default=True, index=True)

    # Relationships
    users = relationship("User", back_populates="organization")
    companies = relationship("Company", back_populates="organization")
```

### 1.2 Modificar User model

**Archivo**: `backend/app/models/user.py`

- Agregar `organization_id` FK (nullable para super admins)
- Agregar rol `ORG_ADMIN = "org_admin"` al enum `UserRole`
- **IMPORTANTE**: Separar "platform admin" vs "tenant admin":
  - `is_superuser = true` (y `organization_id = NULL`) → admin GLOBAL (tu empresa)
  - `role = org_admin` (y `is_superuser = false`) → admin de UNA org (cliente)
- Actualizar metodos:

  ```python
  def is_global_admin(self) -> bool:
      return self.is_superuser

  def is_org_admin(self) -> bool:
      return self.role == UserRole.ORG_ADMIN

  def can_see_all_org_projects(self) -> bool:
      """Org admin ve todos los proyectos de su org, no solo los suyos."""
      return self.is_superuser or self.role == UserRole.ORG_ADMIN
  ```

### 1.2.1 Modificar UserManager

**Archivo**: `backend/app/core/user_manager.py`

- Mantener una regla simple y consistente (menos código y menos estados invalidos):
  - **Platform admin**: `role=admin` ⇄ `is_superuser=true` y `organization_id=NULL`
  - **Tenant admin**: `role=org_admin`, `is_superuser=false`, `organization_id=<org>`
- Fail-fast: si alguien intenta setear `is_superuser=true` con `organization_id != NULL`, rechazar (esto debe fallar tambien por el CHECK constraint en BD).

### 1.3 Modificar Company model

**Archivo**: `backend/app/models/company.py`

- Agregar `organization_id` FK (NOT NULL)
- Agregar relationship a Organization
- (Opcional pero recomendado) Agregar `UNIQUE(organization_id, name)` para evitar colisiones dentro del mismo tenant

### 1.4 Modificar Location model

**Archivo**: `backend/app/models/location.py`

- Agregar `organization_id` FK (NOT NULL) - DENORMALIZADO para seguridad
- Aunque Location hereda de Company, tener org_id directo previene leaks por JOINs olvidados

### 1.5 Modificar Project model

**Archivo**: `backend/app/models/project.py`

- Agregar `organization_id` FK (NOT NULL) - DENORMALIZADO para seguridad
- Agregar `UNIQUE(id, organization_id)` para permitir FK compuestas desde Proposal/Files
- Mismo razonamiento: un JOIN olvidado no debe causar leak de datos
- **Nota:** hoy `projects.location_id` es nullable (legacy). El FK compuesto `(location_id, organization_id) → locations(id, organization_id)` solo aplica cuando `location_id` no es NULL; aun asi `organization_id` directo mantiene el scoping del tenant.

### 1.6 Modificar Proposal model

**Archivo**: `backend/app/models/proposal.py`

- Agregar `organization_id` FK (NOT NULL) - DENORMALIZADO
- FK compuesta: `(project_id, organization_id)` → `projects(id, organization_id)`

### 1.7 Modificar ProjectFile model

**Archivo**: `backend/app/models/file.py` (NO project_file.py)

- Agregar `organization_id` FK (NOT NULL) - DENORMALIZADO
- FK compuesta: `(project_id, organization_id)` → `projects(id, organization_id)`

### 1.8 Modificar TimelineEvent model

**Archivo**: `backend/app/models/timeline.py`

- Agregar `organization_id` FK (NOT NULL) - DENORMALIZADO
- FK compuesta: `(project_id, organization_id)` → `projects(id, organization_id)`

### 1.9 Migracion de base de datos

**Archivo nuevo**: `backend/alembic/versions/xxx_add_organizations.py`

1. Crear tabla `organizations`
2. Insertar org default "DSR" con UUID fijo
3. Agregar `organization_id` a TODAS las tablas:
   - `users` (nullable para super admins)
   - `companies`, `locations`, `projects` (NOT NULL)
   - `proposals`, `project_files`, `timeline_events` (NOT NULL)
4. Asignar todos los datos existentes a org DSR:
   ```sql
   UPDATE companies SET organization_id = DSR_ID;
   UPDATE locations SET organization_id = DSR_ID;
   UPDATE projects SET organization_id = DSR_ID;
   UPDATE proposals SET organization_id = DSR_ID;
   UPDATE project_files SET organization_id = DSR_ID;
   UPDATE timeline_events SET organization_id = DSR_ID;
   UPDATE users SET organization_id = DSR_ID WHERE is_superuser = false;
   ```
5. Hacer `organization_id` NOT NULL en todas las tablas (excepto users)
6. Crear indices:
   - `CREATE INDEX ix_X_org_id ON X(organization_id)` para cada tabla (paths de listado por tenant)
   - Indices compuestos para FKs (performance de deletes/joins y para evitar sequential scans en cascades):
     ```sql
     CREATE INDEX ix_locations_company_org ON locations(company_id, organization_id);
     CREATE INDEX ix_projects_location_org ON projects(location_id, organization_id);
     CREATE INDEX ix_proposals_project_org ON proposals(project_id, organization_id);
     CREATE INDEX ix_project_files_project_org ON project_files(project_id, organization_id);
     CREATE INDEX ix_timeline_events_project_org ON timeline_events(project_id, organization_id);
     ```
7. Crear unique constraints (solo si los datos lo permiten):
   - `UNIQUE(organization_id, name)` en companies (evita colisiones dentro del mismo tenant)
   - Antes de agregarla, validar que no existan duplicados:
     ```sql
     SELECT organization_id, name, COUNT(*)
     FROM companies
     GROUP BY organization_id, name
     HAVING COUNT(*) > 1;
     ```
   - CHECK constraint (REQUIRED) para fail-fast en `users`:
     ```sql
     ALTER TABLE users
       ADD CONSTRAINT ck_users_org_assignment
       CHECK (
         (is_superuser IS TRUE AND organization_id IS NULL)
         OR
         (is_superuser IS FALSE AND organization_id IS NOT NULL)
       );
     ```
8. **FK Compuestas para garantizar consistencia** (cadena completa):

   ```sql
   -- Company: unique compuesto
   ALTER TABLE companies ADD CONSTRAINT uq_company_id_org UNIQUE (id, organization_id);

   -- Location: FK compuesta → Company
   ALTER TABLE locations ADD CONSTRAINT uq_location_id_org UNIQUE (id, organization_id);
   ALTER TABLE locations ADD CONSTRAINT fk_location_company_org
       FOREIGN KEY (company_id, organization_id) REFERENCES companies(id, organization_id);

   -- Project: FK compuesta → Location
   ALTER TABLE projects ADD CONSTRAINT uq_project_id_org UNIQUE (id, organization_id);
   ALTER TABLE projects ADD CONSTRAINT fk_project_location_org
       FOREIGN KEY (location_id, organization_id) REFERENCES locations(id, organization_id);

   -- Proposal: FK compuesta → Project
   ALTER TABLE proposals ADD CONSTRAINT fk_proposal_project_org
       FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id);

   -- ProjectFile: FK compuesta → Project
   ALTER TABLE project_files ADD CONSTRAINT fk_file_project_org
       FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id);

   -- TimelineEvent: FK compuesta → Project
   ALTER TABLE timeline_events ADD CONSTRAINT fk_timeline_project_org
       FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id);
   ```

**Resultado:** Cadena completa de consistencia. IMPOSIBLE tener datos con org inconsistente.

**Nota (SQLAlchemy/Alembic):** reflejar estas constraints tambien en los modelos con `UniqueConstraint(...)` y `ForeignKeyConstraint(...)` (no solo en SQL del migration) para que:

- El esquema sea auto-documentado por el ORM
- Alembic autogenerate no intente “arreglar” constraints que solo existen en BD
- Sea mas dificil introducir leaks por relaciones mal definidas

---

## Fase 2: Authorization por Organization (Backend)

### 2.1 Crear dependencias de organizacion (con switch org obligatorio)

**Archivo**: `backend/app/api/dependencies.py`

```python
from fastapi import Header, HTTPException

async def get_organization_context(
    current_user: User = Depends(current_active_user),
    x_organization_id: UUID | None = Header(None, alias="X-Organization-Id"),
    db: AsyncSession = Depends(get_async_db),
) -> Organization:
    """
    Obtiene el contexto de organizacion. SIEMPRE retorna una org (nunca None).

    - Usuarios normales: usan su organization_id (ignoran header)
    - Super admins: DEBEN enviar header X-Organization-Id para seleccionar org

    NOTA: Usamos await db.get() en vez de current_user.organization
    para evitar problemas de lazy loading en contexto async.
    """
    # Usuario normal: usar su org (cargar explicitamente, NO usar relationship)
    if not current_user.is_superuser:
        if not current_user.organization_id:
            raise HTTPException(403, "User not assigned to any organization")
        # IMPORTANTE: Cargar org via db.get(), NO current_user.organization
        org = await db.get(Organization, current_user.organization_id)
        if not org or not org.is_active:
            raise HTTPException(403, "User's organization is inactive")
        return org

    # Fail-fast: por CHECK constraint esto no deberia pasar
    if current_user.organization_id is not None:
        raise HTTPException(500, "Invalid admin state")

    # Super admin: DEBE seleccionar org via header
    if x_organization_id is None:
        raise HTTPException(
            400,
            "Super admin must select organization via X-Organization-Id header"
        )

    # Validar que la org existe
    org = await db.get(Organization, x_organization_id)
    if not org or not org.is_active:
        raise HTTPException(404, "Organization not found")

    return org

# SIEMPRE retorna Organization, nunca None
OrganizationContext = Annotated[Organization, Depends(get_organization_context)]

def apply_organization_filter(query, model, org: Organization):
    """Filtra query por organization_id. org nunca es None."""
    return query.where(model.organization_id == org.id)
```

**Endpoints cross-org (excepciones para super admin):**

- `GET /organizations` - Lista todas las orgs (no requiere header)
- `POST /organizations` - Crea org (no requiere header)
- `GET /organizations/{id}` - Detalle de org (no requiere header)

Para estos endpoints, usar dependencia diferente:

```python
async def get_super_admin_only(current_user: User = Depends(current_active_user)) -> User:
    if not current_user.is_superuser:
        raise HTTPException(403, "Super admin only")
    return current_user

SuperAdminOnly = Annotated[User, Depends(get_super_admin_only)]
```

### 2.1.1 CORS para X-Organization-Id

**Archivo**: `backend/app/main.py`

En este repo ya existe `CORSMiddleware` en `backend/app/main.py`.

- Para el MVP, **no es necesario** cambiarlo: `allow_headers=["*"]` ya permite que el browser envie `X-Organization-Id`.
- Importante: **no** agregar un segundo middleware de CORS; solo modificar el existente si hace falta.
- Nota: `expose_headers` solo aplica para leer headers de la **respuesta** desde el browser (no para enviar headers).

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)
```

**NOTA:** En settings, `CORS_ORIGINS` es string y `cors_origins_list` es la lista parseada.

### 2.2 Regla critica: organization_id NUNCA del payload

**En todos los endpoints de crear/actualizar:**

```python
@router.post("/companies")
async def create_company(
    data: CompanyCreate,  # NO tiene organization_id
    org: OrganizationContext,  # Viene del header/user
    db: AsyncDB,
):
    # organization_id SIEMPRE se deriva del contexto, NUNCA del payload
    company = Company(**data.model_dump(), organization_id=org.id)
    ...
```

**Schemas de creacion NO deben incluir organization_id:**

```python
class CompanyCreate(BaseModel):
    name: str
    industry: str
    # NO organization_id - se deriva del contexto
```

### 2.3 Actualizar endpoints de Companies

**Archivo**: `backend/app/api/v1/companies.py`

- `list_companies`: Filtrar por org context
- `create_company`: Asignar `organization_id = org.id` (del contexto)
- `get_company`, `update_company`, `delete_company`: Verificar pertenencia a org

**NOTA (Locations endpoints en companies.py):**

- `GET /companies/locations` debe filtrar por `Location.organization_id == org.id` (ademas de `company_id` opcional).
- Endpoints nested (`/{company_id}/locations`) deben validar que el Company pertenece a la org antes de crear/listar.
- Endpoints por `location_id` deben validar pertenencia a org (404 si no pertenece).

### 2.4 Actualizar endpoints de Projects

**Archivo**: `backend/app/api/v1/projects.py`

**Cambio critico en autorizacion:**
Actualmente usa `Project.user_id == current_user.id` (linea ~91 en dependencies.py).
Con org_admin esto rompe. Nueva logica:

```python
# 1. Siempre filtrar por org primero
query = query.where(Project.organization_id == org.id)

# 2. Luego filtrar por usuario SI no es admin de org
if not current_user.can_see_all_org_projects():
    query = query.where(Project.user_id == current_user.id)
```

**Validacion en create_project (CRITICO):**
Al crear Project, validar que Location pertenece a la org del contexto:

```python
@router.post("/projects")
async def create_project(
    data: ProjectCreate,  # Incluye location_id
    org: OrganizationContext,
    db: AsyncDB,
):
    # Validar que Location existe Y pertenece a la org
    location = await db.execute(
        select(Location).where(
            Location.id == data.location_id,
            Location.organization_id == org.id  # CRITICO: validar pertenencia
        )
    )
    if not location.scalar_one_or_none():
        raise HTTPException(404, "Location not found")  # 404, no 403 (no leak info)

    project = Project(**data.model_dump(), organization_id=org.id)
    ...
```

**Mismo patron aplicar en:**

- `create_location`: Validar que Company pertenece a org
- Cualquier endpoint que referencie un recurso padre

**Tambien actualizar:**

- `backend/app/api/dependencies.py` - `get_accessible_project` (linea ~131)
- `backend/app/services/project_data_service.py` - validaciones de user_id

**DRY: hacer `ProjectDep` org-aware (recomendado):**

- Cambiar `get_accessible_project` para que reciba `org: OrganizationContext` y aplique `Project.organization_id == org.id` siempre.
- Aplicar `Project.user_id` solo si el usuario NO es `org_admin`.
- Reusar `ProjectDep` en `project_data.py`, `files.py`, y cualquier endpoint que reciba `project_id` para evitar duplicar condiciones.

### 2.5 Actualizar endpoints de Proposals/Files

**Archivos**: `backend/app/api/v1/proposals.py`, etc.

- Ahora tienen `organization_id` directo
- Filtrar directamente: `Proposal.organization_id == org.id`
- NO necesitan JOIN con Project para filtrar

### 2.6 Crear API de Organizations

**Archivo nuevo**: `backend/app/api/v1/organizations.py`

Endpoints **cross-org** (usan `SuperAdminOnly`, no `OrganizationContext`):

- `GET /organizations` - Listar todas
- `POST /organizations` - Crear nueva
- `GET /organizations/{id}` - Detalle
- (Diferido) `GET /organizations/{id}/export` - Exportar datos

Endpoints **org-scoped** (usan `OrganizationContext`):

- `GET /organizations/current` - Obtener org actual del contexto

### 2.7 Storage y Background Jobs

**Storage (S3):**

- **Seguridad (MVP):** validar en DB que el archivo pertenece a la org del contexto (via `ProjectFile.organization_id` o via `ProjectDep` + join).
- (Opcional) **Prefijo recomendado:** `/{organization_id}/projects/{project_id}/files/...` (facilita export/politicas), pero **no confiar** en el prefijo para auth.
- Para presigned URLs / downloads, aplicar el mismo scoping por org antes de generar el URL.

**Background Jobs:**

- Propagar `organization_id` a todos los jobs
- Validar que el job opera dentro de la org correcta

### 2.8 FIX: Job Status en Redis (LEAK actual)

**Archivo**: `backend/app/services/cache_service.py`

**Problema actual:** Key `job:{job_id}` sin org_id. Cualquiera que conozca el job_id puede ver status.

**Nota:** En el backend actual, `job_id` es un string (ej. `job_abc123...`), no un UUID.

**Decision MVP:** Jobs solo visibles por el dueno (opcion A, mas simple). Org admin NO ve jobs de otros users.

**Fail fast:** Si Redis no esta disponible, el polling de jobs no es confiable. En endpoints de jobs, responder 503 (service unavailable) en vez de devolver datos vacios.

**Solucion (API clara + doble validacion):**

**Evitar magic numbers:** mover `ttl=3600` a `settings` (ej. `JOB_STATUS_TTL_SECONDS`) para no repetir constantes y facilitar tuning.

**Archivo**: `backend/app/core/config.py`

Agregar setting (y opcionalmente env var):

```python
JOB_STATUS_TTL_SECONDS: int = 3600
```


1. **Reemplazar API en CacheService (sin shims / sin backwards-compat):**

- Renombrar / cambiar firma de `set_job_status` y `get_job_status` a versiones scoped que **obligan** `org_id` + `user_id`.
- Actualizar todos los callsites (principalmente `backend/app/services/proposal_service.py` y `backend/app/api/v1/proposals.py`).
- Remover helpers viejos sin scoping para evitar que alguien los use por accidente en el futuro.

```python
# NUEVO: API clara con org_id y user_id obligatorios
async def set_job_status_scoped(
    self,
    org_id: UUID,
    user_id: UUID,
    job_id: str,
    status: dict,
    ttl: int = settings.JOB_STATUS_TTL_SECONDS,
) -> None:
    """Set job status con scoping por org y user."""
    key = f"job:{org_id}:{user_id}:{job_id}"
    # Inyectar org/user en payload para doble validacion
    status["organization_id"] = str(org_id)
    status["user_id"] = str(user_id)
    if not self._redis:
        raise RuntimeError("Redis not connected")
    await self._redis.setex(key, ttl, json.dumps(status))

async def get_job_status_scoped(
    self,
    org_id: UUID,
    user_id: UUID,
    job_id: str,
) -> dict | None:
    """Get job status validando org y user."""
    key = f"job:{org_id}:{user_id}:{job_id}"
    if not self._redis:
        raise RuntimeError("Redis not connected")
    data = await self._redis.get(key)
    if not data:
        return None
    status = json.loads(data)
    # Doble validacion
    if status.get("organization_id") != str(org_id):
        return None
    return status
```

2. **Actualizar endpoint existente:**
   **Archivo**: `backend/app/api/v1/proposals.py`
   **NOTA:** El endpoint actual es `GET /ai/proposals/jobs/{job_id}`, NO crear ruta nueva.

```python
# Modificar el endpoint existente, no crear uno nuevo
@router.get("/jobs/{job_id}")
async def get_job_status(
    job_id: str,
    org: OrganizationContext,
    user: CurrentUser,
):
    try:
        job_data = await cache_service.get_job_status_scoped(
            org_id=org.id,
            user_id=user.id,
            job_id=job_id,
        )
    except RuntimeError as exc:
        raise HTTPException(503, "Job status unavailable") from exc

    if not job_data:
        raise HTTPException(404, "Job not found")
    return job_data
```

3. **Actualizar ProposalService (call sites):**

- `start_proposal_generation(...)`: ahora debe recibir `org_id` (o derivarlo del `Project` ya filtrado por org) y usar `set_job_status_scoped`.
- `generate_proposal_async(...)`: todas las llamadas a `set_job_status(...)` deben cambiar a `set_job_status_scoped(...)` con el mismo `org_id` + `user_id`.
- `get_job_status(job_id)`: debe recibir `org_id` + `user_id` (o se vuelve un wrapper llamado desde el endpoint).

### 2.9 Crear API de User Provisioning

**Actualizar schemas de usuario (para multi-tenant):**

- En `backend/app/schemas/user_fastapi.py`, agregar `organization_id: UUID | None` al `UserRead` (platform admins lo tienen `null`).
- Mantener `UserUpdate` sin `organization_id` (inmutable).
- Para provisioning, usar schemas separados para no abrir vector de org_id en `POST /auth/register` (si algun dia se habilita):
  - `OrgUserCreateRequest` (request model) **NO incluye** `organization_id`
  - `OrgUserCreate` (internal, server-only) incluye `organization_id` para pasarlo a `user_manager.create(...)`

**Archivo nuevo (schemas provisioning):** `backend/app/schemas/org_user.py`

```python
import uuid
from pydantic import BaseModel, Field, EmailStr

from app.schemas.user_fastapi import UserCreate
from app.models.user import UserRole

class OrgUserCreateRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    first_name: str
    last_name: str
    role: str = Field(default=UserRole.FIELD_AGENT.value)

class OrgUserCreate(UserCreate):
    organization_id: uuid.UUID
    role: str = Field(default=UserRole.FIELD_AGENT.value)
    is_superuser: bool = False
```


**Archivo**: `backend/app/api/v1/organizations.py`

Como `AUTH_ENABLE_REGISTRATION=false`, necesitas endpoints para crear usuarios.

**CRITICO:** NO crear usuarios con `User(**data.model_dump())` - esto rompe FastAPI Users (passwords en claro). Usar `UserManager.create()`:

```python
from app.core.user_manager import get_user_manager
from app.schemas.org_user import OrgUserCreateRequest, OrgUserCreate

@router.post("/{org_id}/users", response_model=UserRead)
async def create_org_user(
    org_id: UUID,
    data: OrgUserCreateRequest,  # email, password, first_name, last_name, role
    admin: SuperAdminOnly,
    db: AsyncDB,
    user_manager: UserManager = Depends(get_user_manager),
):
    """Super admin crea usuario asignado a una org."""
    org = await db.get(Organization, org_id)
    if not org:
        raise HTTPException(404, "Organization not found")

    # Construir schema interno (org_id viene del path, NO del payload)
    user_create = OrgUserCreate(
        **data.model_dump(),  # sin organization_id
        organization_id=org.id,  # Inyectar org del path
        is_superuser=False,  # provisioning crea usuarios tenant, no platform admins
    )

    # USAR UserManager para hashear password correctamente
    user = await user_manager.create(user_create)
    return user
```

**Flujo de onboarding de cliente:**

1. Super admin crea org via `POST /organizations`
2. Super admin crea usuario org_admin via `POST /organizations/{org_id}/users`
3. Org admin puede crear mas usuarios de su org (si se habilita)

### 2.10 Admin Users endpoints (cross-org)

**Archivo**: `backend/app/api/v1/admin_users.py`

**Estado actual (OK):** este router ya esta protegido con `CurrentSuperUser` (solo super admins de plataforma).

**Ajustes multi-tenant (para evitar leaks y estados invalidos):**

- Mantener `/admin/users` como endpoints **cross-org** SOLO para super admins de plataforma (`is_superuser=true`, `organization_id=NULL`).
- Evitar crear/editar tenant users via `/admin/users` para no introducir usuarios sin org o “mover” usuarios entre orgs. Para crear usuarios tenant usar `POST /organizations/{org_id}/users`.
- (Recomendado / fail-fast) En `POST /admin/users` y `PATCH /admin/users/{user_id}`:
  - Si el request intenta crear un usuario `is_superuser=false` → devolver `400` con mensaje claro (“use org provisioning endpoint”).
  - Si el request intenta modificar `organization_id` (si existiera en schema) → `400`.

**Nuevo endpoint org-scoped (si lo necesitas para UI tenant-admin):**

- `GET /organizations/current/users` (solo `org_admin` / super admin con `OrganizationContext`)

---

## Fase 3: Frontend Integration

### 3.1 Actualizar tipos

**Objetivo (DRY):** Definir el tipo `User` y `UserRole` en **un solo lugar** y reutilizarlo en `auth.ts`, `admin-users.ts`, context y UI.

**Decision:** Crear archivo dedicado de tipos.

**Archivo nuevo:** `frontend/lib/types/user.ts`

- `export type UserRole = ...`
- `export interface User = ...` (agregar `organizationId: string | null`)

**Archivos a modificar**:

- `frontend/lib/api/auth.ts` - importar `User` y `UserRole` desde `frontend/lib/types/user.ts`
- `frontend/lib/api/admin-users.ts` - importar `User` y `UserRole` desde `frontend/lib/types/user.ts`

- Agregar `organizationId: string | null` a `User`:
  - Tenant users: siempre viene con valor (por CHECK constraint)
  - Platform admins: siempre `null`
- `organization.name`/`slug` se obtienen via `GET /organizations/current` y se guardan en `organization-store` (no duplicarlos en `User`)
- Agregar rol `org_admin` a UserRole (string)

### 3.2 Actualizar Auth Context

**Archivo**: `frontend/lib/contexts/auth-context.tsx`

- Mantener el auth context enfocado en auth (no duplicar org data):
  - `user.organizationId` existe (desde `User`)
  - `currentOrganization` vive en `organization-store`
- Agregar helpers: `isOrgAdmin`, `isSuperAdmin`

### 3.3 Crear Organization Store

**Archivo nuevo**: `frontend/lib/stores/organization-store.ts`

**Dependencias:** este store usa endpoints de `backend/app/api/v1/organizations.py` (org-scoped y cross-org para superadmin).

**Decision (MVP):** NO crear `frontend/lib/api/organizations.ts`.

- Para MVP, llamar `apiClient` directamente desde `organization-store.ts` (menos archivos, menos boilerplate).
- Si mas adelante hay 2+ consumers o crecen los endpoints de org, extraer `OrganizationsAPI` en un refactor.

```typescript
interface Organization {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

interface OrganizationState {
  currentOrganization: Organization | null;
  organizations: Organization[]; // Solo para super admins

  // Super admin: seleccionar org activa
  selectedOrgId: string | null; // Persistido en localStorage

  loadCurrentOrganization: () => Promise<void>;
  loadOrganizations: () => Promise<void>;
  selectOrganization: (orgId: string) => void;
}
```

### 3.4 Actualizar API Client para enviar header

**Archivo**: `frontend/lib/api/client.ts`

**NOTA:** El cliente actual es un wrapper de fetch (linea ~82), NO Axios.
Modificar la funcion `request` o crear wrapper:

```typescript
// En frontend/lib/api/client.ts
async function request<T>(
  url: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  // Agregar token de auth (ya existe)
  const token = localStorage.getItem("access_token");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // NUEVO: Agregar X-Organization-Id si existe
  // SIMPLIFICADO: No chequeamos si es super admin, solo enviamos si existe
  // El backend decide que hacer con el header segun el tipo de usuario
  const selectedOrgId = localStorage.getItem("selected_org_id");
  if (selectedOrgId) {
    headers.set("X-Organization-Id", selectedOrgId);
  }

  // ... resto del fetch
}
```

**Por que simplificado?**

- El backend ignora el header para usuarios normales (usa su organization_id)
- No necesitamos parsear "user" de localStorage
- Menos logica en frontend = menos bugs

### 3.5 Actualizar Navbar con Org Selector

**Archivo**: `frontend/components/shared/layout/navbar.tsx`

- Usuarios normales: Mostrar nombre de su org (solo lectura)
- Super admins: Dropdown para seleccionar org activa
  - Si no hay org seleccionada, mostrar "Select Organization" como placeholder
  - Guardar seleccion en localStorage (`selected_org_id`)

### 3.6 FIX: Limpiar Cache UI al cambiar org (LEAK potencial)

**Archivos**:

- `frontend/lib/stores/company-store.ts`
- `frontend/lib/stores/location-store.ts`
- `frontend/lib/stores/project-store.ts`
- `frontend/lib/contexts/auth-context.tsx` (funcion `clearUserData`)

**Problema actual:** Los stores persistidos (`waste-company-store`, `waste-location-store`) no se limpian al hacer switch de org. Un super admin veria datos de la org anterior.

**Solucion A (Simple):** Limpiar todos los stores al cambiar org:

1. **Usar nombre consistente `resetStore()` en todos los stores:**

**NOTA:** `project-store` ya tiene `resetStore()`, pero `company-store` y `location-store` NO.

```typescript
// Agregar a company-store.ts
resetStore: () => {
  set((state) => {
    state.companies = [];
    state.currentCompany = null;
    state.loading = false;
    state.error = null;
  });
  localStorage.removeItem("waste-company-store");
};

// Agregar a location-store.ts
resetStore: () => {
  set((state) => {
    state.locations = [];
    state.currentLocation = null;
    state.loading = false;
    state.error = null;
  });
  localStorage.removeItem("waste-location-store");
};
```

2. **Llamar resetStore en org switch:**

```typescript
// En organization-store.ts
selectOrganization: (orgId: string) => {
  // Limpiar stores de datos
  useCompanyStore.getState().resetStore();
  useLocationStore.getState().resetStore();
  useProjectStore.getState().resetStore();

  // Guardar nueva org
  set({ selectedOrgId: orgId });
  localStorage.setItem("selected_org_id", orgId);
};
```

3. **En logout, limpiar tambien selected_org_id:**

```typescript
// En auth-context.tsx, funcion logout/clearUserData:
localStorage.removeItem("selected_org_id");
// Ademas de los stores existentes
```

**Keys de localStorage a limpiar:**

- `waste-company-store`
- `waste-location-store`
- `h2o-project-store` (si existe filtros)
- `selected_org_id` (en logout)

**Solucion B (Namespacing):** Keys de localStorage por org - mas complejo, no necesario para MVP.

**Recomendacion:** Solucion A es mas simple y suficiente para el caso de uso.

---

## Fase 4: Export de Datos (Portabilidad) - DIFERIDA

> **NOTA**: Esta fase NO es critica para el MVP. Se puede implementar despues de que
> el multi-tenancy basico este funcionando. Prioridad: Fases 1-3 primero.

### 4.1 Endpoint de export (posterior)

**Archivo**: `backend/app/api/v1/organizations.py`

`GET /organizations/{id}/export`:

- Genera ZIP con JSONs de: org, users, companies, locations, projects, proposals
- Solo super admins pueden exportar

### 4.2 Documentar formato de import (posterior)

Para cuando un cliente quiera su propia instancia, documentar como importar el ZIP en una BD limpia.

---

## Archivos a Modificar (Resumen)

### Backend (crear)

- `backend/app/models/organization.py`
- `backend/app/api/v1/organizations.py`
- `backend/alembic/versions/xxx_add_organizations.py`

### Backend (modificar - Modelos)

- `backend/app/models/__init__.py` - Exportar Organization
- `backend/app/models/user.py` - organization_id FK, org_admin role
- `backend/app/models/company.py` - organization_id FK, unique constraints
- `backend/app/models/location.py` - organization_id FK (denormalizado)
- `backend/app/models/project.py` - organization_id FK, UNIQUE(id, org_id)
- `backend/app/models/proposal.py` - organization_id FK, FK compuesta
- `backend/app/models/file.py` - organization_id FK, FK compuesta (NO project_file.py)
- `backend/app/models/timeline.py` - organization_id FK, FK compuesta

### Backend (modificar - API)

- `backend/app/api/dependencies.py` - OrganizationContext con header X-Organization-Id
- `backend/app/api/v1/companies.py` - Filtrar por org (incluye endpoints de locations)
- `backend/app/api/v1/projects.py` - Filtrar por org + logica org_admin
- `backend/app/api/v1/proposals.py` - Filtrar por org + fix job status
- `backend/app/api/v1/files.py` - Reusar `ProjectDep` org-aware + filtrar por org en queries de ProjectFile
- `backend/app/api/v1/project_data.py` - Reusar `ProjectDep` org-aware (evitar duplicar checks)
- `backend/app/api/v1/admin_users.py` - Mantener cross-org solo superadmin; tenant users via organizations provisioning
- `backend/app/main.py` - Registrar router `organizations` (no agregar segundo CORS middleware)

### Backend (crear - Schemas)

- `backend/app/schemas/org_user.py` - Schemas para provisioning (OrgUserCreate, etc.)

### Backend (modificar - Schemas)

- `backend/app/schemas/user_fastapi.py` - Agregar `organization_id: UUID | None` a `UserRead` (no agregarlo a `UserUpdate`)

### Backend (modificar - Core/Services)

- `backend/app/core/user_manager.py` - Ajustar normalizacion role/is_superuser + fail-fast para org_id en superusers
- `backend/app/core/config.py` - Agregar `JOB_STATUS_TTL_SECONDS` (evitar magic numbers)
- `backend/app/services/cache_service.py` - Keys de job con org_id
- `backend/app/services/proposal_service.py` - Propagar org_id en job status (set/get) + validaciones
- `backend/app/services/project_data_service.py` - Actualizar validaciones de acceso

### Frontend (crear)

- `frontend/lib/types/user.ts` - Single source of truth para `User` + `UserRole`
- `frontend/lib/stores/organization-store.ts`
- (Opcional, post-MVP) `frontend/lib/api/organizations.ts` - API client para organizations (list/current) si hay 2+ consumers

### Frontend (modificar)

- `frontend/lib/api/auth.ts` - Agregar campos de org a `User` + mapear desde `/auth/me`
- `frontend/lib/api/admin-users.ts` - Agregar campos de org a `User` (transformUser)
- `frontend/lib/api/client.ts` - Agregar header `X-Organization-Id` (fetch wrapper)
- `frontend/lib/contexts/auth-context.tsx` - Agregar org context + limpiar `selected_org_id` en logout
- `frontend/components/shared/layout/navbar.tsx` - Org selector para super admins
- `frontend/lib/api/index.ts` - Re-export `User`/`UserRole` desde `frontend/lib/types/user.ts` (ya no desde `auth.ts`)
- `frontend/lib/stores/index.ts` - Exportar `organization-store` (para imports consistentes)

---

## Tests de Aislamiento (Minimos para no romper produccion)

**Archivo**: `backend/tests/test_multi_tenant.py`

Casos criticos que DEBEN pasar antes de deploy:

```python
# 1. Aislamiento entre orgs - COMPANIES
async def test_user_org_a_cannot_see_companies_org_b():
    """User de Org A NO ve companies de Org B."""
    ...

# 2. Aislamiento entre orgs - LOCATIONS (leak tipico actual)
async def test_user_org_a_cannot_see_locations_org_b():
    """User de Org A NO ve locations de Org B."""
    # NOTA: Hoy `/companies/locations` lista TODAS las locations (debe filtrar por org)
    ...

# 3. Aislamiento entre orgs - PROJECTS
async def test_user_org_a_cannot_see_projects_org_b():
    """User de Org A NO ve projects de Org B."""
    ...

# 4. Org admin ve todo su org
async def test_org_admin_sees_all_projects_in_org():
    """Org admin ve proyectos de otros users de su org."""
    ...

# 5. Super admin sin header = 400
async def test_superadmin_without_header_gets_400():
    """Super admin sin X-Organization-Id recibe 400 en endpoints org-scoped."""
    response = await client.get("/api/v1/companies", headers={"Authorization": f"Bearer {superadmin_token}"})
    assert response.status_code == 400
    assert "select organization" in response.json()["detail"].lower()

# 6. Job status no filtra cross-org
async def test_job_status_not_leaked_cross_org():
    """User de Org A NO puede ver job de Org B."""
    ...

# 7. Create con recurso padre de otra org = 404
async def test_create_project_with_location_from_other_org():
    """Crear project con location de otra org retorna 404."""
    ...

async def test_create_location_with_company_from_other_org():
    """Crear location con company de otra org retorna 404."""
    ...
```

**Prioridad:** Estos tests evitan "regresiones silenciosas" donde un cambio rompe el aislamiento.

**IMPORTANTE:** El test de locations es critico porque HOY `/companies/locations` lista TODAS las locations sin filtrar.

---

## Orden de Implementacion

1. **Backend: Modelo y migracion** (Organization, User, Company, Location, Project, etc.)
2. **Backend: Dependencies** (OrganizationContext + ProjectDep org-aware)
3. **Backend: Endpoints companies** (patron de referencia)
4. **Backend: Endpoints de locations** (en `companies.py`, aplicar mismo patron)
5. **Backend: Endpoints projects** (patron + validacion create + logica org_admin)
6. **Backend: API organizations** (CRUD + user provisioning con UserManager)
7. **Backend: Admin users + org users endpoint** (mantener `/admin/users` cross-org solo superadmin + agregar `/organizations/current/users` si lo requiere la UI)
8. **Backend: Fix Redis jobs** (API scoped; reemplazar funciones sin scoping)
9. **Frontend: Tipos y auth context**
10. **Frontend: Store y UI** (resetStore en todos los stores)
11. **Testing: Tests de aislamiento** (companies, locations, projects, jobs)

---

## Consideraciones

### Jerarquia de Roles

| Rol                      | organization_id | is_superuser | Acceso                                      |
| ------------------------ | --------------- | ------------ | ------------------------------------------- |
| Super Admin (tu empresa) | NULL            | true         | Ve TODAS las orgs, crea orgs, gestiona todo |
| Org Admin (cliente)      | org.id          | false        | Ve todo dentro de su org                    |
| Field Agent, Sales, etc. | org.id          | false        | Ve sus propios recursos dentro de su org    |

### Denormalizacion de organization_id (Seguridad)

Todos los modelos tienen `organization_id` directo, aunque sea "redundante":

- **Company**: `organization_id` FK (fuente de verdad)
- **Location**: `organization_id` FK (denormalizado de Company)
- **Project**: `organization_id` FK (denormalizado de Location)

**Por que denormalizar?**

- Un JOIN olvidado NO debe causar leak de datos
- Queries mas simples: `WHERE organization_id = X` en vez de JOINs
- Filtro uniforme en todos los endpoints
- Patrón usado por Slack, Notion, y otros SaaS multi-tenant

### Migracion de Datos Existentes

1. Se crea org "DSR" como primer cliente
2. Todos los datos existentes (companies, locations, projects) se asignan a DSR
3. **Super admins (tu y developer)**: `is_superuser=true`, `organization_id=NULL`
4. **Otros usuarios existentes**: Se asignan a DSR con rol apropiado (org_admin o field_agent)

**Nota**: Solo tu y el developer deben ser super admins. Es un rol con acceso total.

## Reutilizabilidad

Este codigo es generico y puede reutilizarse en el proyecto de ingenieros de agua sin cambios. Los unicos cambios seran renombrar terminos de dominio (waste -> water).

## Decisiones Tecnicas y Trade-offs

### Super Admin con org explicita (switch obligatorio)

**Decision:** Super admin DEBE seleccionar org via header `X-Organization-Id`

- Sin header → 400 "Must select organization"
- Previene leaks accidentales incluso con bugs en listados
- UI con dropdown para seleccionar org activa
- Endpoints cross-org (`/organizations`) son excepciones explicitas con `SuperAdminOnly`

### Roles (platform vs tenant)

**Decision:** Mantener un modelo simple:

- `role="admin"` ⇄ `is_superuser=true` y `organization_id=NULL`
- `role="org_admin"` y `is_superuser=false` (siempre con `organization_id=<org>`)

### Autorizacion por org_admin (cambio critico)

**Decision:** org_admin ve todos los proyectos de su org, no solo los suyos

- Actual: `Project.user_id == current_user.id`
- Nuevo: `if org_admin: Project.organization_id == org.id`
- Afecta: dependencies.py, projects.py, project_data_service.py

### organization_id NUNCA del payload

**Decision:** Siempre derivar del contexto (usuario o header)

- Schemas de creacion NO incluyen organization_id
- El backend asigna org.id del OrganizationContext
- Previene ataques donde cliente intenta asignar org de otro

### FK Compuestas (cadena completa)

**Decision:** FK compuestas en TODA la cadena

```
Organization → Company → Location → Project → Proposal/Files/Timeline
```

- Cada nivel tiene `UNIQUE(id, organization_id)` para permitir FK del siguiente
- Imposible violar consistencia a nivel de BD
- Sin triggers, sin codigo de validacion que mantener

### Denormalizacion completa

**Decision:** organization_id en TODOS los modelos (no solo los padres)

- Company, Location, Project, Proposal, ProjectFile, TimelineEvent
- Un JOIN olvidado no causa leak
- Queries simples: `WHERE organization_id = X`
- Trade-off: datos redundantes (aceptable para seguridad)

### Fixes de seguridad identificados

- **Redis jobs:** Keys `job:{org_id}:{user_id}:{job_id}` + validacion en endpoint
- **S3 storage:** Prefijo por org + validacion en endpoints
- **Frontend cache:** Limpiar stores al cambiar org (switch)

---

## Referencias (dic 2025)

- FastAPI Users — PyPI (versiones / releases): https://pypi.org/project/fastapi-users/
- FastAPI Users — Schemas: https://fastapi-users.github.io/fastapi-users/latest/configuration/schemas/
- FastAPI Users — SQLAlchemy (async): https://fastapi-users.github.io/fastapi-users/latest/configuration/databases/sqlalchemy/
- FastAPI Users — UserManager: https://fastapi-users.github.io/fastapi-users/latest/configuration/user-manager/
- Starlette — CORSMiddleware: https://www.starlette.io/middleware/#corsmiddleware
- SQLAlchemy 2.0 — Constraints / ForeignKeyConstraint (composite FK): https://docs.sqlalchemy.org/20/core/constraints.html
