# Core Standardization Plan (H2O Allegiant + DSR)

## Context

Hoy existen dos líneas de producto que nacieron del mismo código: H2O Allegiant y DSR. El copy/paste inicial permitió avanzar rápido, pero los cambios posteriores (modelo Company→Location→Project, roles, mejoras de IA, endpoints distintos) hacen que portar features entre repositorios sea costoso y propenso a errores.

Objetivo inmediato: definir un **core único** (backend + frontend) que soporte tanto:
- DSR: jerarquía Company→Location→Assessment (Project) y roles operativos (compliance/sales).
- H2O: proyectos “planos” (sin forzar Companies/Locations) y un set de roles más simple.

La meta no es diseñar multi-tenant completo todavía, sino fijar un estándar de core que **evite forks**.

## Goals (non-negotiables)

- Un solo core compartido, sin bifurcar lógica por producto.
- Un solo esquema de BD (con reglas de validación configurables).
- Misma API base para ambos productos (misma forma de “Projects CRUD” y “AI Jobs Polling”).
- Un sistema de autorización que no dependa de nombres de roles específicos del cliente.
- UX consistente: “Project OS” con tabs estándar y generación de propuestas vía jobs.

## Non-goals (por ahora)

- Multi-tenant real en una misma BD.
- Cobros, procurement, integraciones externas.
- Rediseñar outputs de agentes (eso puede evolucionar después).

---

## Standard 1: Project Management adaptable (Hierarchy Modes)

### Core entities (estándar)

Mantener estas entidades como core:
- `Company`
- `Location` (`company_id`)
- `Project` (assessment / proyecto)
- `Proposal`, `ProjectFile`, `TimelineEvent`, `User`

### Regla de core: `Project` soporta dos modos

Definir un “modo de jerarquía” por despliegue:
- `PROJECT_HIERARCHY_MODE = "hierarchical" | "flat"`

La BD y los endpoints se mantienen iguales; lo que cambia es la validación y la UX.

#### Modo hierarchical (DSR)

- `Project.location_id` es **requerido**.
- `Project.client/Project.location` (texto) se rellenan por conveniencia (computed o heredado) pero el source of truth es `Location → Company`.
- El dashboard y filtros soportan `company_id` y `location_id`.
- UI expone Companies/Locations y la creación de Project exige seleccionar Location.

#### Modo flat (H2O)

- `Project.location_id` es **opcional**.
- `Project.client` y `Project.location` se usan como campos de texto “planos” (sin exigir FK).
- UI oculta Companies/Locations; el wizard de Project solo pide `name`, `client` y `location` (texto).

### Decisión de diseño (recomendada)

**No cambiar el esquema por producto.** Usar un solo modelo `Project` con `location_id` nullable (ya existe en DSR) y reglas por modo.

Esto evita:
- duplicar endpoints y stores
- migraciones incompatibles entre productos
- lógica condicional dispersa

### API contract estándar (Create Project)

Un solo endpoint: `POST /api/v1/projects`

Payload permitido según modo:

**Hierarchical**
```json
{
  "location_id": "uuid",
  "name": "Assessment name",
  "description": "optional"
}
```

**Flat**
```json
{
  "name": "Project name",
  "client": "Client name (text)",
  "location": "Site/location (text)",
  "description": "optional"
}
```

Regla:
- Si `mode=hierarchical`: rechazar si falta `location_id`.
- Si `mode=flat`: aceptar sin `location_id`; `client/location` texto se vuelven obligatorios (o se definen defaults).

Nota: el core puede mantener `client/location` “legacy” como campos de compatibilidad interna, pero en modo flat pasan a ser parte normal del flujo.

### Server-side invariants (para no crear inconsistencias)

- Si `project.location_id != null` entonces:
  - `project.company_name` y `project.location_name` vienen de relaciones (ya existen como properties).
  - `project.client/location` texto no se usan para lógica (solo display/legacy).
- Si `project.location_id == null` entonces:
  - `project.client` y `project.location` son el source of truth (modo flat).
  - Filtros por `company_id/location_id` no aplican.

### UI invariants

El frontend no “deduce” el modo mirando datos sueltos; debe tener una config clara:
- `NEXT_PUBLIC_PROJECT_HIERARCHY_MODE` (o un endpoint `/config` simple).

UX:
- hierarchical: mostrar Companies/Locations, filtros por Company, breadcrumbs Company→Location→Project.
- flat: ocultar Companies/Locations, filtros por `client/location` texto (search).

---

## Standard 2: Roles y autorización (Capability-based RBAC)

### Problema a resolver

Los nombres de roles cambian entre DSR y H2O (y cambiarán con otros clientes). Si el core usa `if role == "compliance"` se vuelve imposible de reutilizar sin forks.

### Solución: capabilities first

Definir un set de **capabilities core** (acciones) y mapear roles a capabilities por despliegue.

