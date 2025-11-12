# Product Requirements Document (PRD)
## H2O Allegiant Platform v2.0

**Fecha**: Julio 2025  
**Autor**: Product Team  
**Estado**: En Desarrollo  
**Versión**: 1.0

---

## 1. Resumen del Producto

### 1.1 Visión
Transformar H2O Allegiant de un generador de propuestas de IA en una plataforma end-to-end que gestiona el ciclo completo de proyectos de tratamiento de agua, desde la concepción hasta la operación.

### 1.2 Problema
Las empresas que necesitan sistemas de tratamiento de agua enfrentan:
- Proceso fragmentado con múltiples proveedores
- 3-6 meses para implementar un proyecto
- Sobrecostos de 30-50% por mala planificación
- Sin visibilidad del progreso del proyecto
- Dificultad para encontrar equipos y proveedores confiables

### 1.3 Solución
Una plataforma unificada que:
- Genera propuestas con IA en minutos (actual)
- Gestiona compras de equipos con marketplace integrado (nuevo)
- Coordina logística y entregas automáticamente (nuevo)
- Supervisa la operación con IoT y alertas (futuro)

### 1.4 Usuarios Target
- **Primarios**: Gerentes de planta, Ingenieros ambientales
- **Secundarios**: CFOs, Directores de operaciones
- **Stakeholders**: Proveedores de equipos, Instaladores certificados

---

## 2. Objetivos y KPIs

### 2.1 Objetivos de Negocio
1. Aumentar revenue por cliente de $750 a $15,000 USD
2. Alcanzar 100 proyectos activos en 6 meses
3. Generar $1M USD en GMV de equipos año 1

### 2.2 Objetivos de Producto
1. Reducir tiempo proyecto de 6 meses a 90 días
2. Conversión propuesta→proyecto completo >25%
3. NPS post-implementación >70

### 2.3 KPIs Principales
- **Revenue por usuario (RPU)**: Target $15,000
- **Conversión por fase**: >60% entre fases
- **Time to value**: <7 días para ver primer beneficio
- **Retención**: 80% proyectos llegan a fase operación

---

## 3. Alcance del MVP

### 3.1 Incluido en MVP
✅ Dashboard de proyectos con estados  
✅ Marketplace interno de equipos (catálogo estático)  
✅ Sistema de cotización y compra  
✅ Notificaciones SMS por Twilio  
✅ Generación de órdenes de compra  
✅ Tracking básico de entregas  
✅ Pagos con Stripe  

### 3.2 Excluido del MVP (Fase 2)
❌ App móvil  
❌ Integración con ERPs  
❌ Portal de proveedores self-service  
❌ Sistema de licitaciones  
❌ IoT monitoring en tiempo real  
❌ Financiamiento integrado  

---

## 4. Arquitectura del Sistema

### 4.1 Stack Tecnológico
```
Frontend:
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS + Shadcn/ui
- Zustand (state management)
- React Query (data fetching)

Backend:
- Python 3.11+
- FastAPI
- SQLAlchemy ORM
- PostgreSQL
- Redis (cache y queues)
- Celery (background jobs)

AI/ML:
- OpenAI API (GPT-4)
- LangChain
- Vector DB (Pinecone)
- Custom tools/functions

Infraestructura:
- Vercel (frontend)
- AWS/Railway (backend)
- Supabase (PostgreSQL)
- AWS S3 (documentos)
- Twilio (SMS)
- Stripe (pagos)
- n8n (workflows)
```

### 4.2 Arquitectura de Microservicios
```
┌─────────────────────────────────────────────────────┐
│                   Frontend (Next.js)                 │
└──────────────────────┬──────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────┐
│                 API Gateway (FastAPI)                │
├─────────────┬──────────────┬───────────┬───────────┤
│   Project   │  Marketplace │    AI     │  Billing  │
│   Service   │   Service    │  Service  │  Service  │
└─────────────┴──────────────┴───────────┴───────────┘
```

---

## 5. Flujo Detallado del Sistema

### 5.1 Gestión de Estados del Proyecto

```python
# Estados principales del proyecto
PROJECT_STATES = {
    "PROPOSAL": "Propuesta generada",
    "APPROVED": "Propuesta aprobada", 
    "ENGINEERING": "Ingeniería en proceso",
    "PROCUREMENT": "Comprando equipos",
    "SHIPPING": "Equipos en camino",
    "INSTALLATION": "Instalando",
    "COMMISSIONING": "Puesta en marcha",
    "OPERATING": "Operando"
}

# Transiciones válidas
STATE_TRANSITIONS = {
    "PROPOSAL": ["APPROVED", "CANCELLED"],
    "APPROVED": ["ENGINEERING"],
    "ENGINEERING": ["PROCUREMENT"],
    "PROCUREMENT": ["SHIPPING"],
    # etc...
}
```

### 5.2 Flujo de Compra de Equipos (Procurement)

#### Paso 1: AI genera BOM (Bill of Materials)
```
1. Engineering Agent analiza el diseño
2. Identifica equipos necesarios:
   - Categoría (ej: "DAF System")
   - Especificaciones (ej: "254 m³/día")
   - Cantidad
3. Genera BOM estructurado en JSON
```

