# 🚀 PLAN DE IMPLEMENTACIÓN FRONTEND-FIRST - H₂O ALLEGIANT

## **GUÍA PARA AGENTE IA - SISTEMA MULTI-PROYECTO**

---

## 📋 **CONTEXTO Y OBJETIVO**

### **QUE TENEMOS ACTUALMENTE:**

- ✅ Sistema de chat funcional en Next.js 14
- ✅ `modern_proposal_agent.py` que genera propuestas
- ✅ `ai_service.py` con cuestionarios dinámicos
- ✅ Base de datos PostgreSQL con Users, Conversations, Messages
- ✅ Sistema de autenticación JWT

### **QUE QUEREMOS LOGRAR:**

- 🎯 Dashboard que muestre múltiples proyectos de agua
- 🎯 Workspace individual por proyecto con 3 fases
- 🎯 UI/UX que guíe al usuario a través del flujo completo
- 🎯 Mantener chat existente integrado en workspace

### **ESTRATEGIA:**

**FRONTEND-FIRST**: Crear toda la experiencia visual primero, conectar después al backend existente.

---

## 🎨 **FASE 1: DISEÑO Y MOCKUPS MEJORADOS (Día 1)**

### **NUEVA ARQUITECTURA UI: NAVBAR + SIDEBAR LAYOUT**

#### **INSPIRACIÓN DE DISEÑO:**
- **Linear/Notion Style**: Sidebar colapsible + contenido principal espacioso
- **Vercel Dashboard**: Clean, metrics claras, acciones prominentes
- **GitHub Projects**: Cards + vista de lista, navegación intuitiva
- **Figma Workspace**: Sidebar contextual que cambia según la página

#### **LAYOUT GENERAL DEL SISTEMA:**
```
┌────────────────────────────────────────────────────────────────┐
│ NAVBAR FIJO (Altura: 60px)                                     │
│ 🌊 H₂O Allegiant | 🔍 Buscar proyecto... | 🔔 | Ricardo ▼     │
├──────────────┬─────────────────────────────────────────────────┤
│   SIDEBAR    │           CONTENIDO PRINCIPAL                   │
│ (Ancho: 260px│                                                 │
│  Colapsible) │                                                 │
│              │                                                 │
│ 🏠 Dashboard │   [Contenido específico de cada página]        │
│              │                                                 │
│ 📊 Proyectos │                                                 │
│   Los Mochis │                                                 │
│   Culiacán   │                                                 │
│   + Nuevo    │                                                 │
│              │                                                 │
│ 📄 Docs      │                                                 │
│ ⚙️ Config    │                                                 │
│              │                                                 │
│ 💬 IA Chat   │                                                 │
│              │                                                 │
│ [Collapse ◀] │                                                 │
└──────────────┴─────────────────────────────────────────────────┘
```

#### **1. NAVBAR SUPERIOR (Componente Global)**
```
┌────────────────────────────────────────────────────────────────┐
│ 🌊 H₂O Allegiant  |🔍[Buscar en proyectos...] | 🔔3 | 👤Ricardo▼│
│                   |                           |     |          │
│                   | • Los Mochis - Propuesta |     | Mi Perfil│
│                   | • Culiacán - Ingeniería  |     | Config   │  
│                   | • Crear nuevo proyecto   |     | Logout   │
└────────────────────────────────────────────────────────────────┘
```

**FUNCIONALIDADES NAVBAR:**
- **Logo + Branding** clickeable (va a dashboard)
- **Búsqueda global** con autocomplete de proyectos
- **Notificaciones** inteligentes (propuestas listas, fases completas)
- **User menu** con perfil, configuración, logout

#### **2. SIDEBAR INTELIGENTE Y CONTEXTUAL**

**MODO DASHBOARD (Vista Global):**
```
┌─ SIDEBAR ──────────┐
│ 🏠 Dashboard       │ ← Activo
│                    │
│ 📊 PROYECTOS       │
│ ┌────────────────┐ │
│ │ + Nuevo        │ │
│ └────────────────┘ │
│                    │
│ 📁 RECIENTES       │
│ • Los Mochis   🟡  │ ← Click directo
│ • Culiacán     🟢  │
│ • Mazatlán     🔴  │
│                    │
│ 📄 Documentos      │
│ 📊 Reportes        │
│ ⚙️ Configuración   │
│                    │
│ ────────────────   │
│ 💬 Chat IA Global  │
│ 🎯 Ayuda/Soporte   │
│                    │
│ [◀ Collapse]       │
└────────────────────┘
```

