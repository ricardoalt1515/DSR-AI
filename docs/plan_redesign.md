Arquitectura de Informacion Propuesta

Cambio Principal: Admin Console Unificada

ANTES (Fragmentado):

- /admin/organizations (lista)
- /admin/organizations/[id] (detalle + usuarios)
- /admin/users (todos los usuarios - separado)
- /settings/team (org admins - completamente aislado)

DESPUES (Unificado):

- /admin (Admin Console - Platform Admins)
  └── Sidebar con: Organizations | Users | Settings
  └── Org Switcher prominente en header del panel

- /settings/team (Org Admins - mejorado visualmente)

Por que este enfoque:

1.  Estandar de industria: Stripe, Vercel, AWS todos usan paneles unificados
2.  Contexto persistente: Siempre sabes en que org estas
3.  Menos navegacion: Todo a 1-2 clicks
4.  Codigo compartido: Un layout para todo el admin

---

Componentes Nuevos a Crear

1.  Admin Layout Shell

frontend/app/admin/layout.tsx

Layout con sidebar flotante (glass-liquid) que envuelve todas las rutas /admin/\*

┌────────────────────────────────────────────────────────────────┐
│ [Logo] Admin Console [Org Switcher ▼] │
├──────────┬─────────────────────────────────────────────────────┤
│ │ │
│ Orgs │ Contenido dinamico │
│ Users │ (Organizations/Users/etc) │
│ ────── │ │
│ Settings│ │
│ │ │
└──────────┴─────────────────────────────────────────────────────┘

Sidebar Features:

- Iconos con labels
- Indicador activo con animacion
- Colapsable en mobile
- Badge de conteo (ej: "Orgs (5)")

2.  Organization Switcher (Premium)

frontend/components/features/admin/org-switcher.tsx

Componente prominente en el header del admin que:

- Muestra org actual con logo/avatar generado
- Dropdown con busqueda (Command-style)
- Indicador visual claro de "modo impersonacion"
- Quick actions: View Details, Add User

┌──────────────────────────────────────┐
│ [A] Acme Corporation ▼ │
│ acme-corp │
└──────────────────────────────────────┘
↓ (expanded)
┌──────────────────────────────────────┐
│ Search organizations... │
├──────────────────────────────────────┤
│ [A] Acme Corporation ✓ Active │
│ [D] DSR Inc. Active │
│ [T] TechFlow Active │
├──────────────────────────────────────┤
│ + Create New Organization │
└──────────────────────────────────────┘

3.  Organization Cards (Rediseno)

frontend/components/features/admin/org-card.tsx

Cards con:

- Avatar generado (iniciales + color unico por org)
- Stats inline: Users count, Projects count (si disponible)
- Status badge con colores semanticos
- Hover effect con glass-bubble
- Quick actions on hover

4.  User Table (Premium)

frontend/components/features/admin/users-table.tsx

Tabla mejorada:

- Avatares con iniciales
- Inline role editing (para Platform Admins)
- Row actions: Edit, Deactivate, Remove
- Filtros: Role, Status
- Animaciones staggered al cargar

5.  Add User Modal (Wizard-style)

frontend/components/features/admin/add-user-modal.tsx

Modal rediseñado:

- Stepper visual: Info → Credentials → Role
- Validacion inline en tiempo real
- Password strength indicator
- Role descriptions con permisos
- Animaciones de transicion

6.  Settings Team Page (Mejorado)

frontend/app/settings/team/page.tsx

Para Org Admins:

- Header con nombre de org y stats
- Misma tabla premium de usuarios
- Mismo modal de add user
- Mensaje de bienvenida contextual

---

Flujo de Navegacion Mejorado

Platform Admins (Developers)

1.  Login → Dashboard (normal)
2.  User Menu → "Admin Console"
3.  Admin Console abre con Organizations tab
4.  Click en Org → Vista detalle inline O switch context
5.  Sidebar: Organizations | Users | Settings

Org Admins (Clientes)

1.  Login → Dashboard
2.  User Menu → "Team" (igual que antes)
3.  /settings/team con UI mejorada
4.  Sin acceso a Admin Console