#### Paso 2: Marketplace Agent busca opciones
```
1. Por cada item del BOM:
   - Busca en catálogo interno
   - Filtra por especificaciones
   - Obtiene 3 mejores opciones
2. Calcula precios con markup
3. Verifica disponibilidad
4. Retorna opciones rankeadas
```

#### Paso 3: UI presenta carrito inteligente
```
1. Usuario ve opciones pre-seleccionadas
2. Puede cambiar entre alternativas
3. Ve comparación (precio, tiempo, calidad)
4. Sistema muestra impacto en timeline
5. Aplica descuentos automáticos
```

#### Paso 4: Generación de PO
```
1. Usuario confirma selección
2. Sistema genera Purchase Orders:
   - Una PO por proveedor
   - Términos pre-negociados
   - Formato estándar
3. Envía a proveedores vía API/email
4. Tracking automático inicia
```

### 5.3 Sistema de Logística y Entregas

#### Arquitectura de Tracking
```
1. Webhook receivers para actualizaciones
2. Polling de APIs de carriers (DHL, FedEx)
3. Estados simplificados:
   - Procesando
   - En tránsito
   - En aduana
   - Entregado
4. Alertas automáticas por SMS
```

#### Coordinación de Entregas
```
1. Sistema agrupa por fecha estimada
2. Notifica a cliente 48h antes
3. Genera checklist de recepción
4. QR codes para confirmar
5. Fotos obligatorias de evidencia
```

---

## 6. Diseño de Interfaces (UI/UX)

### 6.1 Dashboard Principal
```
┌─────────────────────────────────────────────────────┐
│  Logo  |  Proyectos  |  Marketplace  |  Perfil     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Mis Proyectos (3)                    + Nuevo      │
│  ┌─────────────────┐  ┌─────────────────┐         │
│  │ Planta Monterrey │  │ Sistema Los    │         │
│  │ ████████████░░░ │  │ ████░░░░░░░░░░ │         │
│  │ 85% - Instalando │  │ 25% - Comprando│         │
│  │ $125,000 USD    │  │ $87,000 USD    │         │
│  └─────────────────┘  └─────────────────┘         │
│                                                     │
│  Notificaciones Recientes                          │
│  • Equipo DAF llegó a planta (hace 2h)            │
│  • Factura #1234 disponible (hace 1d)             │
│  • Nuevo proveedor verificado (hace 2d)           │
└─────────────────────────────────────────────────────┘
```

### 6.2 Vista de Proyecto Individual
```
Tabs principales:
1. Overview - Timeline y progreso general
2. Documentos - Propuesta, planos, facturas
3. Equipos - Estado de cada equipo
4. Pagos - Historial y pendientes
5. Mensajes - Comunicación con proveedores
```

### 6.3 Marketplace de Equipos
```
Diseño tipo e-commerce pero B2B:
- Filtros por categoría/marca/capacidad
- Comparador lado a lado
- Fichas técnicas descargables
- Lead time visible
- "Favoritos" para compras futuras
```

---

## 7. Modelo de Datos

### 7.1 Entidades Principales

```python
# Proyecto
Project {
    id: UUID
    client_id: UUID
    name: string
    status: Enum
    capex_total: decimal
    created_at: datetime
    metadata: JSONB {
        location, industry, flow_rate, etc
    }
}

# Equipo en catálogo
Equipment {
    id: UUID
    category: string
    brand: string
    model: string
    specifications: JSONB
    base_price: decimal
    currency: string
    availability_days: integer
    supplier_id: UUID
}

# Orden de compra
PurchaseOrder {
    id: UUID
    project_id: UUID
    supplier_id: UUID
    items: JSONB[]
    total: decimal
    status: Enum
    po_number: string
    terms: text
}

# Tracking de entrega
Delivery {
    id: UUID
    po_id: UUID
    carrier: string
    tracking_number: string
    status: Enum
    eta: datetime
    updates: JSONB[]
}
```

### 7.2 Relaciones
- Project → many PurchaseOrders
- PurchaseOrder → many Deliveries
- Equipment → many Suppliers (many-to-many)
- Project → many Notifications

---

## 8. Integraciones Externas

### 8.1 Proveedores de Equipos
```
Estrategia inicial (manual):
1. Acuerdos comerciales offline
2. Catálogo actualizado mensualmente
3. Órdenes vía email con formato estándar
4. Confirmación manual → sistema

Estrategia futura (automatizada):
1. APIs REST por proveedor
2. Webhooks para actualizaciones
3. EDI para órdenes grandes
```

### 8.2 Logística (Carriers)
```
Integraciones día 1:
- DHL API (tracking)
- FedEx API (tracking)
- Email parsing para otros

Futuro:
- Booking automático
- Comparador de tarifas
- Seguro integrado
```

### 8.3 Pagos (Stripe)
```
Flujos soportados:
1. Pago único (tarjeta/transferencia)
2. Pagos parciales (50/50)
3. Suscripciones (fase operación)
4. Multi-moneda (USD/MXN)
```