**MODO PROJECT WORKSPACE (Vista Específica):**
```
┌─ SIDEBAR ──────────┐
│ ← Dashboard        │ ← Breadcrumb
│                    │
│ 🏗️ SISTEMA         │
│    LOS MOCHIS      │ ← Título proyecto
│                    │
│ 📊 Vista General   │ ← Activo
│ 💬 Chat Proyecto   │
│ 📄 Documentos      │
│ 📈 Progreso        │
│ 📋 Bitácora        │
│                    │
│ ────── FASES ───── │
│ ✅ Propuesta       │ ← Navegable
│ ⏳ Ingeniería      │
│ ⭕ Procurement     │
│                    │
│ ──── HERRAMIENTAS  │
│ 🔧 Configuración   │
│ 👥 Equipo          │
│ 📊 Analytics       │
│                    │
│ [◀ Collapse]       │
└────────────────────┘
```

#### **3. DASHBOARD PRINCIPAL MEJORADO**
```
┌─ CONTENIDO PRINCIPAL ────────────────────────────────────────┐
│                                                              │
│ Dashboard                            [+ Nuevo Proyecto] [⚙️] │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                              │
│ 📊 MÉTRICAS EJECUTIVAS                                       │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐ │
│ │    3        │ │   $450K     │ │     2       │ │  89%   │ │
│ │ Proyectos   │ │ CAPEX Total │ │ En Progreso │ │Success │ │
│ │ Activos     │ │             │ │             │ │ Rate   │ │
│ │ ──────────  │ │ ──────────  │ │ ──────────  │ │─────── │ │
│ │ ↗ +1 este   │ │ ↗ +$150K    │ │ → Sin       │ │↗ +5%   │ │
│ │   mes       │ │   este mes  │ │   cambios   │ │  mes   │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └────────┘ │
│                                                              │
│ 🚨 REQUIEREN TU ATENCIÓN                        [Ver todos] │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ ⚡ Sistema Los Mochis                       🟡 Propuesta │ │
│ │    Chat 90% completo • Listo para generar propuesta     │ │
│ │    [🚀 Continuar Chat] [📄 Ver Conversación]            │ │
│ │                                                          │ │
│ │ ⏰ Planta Culiacán                         🟢 Ingeniería │ │
│ │    P&ID 75% • Estimado 6h para completar                │ │
│ │    [👁 Ver Progreso] [💬 Chat del Proyecto]             │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ 📁 TODOS LOS PROYECTOS           [⊞ Cards] [☰ Lista] [📊]  │
│                                                              │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │ 🏭 Los Mochis   │ │ 🏛️ Culiacán     │ │ 🏖️ Mazatlán     │ │
│ │ ━━━━━━━━━━━━━━━ │ │ ━━━━━━━━━━━━━━━ │ │ ━━━━━━━━━━━━━━━ │ │
│ │ 🟡 Propuesta    │ │ 🟢 Ingeniería   │ │ 🔴 Pausado      │ │
│ │ $150K • Indust. │ │ $280K • Munic.  │ │ $95K • Turístico│ │
│ │ Hace 2 horas    │ │ P&ID 75% ⏱️ 6h  │ │ Pendiente pago  │ │
│ │                 │ │                 │ │                 │ │
│ │ [🚀 Continuar]  │ │ [👁 Ver Estado] │ │ [🔄 Reactivar]  │ │
│ │ [💬] [📄] [⋯]   │ │ [💬] [📄] [⋯]   │ │ [💬] [📄] [⋯]   │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### **4. PROJECT WORKSPACE COMPLETAMENTE REDISEÑADO**
```
┌─ CONTENIDO PRINCIPAL ────────────────────────────────────────┐
│                                                              │
│ Sistema Los Mochis              [💬 Chat] [⚙️ Config] [📤]  │
│ Industrial • Los Mochis, Sinaloa • Creado hace 3 días       │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                              │
│ 🎯 TIMELINE DEL PROYECTO                                     │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ ✅ Propuesta ────── ◐ Ingeniería ────── ○ Procurement    │ │
│ │    Completa         En Espera           Pendiente        │ │
│ │                                                          │ │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
│ │ CAPEX: $150,000 • Estimado: 87 días • Estado: Excelente │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ 🚀 PRÓXIMA ACCIÓN RECOMENDADA                   [📅 Agendar] │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ 🔧 ¡Listo para iniciar Ingeniería Detallada!            │ │
│ │                                                          │ │
│ │ ✨ Tu propuesta está perfecta. Ahora puedo generar:     │ │
│ │                                                          │ │
│ │ 🏗️ P&IDs profesionales    📋 BOM detallado              │ │
│ │ 📐 Memorias de cálculo     🗺️ Layout preliminar          │ │
│ │ 📊 Especificaciones       ⏱️ Cronograma detallado       │ │
│ │                                                          │ │
│ │ ⏱️ Tiempo estimado: 48 horas                              │ │
│ │ 💰 Sin costo adicional por ahora                        │ │
│ │                                                          │ │
│ │ [🚀 Iniciar Ingeniería] [📄 Revisar Propuesta Primero]  │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─ INFORMACIÓN TÉCNICA ──┐ ┌─ CONTEXTO EXTRAÍDO ──────────┐ │
│ │ 💧 PARÁMETROS           │ │ 📊 SISTEMA PROPUESTO         │ │
│ │                         │ │                              │ │
│ │ • Caudal: 500 m³/día   │ │ • DAF + Lodos Activados     │ │
│ │ • Tipo: Industrial      │ │ • 12 equipos principales    │ │
│ │ • Sector: Alimentos     │ │ • Área requerida: 800 m²   │ │
│ │ • Ubicación: Los Mochis │ │ • Eficiencia: 95% DBO       │ │
│ │ • Normativa: NOM-001    │ │ • Tiempo construcción: 90d  │ │
│ │                         │ │                              │ │
│ │ [✏️ Editar]             │ │ [🔄 Recalcular]              │ │
│ └─────────────────────────┘ └──────────────────────────────┘ │
│                                                              │
│ 📄 DOCUMENTOS GENERADOS                         [📁 Ver todos] │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ 📑 Propuesta_Conceptual_Los_Mochis_v1.pdf               │ │
│ │    ✅ 16 páginas • Generado hace 5 min • 2.4 MB          │ │
│ │    [⬇️ Descargar] [👁️ Vista Previa] [📤 Compartir]      │ │
│ │                                                          │ │
│ │ 📊 Análisis_Técnico_Resumen.json                        │ │
│ │    ✅ Datos estructurados • Para siguiente fase          │ │
│ │    [👁️ Ver JSON] [🔗 API Access]                         │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### **2. Workspace del Proyecto (`/projects/[id]`)**