---

Archivos a Crear

| Archivo                                      | Descripcion                      |
| -------------------------------------------- | -------------------------------- |
| app/admin/layout.tsx                         | Layout shell con sidebar         |
| app/admin/page.tsx                           | Redirect a /admin/organizations  |
| app/admin/organizations/page.tsx             | Reescribir con nuevo diseño      |
| app/admin/organizations/[id]/page.tsx        | Convertir a panel inline o sheet |
| components/features/admin/admin-sidebar.tsx  | Sidebar con navegacion           |
| components/features/admin/org-switcher.tsx   | Switcher prominente              |
| components/features/admin/org-card.tsx       | Card rediseñada                  |
| components/features/admin/users-table.tsx    | Tabla compartida                 |
| components/features/admin/add-user-modal.tsx | Modal wizard                     |
| components/features/admin/org-avatar.tsx     | Avatar generado                  |

Archivos a Modificar

| Archivo                             | Cambio                                  |
| ----------------------------------- | --------------------------------------- |
| components/shared/layout/navbar.tsx | Simplificar menu (solo "Admin Console") |
| app/settings/team/page.tsx          | Usar componentes compartidos            |
| app/globals.css                     | Agregar estilos admin-specific          |

---

Detalles de Diseño Visual

Color Palette (Admin-specific)

/_ Usar variables existentes pero con enfasis en: _/
--admin-accent: var(--primary); /_ Azul agua _/
--admin-surface: var(--card); /_ Glass base _/
--admin-sidebar-bg: color-mix(in srgb, var(--background) 95%, var(--primary) 5%);

Tipografia

- Titulos: DM Sans (--font-display)
- Body/UI: Geist Sans (--font-sans)
- Monospace (slugs, IDs): JetBrains Mono (--font-mono)

Espaciado

- Sidebar width: 240px (colapsado: 64px)
- Content padding: var(--space-xl) = 32px
- Card gap: var(--space-lg) = 24px

Animaciones

- Sidebar items: fadeInUp staggered
- Cards: hover-lift + glass-bubble::before glow
- Modal steps: slideInFromRight
- Table rows: animate-stagger

---

Mejoras UX Especificas

1.  Org Context Siempre Visible

El switcher en el header del admin siempre muestra que org estas "impersonando". Si no hay
ninguna, muestra "Select Organization" con estilo de alerta.

2.  Empty States Premium

Usar enhanced-empty-state.tsx existente con ilustraciones contextuales:

- No orgs: Building icon + CTA "Create first organization"
- No users: Users icon + CTA "Invite team member"

3.  Feedback Visual Inmediato

- Crear org → Card aparece con animacion
- Crear user → Row aparece con highlight
- Errores → Toast con sonner (ya existe)

4.  Loading States

- Skeleton cards para orgs (ya existe patron)
- Skeleton table rows
- Shimmer en buttons durante submit

---

Orden de Implementacion

Fase 1: Infraestructura (primero)

1.  Crear admin layout shell con sidebar basico
2.  Crear org-switcher component
3.  Mover paginas existentes bajo nuevo layout

Fase 2: Componentes Compartidos

4.  Crear org-card rediseñada
5.  Crear users-table compartida
6.  Crear add-user-modal wizard

Fase 3: Paginas

7.  Reescribir /admin/organizations con nuevo diseño
8.  Integrar users en panel (sheet o inline)
9.  Actualizar /settings/team para usar componentes compartidos

Fase 4: Polish

10. Animaciones y transiciones
11. Responsive/mobile
12. Actualizar navbar

---

Notas Tecnicas

- Usar Radix Dialog/Sheet para modales
- Motion library ya disponible para animaciones complejas
- Zustand store organization-store ya maneja estado
- API client organizationsAPI ya existe

---

Metricas de Exito

1.  Reduccion de clicks: De 3-4 clicks a 1-2 para crear usuario
2.  Contexto claro: Usuario siempre sabe en que org esta
3.  Codigo DRY: Un solo componente de tabla/modal usado en 2+ lugares
4.  Visual premium: Coherente con el resto de la app (glass, water theme)