---

## 9. Sistema de Notificaciones

### 9.1 Canales
- **SMS** (Twilio): Transaccional y urgente
- **Email**: Documentos y reportes
- **In-app**: Todas las actualizaciones
- **Push** (futuro): App móvil

### 9.2 Tipos de Notificaciones
```python
NOTIFICATION_TYPES = {
    "PAYMENT_RECEIVED": {
        "sms": True,
        "email": True,
        "template": "Pago de ${amount} recibido. {next_action}"
    },
    "EQUIPMENT_SHIPPED": {
        "sms": True,
        "email": False,
        "template": "{equipment} enviado. Llega {date}. Track: {url}"
    },
    "MILESTONE_COMPLETED": {
        "sms": False,
        "email": True,
        "template": "Fase {phase} completada. Ver detalles: {url}"
    }
}
```

---

## 10. Seguridad y Compliance

### 10.1 Autenticación
- JWT tokens con refresh
- 2FA opcional para pagos >$10k
- Session timeout 30 días
- Rate limiting por IP

### 10.2 Autorización
```
Roles:
- CLIENT_ADMIN: Todo el proyecto
- CLIENT_VIEWER: Solo lectura
- SUPPLIER: Solo sus POs
- INSTALLER: Solo su fase
- ADMIN: Acceso total sistema
```

### 10.3 Datos Sensibles
- Encriptación en reposo (AES-256)
- TLS 1.3 en tránsito
- PCI compliance para pagos
- Logs auditables 2 años

---

## 11. Plan de Implementación

### Sprint 1-2 (Semanas 1-2): Foundation
- [ ] Setup proyecto Next.js + FastAPI
- [ ] Esquema base de datos
- [ ] Auth con JWT
- [ ] CRUD proyectos
- [ ] Integración Stripe básica

### Sprint 3-4 (Semanas 3-4): Project Dashboard
- [ ] UI dashboard principal  
- [ ] Vista proyecto individual
- [ ] Timeline component
- [ ] Sistema de estados
- [ ] Upload de documentos

### Sprint 5-6 (Semanas 5-6): Marketplace MVP
- [ ] Catálogo de equipos (50 items)
- [ ] Búsqueda y filtros
- [ ] Carrito de compra
- [ ] Generación de POs
- [ ] Checkout con Stripe

### Sprint 7-8 (Semanas 7-8): Logistics
- [ ] Tracking básico
- [ ] Notificaciones SMS
- [ ] Estados de entrega
- [ ] Confirmación QR
- [ ] Reportes básicos

### Sprint 9-10 (Semanas 9-10): Polish
- [ ] Testing E2E
- [ ] Optimización performance
- [ ] Documentación API
- [ ] Training usuarios
- [ ] Soft launch

---

## 12. Métricas de Éxito

### 12.1 Técnicas
- API response time <500ms p95
- Uptime >99.5%
- Error rate <0.1%
- DB queries <100ms p90

### 12.2 Producto
- Proyectos creados/semana
- Conversión por fase
- GMV equipos vendidos
- Tiempo promedio por fase
- Satisfaction score (CSAT)

### 12.3 Negocio
- Revenue por proyecto
- Margen bruto >70%
- CAC <$500
- LTV >$30,000
- Churn <5% mensual

---

## 13. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Proveedores no adoptan sistema | Alta | Alto | Empezar manual, beneficios claros |
| Precios desactualizados | Media | Medio | Buffer 10%, actualización mensual |
| Complejidad UX | Media | Alto | User testing continuo, simplificar |
| Escalabilidad técnica | Baja | Alto | Arquitectura modular, cache agresivo |
| Competencia copia modelo | Media | Medio | Moat en datos y relaciones |

---

## 14. Decisiones Técnicas Clave

### 14.1 Por qué FastAPI + Next.js
- **FastAPI**: Async nativo, OpenAPI automático, validación Pydantic
- **Next.js**: SEO, SSR/SSG, App Router moderno
- **Separación**: Frontend puede cambiar sin afectar API

### 14.2 Por qué PostgreSQL + Redis
- **PostgreSQL**: JSONB para flexibilidad, transacciones ACID
- **Redis**: Cache de catálogo, queues de notificaciones

### 14.3 Por qué Agentes Modulares
- Cada agente es independiente
- Pueden escalar por separado  
- Fácil agregar nuevos agentes
- Testing aislado

---

## 15. Apéndices

### A. Glosario
- **BOM**: Bill of Materials (lista de equipos)
- **PO**: Purchase Order (orden de compra)
- **Lead time**: Tiempo de entrega
- **CAPEX**: Capital Expenditure
- **GMV**: Gross Merchandise Value

### B. Enlaces Relevantes
- Diseños Figma: [Link]
- API Docs: [Link]
- Roadmap Público: [Link]
- Analytics Dashboard: [Link]

### C. Contactos
- Product Owner: [Nombre]
- Tech Lead: [Nombre]
- UX Designer: [Nombre]

---

*Última actualización: Julio 2025*  
*Próxima revisión: Post-MVP (Octubre 2025)*