```
┌─────────────────────────────────────────────────────┐
│ ← Dashboard | Sistema Los Mochis | 🔔 1             │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 📊 ESTADO DEL PROYECTO                              │
│ ┌─────────────────────────────────────────────────┐ │
│ │ CAPEX: $150,000 | Tiempo: 87 días restantes    │ │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━      │ │
│ │ ✓ Propuesta  ◐ Ingeniería (0%)  ○ Procurement  │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ 🎯 SIGUIENTE PASO                                   │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Propuesta lista para generar                    │ │
│ │ Tu conversación tiene toda la información       │ │
│ │ necesaria para crear la propuesta técnica.     │ │
│ │                                                 │ │
│ │ [🚀 Generar Propuesta] [💬 Continuar Chat]     │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ 📋 INFORMACIÓN DEL PROYECTO                        │
│ ┌─────────────────────────────────────────────────┐ │
│ │ • Ubicación: Los Mochis, Sinaloa               │ │
│ │ • Sector: Industrial - Alimentos                │ │
│ │ • Caudal: 500 m³/día                           │ │
│ │ • Tipo: Agua residual industrial               │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ 📄 DOCUMENTOS                                       │
│ ┌─────────────────────────────────────────────────┐ │
│ │ No hay documentos generados aún                 │ │
│ │ Completa la propuesta para generar el primer    │ │
│ │ documento técnico.                              │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ 💬 CHAT DEL PROYECTO                               │
│ [Componente de chat existente integrado aquí]      │
└─────────────────────────────────────────────────────┘
```

#### **3. Workspace con Propuesta Completada**