Ejemplos de capabilities core (no exhaustivo):
- `admin`
- `projects:create`
- `projects:read`
- `projects:update`
- `projects:delete`
- `companies:manage`
- `locations:manage`
- `files:upload`
- `files:delete`
- `proposals:generate`
- `proposals:read`
- `proposals:delete`
- `reviews:compliance`
- `reviews:logistics`
- `sales:validate`

Regla:
- El backend autoriza por capabilities.
- Los roles se vuelven un “alias” configurable.

### Mappings recomendados por producto (ejemplo)

DSR:
- `field_agent` → `projects:create/read/update`, `files:upload`, `proposals:generate/read`
- `compliance` → `projects:read`, `proposals:read`, `reviews:compliance`
- `sales` → `projects:read`, `proposals:read`, `sales:validate`
- `admin` → todo

H2O:
- `engineer` (o `field_agent`) → `projects:create/read/update`, `files:upload`, `proposals:generate/read`
- `admin` → todo

### Implementación recomendada (mínima y limpia)

Backend:
- Mantener `users.role` como string.
- Añadir función central `get_capabilities(user) -> set[str]` basada en config.
- Exponer `capabilities` en `/auth/me` (ideal para que FE oculte/muestre UI sin duplicar lógica).

Frontend:
- Usar `user.capabilities` para gatear navegación, botones y rutas.
- No gatear por nombres de rol.

---

## Standard 3: Configuración de producto (sin multi-tenant todavía)

Sin multi-tenant real, el core necesita “product config” por despliegue.

Config mínima:
- `PROJECT_HIERARCHY_MODE`
- `ROLE_CAPABILITIES_MAP`
- Flags UI: `SHOW_COMPANIES_UI` (derivado de hierarchy), `ENABLE_COMPLIANCE_REVIEW`, etc.

Recomendación: centralizar config en backend (`settings`) y exponer un endpoint read-only:
- `GET /api/v1/config` → `{ projectHierarchyMode, features, uiHints }`

Así el frontend no depende solo de env vars y puedes mantener consistencia.

---

## Implementation Plan (pasos sugeridos)

### Paso 0: Decisiones finales

1) Definir `PROJECT_HIERARCHY_MODE` para DSR y H2O.
2) Definir lista de capabilities core y mapping inicial por producto.
3) Definir el contrato final de `POST /projects` (payload plano vs jerárquico).

### Paso 1: Backend config + endpoint `/config`

- Añadir setting(s) para:
  - `PROJECT_HIERARCHY_MODE`
  - `ROLE_CAPABILITIES_MAP` (o archivo JSON cargado por env)
- Exponer `GET /api/v1/config` para consumo del frontend.

### Paso 2: Validación de create/update Project según modo

- En `POST /projects`:
  - hierarchical: exigir `location_id` y heredar campos.
  - flat: permitir `location_id=null` y aceptar `client/location` texto.
- En list filters:
  - si flat, ignorar `company_id/location_id` (o devolver 400 si se mandan).

### Paso 3: Capabilities en backend + exponer en `/auth/me`

- Implementar `get_capabilities(user)` y usarlo en endpoints sensibles.
- Exponer `capabilities` en `UserRead` para FE.

### Paso 4: Frontend: leer config y adaptar UI

- Boot: cargar `/config` (cachearlo) y derivar:
  - modo de jerarquía
  - features habilitadas
- NavBar:
  - ocultar Companies si `mode=flat`
- Project Wizard:
  - hierarchical: Company/Location selector
  - flat: inputs de texto
- Gating UI por `user.capabilities`.

### Paso 5: Ajuste de datos existentes (si aplica)

- DSR: ya es hierarchical.
- H2O (cuando se integre al core): migrar/permitir `location_id=null` en proyectos existentes; opcional crear Companies/Locations “reales” más adelante si se quiere normalizar.

### Paso 6: Tests mínimos (core)

Backend:
- crear Project hierarchical sin `location_id` debe fallar.
- crear Project flat sin `location_id` debe funcionar.
- permisos por capabilities (un role sin `proposals:generate` no puede generar).

Frontend:
- smoke: wizard cambia según modo.
- nav items ocultos/visibles según config + capabilities.

---

## Open Questions (para decidir antes de implementar)

1) Flat mode:
   - ¿`client/location` texto deben ser requeridos o pueden ser opcionales?
2) ¿`Project.client/location` siguen existiendo como “legacy” o pasan a ser parte formal del core para flat mode? (recomendación: mantenerlos y formalizarlos en flat).
3) ¿La config se mantiene en env vars o se centraliza en BD? (recomendación actual: env vars + `/config`).

---

## Success Criteria

- DSR conserva su jerarquía y filtros Company/Location sin cambios funcionales.
- H2O puede operar sin ver Companies/Locations y sin romper el modelo core.
- Un feature nuevo (p. ej. mejoras en AI jobs/polling, storage, timeline, etc.) se implementa una sola vez y aplica a ambos.