```
┌─────────────────────────────────────────────────────┐
│ ← Dashboard | Sistema Los Mochis | ✅ Propuesta     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 📊 ESTADO DEL PROYECTO                              │
│ ┌─────────────────────────────────────────────────┐ │
│ │ CAPEX: $150,000 | Tiempo: 87 días restantes    │ │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━      │ │
│ │ ✅ Propuesta  ○ Ingeniería  ○ Procurement       │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ 🎯 SIGUIENTE PASO                                   │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 🚀 Continuar con Ingeniería Detallada          │ │
│ │                                                 │ │
│ │ Ahora puedo generar:                            │ │
│ │ • P&IDs profesionales                           │ │
│ │ • Lista detallada de equipos (BOM)              │ │
│ │ • Memorias de cálculo                           │ │
│ │ • Layout preliminar                             │ │
│ │                                                 │ │
│ │ Tiempo estimado: 48 horas                       │ │
│ │                                                 │ │
│ │ [🔧 Iniciar Ingeniería] [📄 Ver Propuesta]     │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ 📄 DOCUMENTOS GENERADOS                            │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ✅ Propuesta_Conceptual_Los_Mochis.pdf          │ │
│ │    📊 16 páginas | Generado hace 5 min          │ │
│ │    [Descargar] [Vista Previa] [Compartir]      │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ 📋 CONTEXTO TÉCNICO EXTRAÍDO                       │
│ ┌─────────────────────────────────────────────────┐ │
│ │ • Sistema: DAF + Lodos Activados               │ │
│ │ • Equipos principales: 12 identificados        │ │
│ │ • Área requerida: 800 m²                       │ │
│ │ • Eficiencia esperada: 95% DBO                 │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## 🛠️ **FASE 2: COMPONENTES REACT CON NUEVA ARQUITECTURA (Días 2-3)**

### **ESTRUCTURA DE ARCHIVOS MEJORADA:**

```
hydrous-chat/src/
├── app/
│   ├── (dashboard)/                 # Route group para layout
│   │   ├── layout.tsx               # Layout con Navbar + Sidebar
│   │   ├── dashboard/
│   │   │   └── page.tsx             # Dashboard principal
│   │   ├── projects/
│   │   │   ├── [projectId]/
│   │   │   │   ├── layout.tsx       # Layout específico del proyecto
│   │   │   │   ├── page.tsx         # Workspace general
│   │   │   │   ├── chat/page.tsx    # Chat del proyecto
│   │   │   │   ├── documents/page.tsx # Documentos
│   │   │   │   ├── progress/page.tsx  # Progreso detallado
│   │   │   │   └── settings/page.tsx  # Configuración
│   │   │   └── create/page.tsx      # Crear nuevo proyecto
│   │   ├── documents/page.tsx       # Vista global de documentos
│   │   └── settings/page.tsx        # Configuración global
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx               # Navbar superior global
│   │   ├── Sidebar.tsx              # Sidebar contextual
│   │   ├── DashboardSidebar.tsx     # Sidebar para dashboard
│   │   ├── ProjectSidebar.tsx       # Sidebar para workspace
│   │   └── Layout.tsx               # Layout wrapper
│   ├── dashboard/
│   │   ├── MetricsCards.tsx         # Cards de métricas ejecutivas
│   │   ├── ActionsRequired.tsx      # Sección "Requieren Atención"
│   │   ├── ProjectGrid.tsx          # Grid de cards de proyectos
│   │   └── ProjectsViewToggle.tsx   # Toggle Cards/Lista/Analytics
│   ├── projects/
│   │   ├── ProjectCard.tsx          # Card mejorado con más info
│   │   ├── ProjectTimeline.tsx      # Timeline horizontal de fases
│   │   ├── ProjectActions.tsx       # Actions según fase actual
│   │   ├── ProjectInfo.tsx          # Panel de información técnica
│   │   ├── ProjectDocuments.tsx     # Lista mejorada de documentos
│   │   ├── NextActionCard.tsx       # Card "Próxima Acción Recomendada"
│   │   └── ProjectHeader.tsx        # Header del workspace
│   ├── search/
│   │   ├── GlobalSearch.tsx         # Buscador con autocomplete
│   │   └── SearchResults.tsx        # Resultados de búsqueda
│   ├── notifications/
│   │   ├── NotificationBell.tsx     # Campana de notificaciones
│   │   └── NotificationPanel.tsx    # Panel de notificaciones
│   └── ui/
│       ├── Timeline.tsx             # Timeline component reutilizable
│       ├── MetricCard.tsx           # Card para métricas
│       ├── StatusBadge.tsx          # Badge con colores por estado
│       ├── ActionButton.tsx         # Botón de acción estilizado
│       └── Collapsible.tsx          # Para sidebar colapsible
├── hooks/
│   ├── useProjects.ts               # Gestión de múltiples proyectos
│   ├── useProject.ts                # Proyecto individual
│   ├── useSidebar.ts                # Estado del sidebar
│   ├── useGlobalSearch.ts           # Búsqueda global
│   └── useNotifications.ts          # Sistema de notificaciones
├── types/
│   ├── project.ts                   # Tipos del sistema de proyectos
│   ├── sidebar.ts                   # Tipos para navegación
│   └── notifications.ts             # Tipos para notificaciones
└── lib/
    ├── api-client.ts                # Cliente API extendido
    ├── project-utils.ts             # Utils para proyectos
    └── sidebar-config.ts            # Configuración del sidebar
```

### **COMPONENTES PRIORITARIOS REDISEÑADOS:**

#### **1. Layout Principal**
```typescript
// components/layout/Layout.tsx
interface LayoutProps {
  children: React.ReactNode;
  sidebarType: 'dashboard' | 'project';
  projectId?: string;
}

export function Layout({ children, sidebarType, projectId }: LayoutProps) {
  const { sidebarCollapsed, toggleSidebar } = useSidebar();
  
  return (
    <div className="h-screen flex flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          type={sidebarType}
          projectId={projectId}
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
        />
        <main className="flex-1 overflow-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
```

#### **2. Navbar Inteligente**
```typescript
// components/layout/Navbar.tsx
export function Navbar() {
  const { notifications } = useNotifications();
  const { user } = useAuth();
  
  return (
    <nav className="h-16 bg-white border-b border-gray-200 flex items-center px-6">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold">H₂O</span>
        </div>
        <span className="font-semibold text-gray-900">Allegiant</span>
      </Link>
      
      {/* Search */}
      <div className="flex-1 max-w-lg mx-8">
        <GlobalSearch />
      </div>
      
      {/* Right side */}
      <div className="flex items-center space-x-4">
        <NotificationBell count={notifications.length} />
        <UserMenu user={user} />
      </div>
    </nav>
  );
}
```

#### **3. Sidebar Contextual**
```typescript
// components/layout/Sidebar.tsx
interface SidebarProps {
  type: 'dashboard' | 'project';
  projectId?: string;
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ type, projectId, collapsed, onToggle }: SidebarProps) {
  if (type === 'dashboard') {
    return <DashboardSidebar collapsed={collapsed} onToggle={onToggle} />;
  }
  
  return (
    <ProjectSidebar 
      projectId={projectId!} 
      collapsed={collapsed} 
      onToggle={onToggle} 
    />
  );
}
```

#### **4. Métricas Ejecutivas Dashboard**
```typescript
// components/dashboard/MetricsCards.tsx
interface MetricsCardsProps {
  projects: Project[];
}

export function MetricsCards({ projects }: MetricsCardsProps) {
  const metrics = calculateMetrics(projects);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <MetricCard
        title="Proyectos Activos"
        value={metrics.activeProjects}
        change={metrics.projectsChange}
        trend="up"
        icon="🏗️"
      />
      <MetricCard
        title="CAPEX Total"
        value={`$${metrics.totalCapex}K`}
        change={metrics.capexChange}
        trend="up"
        icon="💰"
      />
      <MetricCard
        title="En Progreso"
        value={metrics.inProgress}
        change={metrics.progressChange}
        trend="neutral"
        icon="⚡"
      />
      <MetricCard
        title="Success Rate"
        value={`${metrics.successRate}%`}
        change={metrics.successChange}
        trend="up"
        icon="📊"
      />
    </div>
  );
}
```

#### **5. Timeline de Proyecto Horizontal**
```typescript
// components/projects/ProjectTimeline.tsx
interface ProjectTimelineProps {
  currentPhase: 'proposal' | 'engineering' | 'procurement';
  progress: {
    proposal: number;
    engineering: number;
    procurement: number;
  };
  capex: number;
  estimatedDays: number;
}

export function ProjectTimeline({ currentPhase, progress, capex, estimatedDays }: ProjectTimelineProps) {
  const phases = [
    { key: 'proposal', label: 'Propuesta', icon: '📋' },
    { key: 'engineering', label: 'Ingeniería', icon: '🔧' },
    { key: 'procurement', label: 'Procurement', icon: '🛒' },
  ];
  
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Timeline del Proyecto</h3>
      
      {/* Timeline horizontal */}
      <div className="flex items-center justify-between mb-6">
        {phases.map((phase, index) => (
          <div key={phase.key} className="flex items-center">
            <PhaseStep
              phase={phase}
              status={getPhaseStatus(phase.key, currentPhase, progress)}
              progress={progress[phase.key]}
            />
            {index < phases.length - 1 && (
              <div className="w-24 h-1 bg-gray-200 mx-4">
                <div 
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${getConnectionProgress(phase.key, progress)}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 p-3 rounded">
        <span>CAPEX: ${capex.toLocaleString()}</span>
        <span>Estimado: {estimatedDays} días</span>
        <span>Estado: Excelente</span>
      </div>
    </div>
  );
}
```

### **COMPONENTES PRIORITARIOS:**

#### **1. ProjectCard.tsx**

```typescript
interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    status: 'proposal' | 'engineering' | 'procurement';
    capex: number;
    sector: string;
    lastActivity: string;
    progress: {
      proposal: number;
      engineering: number;
      procurement: number;
    };
  };
  onNavigate: (projectId: string) => void;
}

export function ProjectCard({ project, onNavigate }: ProjectCardProps) {
  // Mostrar info del proyecto con acciones rápidas
  // Estado visual, progreso, última actividad
  // Botones: Continuar, Ver Docs, Chat
}
```

#### **2. ProjectTimeline.tsx**

```typescript
interface ProjectTimelineProps {
  currentPhase: 'proposal' | 'engineering' | 'procurement';
  progress: {
    proposal: number;
    engineering: number;
    procurement: number;
  };
}

export function ProjectTimeline({ currentPhase, progress }: ProjectTimelineProps) {
  // Timeline visual de las 3 fases
  // Indicadores de completado/en progreso/pendiente
  // Progress bars por fase
}
```

#### **3. ProjectActions.tsx**

```typescript
interface ProjectActionsProps {
  project: Project;
  onAction: (action: string, projectId: string) => void;
}

export function ProjectActions({ project, onAction }: ProjectActionsProps) {
  // Botones contextuales según la fase actual
  // "Generar Propuesta", "Iniciar Ingeniería", "Ver Procurement"
  // Lógica para mostrar la acción correcta
}
```

---

## 🔄 **FASE 3: INTEGRACIÓN CON BACKEND EXISTENTE (Días 4-5)**

### **ADAPTAR API EXISTENTE:**

#### **1. Extender api-client.ts**

```typescript
// hydrous-chat/src/lib/api-client.ts

// NUEVAS FUNCIONES (conectar a conversation existente)
export async function getProjects(): Promise<Project[]> {
  // MOCK INICIAL: Convertir conversations a projects
  const conversations = await getConversations();
  return conversations
    .filter(conv => conv.metadata?.has_proposal)
    .map(conv => convertConversationToProject(conv));
}

export async function getProject(projectId: string): Promise<Project> {
  // MOCK: Obtener conversation y convertir a project
  const conversation = await getConversation(projectId);
  return convertConversationToProject(conversation);
}

export async function generateProposal(projectId: string): Promise<void> {
  // REUTILIZAR: Endpoint existente de chat que usa modern_proposal_agent
  return await triggerProposalGeneration(projectId);
}

function convertConversationToProject(conversation: Conversation): Project {
  return {
    id: conversation.id,
    name: extractProjectName(conversation.metadata),
    status: conversation.metadata?.has_proposal ? 'proposal' : 'engineering',
    capex: extractCapex(conversation.metadata),
    technicalContext: extractTechnicalContext(conversation.metadata),
    // ... mapear campos
  };
}
```

#### **2. Hook useProjects.ts**

```typescript
// hydrous-chat/src/hooks/useProjects.ts
export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProjects() {
      try {
        // MOCK INICIAL: usar conversations existentes
        const projectsData = await apiClient.getProjects();
        setProjects(projectsData);
      } catch (error) {
        console.error('Error loading projects:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadProjects();
  }, []);

  const createProject = async (projectData: CreateProjectRequest) => {
    // MOCK: crear nueva conversation que se convierta en project
    const newConversation = await apiClient.createConversation(projectData);
    const newProject = convertConversationToProject(newConversation);
    setProjects(prev => [...prev, newProject]);
    return newProject;
  };

  return { projects, loading, createProject };
}
```

---

## 📱 **FASE 4: FLUJOS DE USUARIO (Día 6)**

### **IMPLEMENTAR NAVEGACIÓN:**

#### **1. Flujo de Creación de Proyecto**

```
Dashboard → [+ Crear Proyecto] → Modal/Página:
┌─────────────────────────────────────┐
│ 🚀 Nuevo Proyecto de Agua          │
│                                     │
│ Nombre: [____________________]      │
│ Ubicación: [________________]       │
│ Tipo: [Industrial ▼]                │
│                                     │
│ [Cancelar] [Crear y Empezar Chat →] │
└─────────────────────────────────────┘

→ Redirect a /projects/[new-id] con chat activo
```

#### **2. Flujo de Conversación a Propuesta**

```
Chat conversación → metadata.has_proposal = true → 
UI muestra: "¿Generar propuesta?" → 
Click → Llamar modern_proposal_agent → 
Mostrar PDF generado + "Continuar con Ingeniería"
```

#### **3. Flujo entre Fases**

```
Propuesta Completa → [Iniciar Ingeniería] → 
Estado cambia a "engineering" → 
UI muestra progreso mock → 
Después: [Ver Procurement]
```

---

## 🎭 **FASE 5: DATOS MOCK Y TESTING (Día 7)**

### **CREAR DATOS DE PRUEBA:**

#### **1. Mock Projects Data**

```typescript
// hydrous-chat/src/lib/mock-data.ts
export const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Sistema Los Mochis',
    status: 'proposal',
    capex: 150000,
    sector: 'Industrial - Alimentos',
    location: 'Los Mochis, Sinaloa',
    lastActivity: '2 horas',
    progress: { proposal: 90, engineering: 0, procurement: 0 },
    technicalContext: {
      flowRate: 500,
      waterType: 'Industrial',
      treatmentType: 'DAF + Lodos Activados'
    },
    documentsGenerated: []
  },
  {
    id: '2', 
    name: 'Planta Culiacán',
    status: 'engineering',
    capex: 280000,
    sector: 'Municipal',
    location: 'Culiacán, Sinaloa',
    lastActivity: '30 minutos',
    progress: { proposal: 100, engineering: 75, procurement: 0 },
    technicalContext: {
      flowRate: 1200,
      waterType: 'Municipal',
      treatmentType: 'Tratamiento Convencional'
    },
    documentsGenerated: [
      { name: 'Propuesta.pdf', type: 'proposal', url: '#' },
      { name: 'PID_Principal.dwg', type: 'pid', url: '#' }
    ]
  }
];
```

#### **2. Testing de Flujos**

```typescript
// Verificar navegación entre páginas
// Verificar que los estados se actualicen correctamente  
// Verificar integración con chat existente
// Verificar responsive en mobile
```

---

## 🚀 **FASE 6: CONEXIÓN REAL (Día 8)**

### **CONECTAR CON BACKEND:**

#### **1. Reemplazar Mocks**

- Conectar `getProjects()` con conversations reales
- Integrar con `modern_proposal_agent.py` existente
- Conectar generación de propuestas con PDF real

#### **2. Testing Integration**

- Probar flujo completo con datos reales
- Verificar que chat existente funcione en workspace
- Validar que propuestas se generen correctamente

---

## 📋 **CHECKLIST DE IMPLEMENTACIÓN**

### **Día 1: Diseño**

- [ ] Crear wireframes en Figma/papel de Dashboard
- [ ] Diseñar wireframes de Workspace
- [ ] Definir flujos de usuario principales
- [ ] Validar UX con stakeholders

### **Día 2-3: Componentes**

- [ ] Crear estructura de archivos
- [ ] Implementar ProjectCard component
- [ ] Implementar ProjectTimeline component  
- [ ] Implementar Dashboard page
- [ ] Implementar Workspace page básico

### **Día 4-5: API Integration**

- [ ] Extender api-client.ts con funciones de proyecto
- [ ] Crear hooks useProjects y useProject
- [ ] Implementar conversión conversation → project
- [ ] Integrar con chat existente

### **Día 6: User Flows**

- [ ] Implementar creación de proyecto
- [ ] Implementar navegación entre páginas
- [ ] Conectar botones de acción
- [ ] Testing de flujos principales

### **Día 7: Testing**

- [ ] Crear datos mock realistas
- [ ] Testing responsive en mobile
- [ ] Validar accesibilidad básica
- [ ] Performance testing

### **Día 8: Production**

- [ ] Conectar con APIs reales
- [ ] Testing end-to-end completo
- [ ] Deployment a staging
- [ ] Validación final con users

---

## 🎯 **RESULTADO ESPERADO**

Al final de esta implementación tendremos:

✅ **Dashboard multi-proyecto funcional**  
✅ **Workspace individual por proyecto**  
✅ **Integración perfecta con chat existente**  
✅ **Timeline visual de las 3 fases**  
✅ **Flujo completo: Chat → Propuesta → Ready para Ingeniería**  
✅ **Base sólida para agregar agentes de Ingeniería y Procurement**

### **SIGUIENTE FASE (Semana 2):**

Una vez que el frontend esté listo y validado:

- Crear modelo Project en backend
- Migrar conversations existentes
- Implementar DetailedEngineeringAgent
- Conectar todo el sistema

---

## 💡 **NOTAS PARA EL AGENTE IA - ARQUITECTURA MEJORADA**

### **PRIORIDADES DE LA NUEVA UI:**

1. **LAYOUT FIRST** - Implementar Navbar + Sidebar antes que contenido específico
2. **NAVIGATION UX** - Navegación intuitiva entre dashboard y workspaces
3. **RESPONSIVE DESIGN** - Sidebar colapsible, layouts que se adapten
4. **VISUAL HIERARCHY** - Métricas claras, acciones prominentes, estados obvios

### **PUNTOS CRÍTICOS DE IMPLEMENTACIÓN:**

#### **Layout y Navegación:**
- **Sidebar Contextual**: Cambia según dashboard vs proyecto específico
- **Breadcrumbs**: Usuarios siempre saben dónde están
- **Búsqueda Global**: Debe funcionar desde cualquier página
- **Estado del Sidebar**: Persistir colapsado/expandido entre sesiones

#### **Integración con Sistema Existente:**
- **Chat Embebido**: Component actual de chat debe funcionar en workspace
- **Data Mapping**: conversation.metadata → project display data
- **Auth Integration**: Mantener sistema de autenticación existente
- **API Compatibility**: Nuevos endpoints deben coexistir con actuales

#### **Experiencia Visual:**
- **Cards vs Lista**: Usuarios pueden alternar visualización
- **Loading States**: Skeleton screens para carga de datos
- **Empty States**: Mensajes útiles cuando no hay proyectos/docs
- **Success States**: Feedback claro cuando acciones se completan

### **RECURSOS EXISTENTES A REUTILIZAR:**

- **Sistema de chat**: `/chat` page y componentes asociados
- **UI Components**: `components/ui/` con Button, Card, etc.
- **API Client**: `lib/api-client.ts` con auth headers
- **Auth System**: Login/logout/session management
- **Styling**: Tailwind CSS classes y design tokens

### **INSPIRACIÓN DE REFERENCIA:**

- **Linear**: Para sidebar contextual y navegación limpia
- **Notion**: Para estructura de workspace y organización
- **Vercel Dashboard**: Para métricas ejecutivas y cards
- **GitHub Projects**: Para vista de proyectos y estados

### **CONSIDERACIONES TÉCNICAS:**

- **Route Groups**: Usar `(dashboard)` para layouts compartidos
- **Server Components**: Layout components pueden ser server-side
- **Client Components**: Interacciones (sidebar toggle, search) en cliente
- **State Management**: Zustand para sidebar, React Query para API data

### **CRITERIOS DE ÉXITO:**

- ✅ Usuario puede navegar intuitivamente sin perderse
- ✅ Dashboard muestra información útil de un vistazo
- ✅ Workspace de proyecto es productivo y claro
- ✅ Chat existente se integra perfectamente
- ✅ Responsive funciona perfecto en móvil
- ✅ Performance es fluida (sin lag en navegación)

---

**¡ENFOQUE: CREAR UNA EXPERIENCIA VISUAL EXCEPCIONAL QUE GUÍE AL USUARIO NATURALMENTE A TRAVÉS DEL FLUJO COMPLETO!**
