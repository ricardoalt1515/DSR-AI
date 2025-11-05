# 🔄 Plan de Migración: H2O Allegiant → DSR Platform

**Versión:** 1.0 | **Fecha:** Noviembre 2024

---

## 📋 Resumen Ejecutivo

Migrar plataforma de tratamiento de agua a gestión de residuos industriales, manteniendo arquitectura base (FastAPI + Next.js + Pydantic-AI).

**Cambio Fundamental:**
```
ANTES: Usuario → Proyecto → Propuesta
AHORA: Usuario (Sales Agent) → Empresa → Ubicación → Evaluación → Reporte
```

---

## 🏢 Flujo de Negocio DSR

### Ejemplo Real de Uso

```
🏢 EMPRESA: Honda Manufacturing de México

   📍 UBICACIÓN 1: Planta Guadalajara
      📋 Evaluación A: Madera desperdiciada (45 ton/mes)
         - Estado: Bajo revisión
         - Agente: Carlos Ramírez
      
      📋 Evaluación B: Plástico HDPE (12 ton/mes)
         - Estado: Aprobado - $3,200/mes
         - Agente: Carlos Ramírez

   📍 UBICACIÓN 2: Planta Celaya  
      📋 Evaluación C: Chatarra metálica (80 ton/mes)
         - Estado: Aprobado - $96,000/mes
         - Agente: María González

   📍 UBICACIÓN 3: Centro Logístico Querétaro
      📋 Evaluación D: Cartón corrugado (20 ton/mes)
         - Estado: Rechazado (margen <10%)
         - Agente: Juan López
```

### ¿Por qué esta estructura?

**Problema:** Los sales agents van a empresas (ej: Honda) que tienen **múltiples ubicaciones/plazas** (Guadalajara, Celaya, Querétaro). Cada ubicación tiene **diferentes tipos de residuos** que quieren vender.

**Solución:** Jerarquía de 3 niveles
1. **Company** (Empresa) - Honda Manufacturing
2. **Location** (Ubicación/Plaza) - Planta Guadalajara
3. **Assessment** (Evaluación) - Madera 45 ton/mes

**Beneficios:**
- ✅ Reutilizar info de empresa entre agentes
- ✅ Histórico completo por ubicación
- ✅ Reporting consolidado por empresa
- ✅ Gestión territorial (asignar estados a agentes)

---

## 🗂️ Modelo de Datos

### Nuevos Modelos (3 principales)

#### 1. Company (Empresa Cliente)
```python
class Company(BaseModel):
    name = "Honda Manufacturing de México"
    legal_name = "Honda de México S.A. de C.V."
    rfc = "HMX950101ABC"
    industry = "Automotive"
    primary_contact_name = "Juan Pérez"
    primary_contact_email = "[email protected]"
    
    # Relaciones
    locations = relationship("Location")  # Múltiples ubicaciones
```

#### 2. Location (Ubicación/Plaza)
```python
class Location(BaseModel):
    company_id = UUID  # FK → companies
    name = "Planta Guadalajara"
    location_type = "manufacturing"  # o warehouse, distribution_center
    
    # Dirección completa
    address = "Av. Industrial 123"
    city = "Guadalajara"
    state = "Jalisco"
    zip_code = "44940"
    
    # Coordenadas para mapa
    latitude = 20.6597
    longitude = -103.3496
    
    # Relaciones
    company = relationship("Company")
    assessments = relationship("Assessment")  # Múltiples evaluaciones
```

#### 3. Assessment (Evaluación de Residuos)
**Antes:** `Project` | **Ahora:** `Assessment`

```python
class Assessment(BaseModel):
    location_id = UUID  # FK → locations
    user_id = UUID      # Sales agent que hizo la evaluación
    
    name = "Madera desperdiciada - Nov 2024"
    waste_type = "wood"  # wood, plastic, metal, cardboard, etc.
    waste_subtype = "mixed_hardwood"
    volume_monthly = 45.0  # toneladas
    
    status = "Under Review"  # Draft, Under Review, Approved, Rejected
    
    # 🔥 JSONB FLEXIBLE (igual que antes, solo cambia el contenido)
    assessment_data = {
        "questionnaire_sections": [
            {
                "section": "Waste Stream Information",
                "fields": [
                    {"key": "waste_type", "value": "Wood"},
                    {"key": "volume_monthly", "value": 45},
                    {"key": "current_disposal_cost", "value": 120}
                ]
            },
            {
                "section": "Material Characteristics",
                "fields": [
                    {"key": "contamination_level", "value": "Low"},
                    {"key": "moisture_content", "value": "15%"}
                ]
            }
        ]
    }
    
    # Relaciones
    location = relationship("Location")
    proposals = relationship("Proposal")  # Reportes generados por IA
```

### Jerarquía Visual

```
User (Sales Agent)
  ↓
Company (Honda Manufacturing)
  ├─ Location (Planta Guadalajara)
  │    ├─ Assessment (Madera 45 ton/mes)
  │    │    ├─ Proposal (Reporte IA: GO - $1,850/mes)
  │    │    └─ Files (Fotos, docs)
  │    └─ Assessment (Plástico 12 ton/mes)
  │         └─ Proposal (Reporte IA: GO - $3,200/mes)
  └─ Location (Planta Celaya)
       └─ Assessment (Metal 80 ton/mes)
            └─ Proposal (Reporte IA: GO - $96,000/mes)
```

---

## 🔐 Sistema de Roles y Permisos

### Roles Definidos

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| **Admin** | Gerencia, IT | Ver TODO, editar TODO, aprobar, eliminar |
| **Sales Manager** | Jefe de ventas | Ver TODO, editar TODO, aprobar, NO eliminar |
| **Sales Agent** | Agente de campo | Solo VE lo suyo, crea evaluaciones, NO aprueba |
| **Viewer** | Analista, contabilidad | Solo lectura de TODO |

### Actualización en User Model

```python
class User(BaseModel):
    # ... campos existentes ...
    
    # 🆕 NUEVO: Sistema de roles
    role = "sales_agent"  # admin, sales_manager, sales_agent, viewer
    
    # 🆕 Territorios asignados
    assigned_territories = ["Jalisco", "Guanajuato", "Querétaro"]
    
    # 🆕 Permisos granulares (override)
    permissions = {
        "can_approve": False,
        "can_delete": False,
        "can_view_all": False
    }
    
    # 🆕 Metadatos
    employee_id = "SA-001"
    department = "Sales"
    phone = "+52 33 1234 5678"
```

### Lógica de Permisos en API

```python
# backend/app/api/v1/assessments.py

@router.get("/assessments")
async def get_assessments(current_user: User = Depends(get_current_user)):
    """
    Admin/Manager: Ven todos
    Sales Agent: Solo los que creó él
    """
    if current_user.role in ["admin", "sales_manager", "viewer"]:
        return await assessment_service.get_all()
    else:
        return await assessment_service.get_by_user(current_user.id)

@router.post("/assessments/{id}/approve")
async def approve_assessment(
    id: UUID,
    current_user: User = Depends(require_role(["admin", "sales_manager"]))
):
    """Solo admin y sales_manager pueden aprobar"""
    return await assessment_service.approve(id, current_user)
```

---

## 🤖 Agente de IA: De Agua a Residuos

### Cambios en el Prompt

**Antes (Agua):**
```markdown
You are a water treatment engineer...
Calculate BOD removal, size reactors, design treatment train...
```

**Ahora (Residuos):**
```markdown
You are a waste management and circular economy expert for DSR Inc.

MISSION: Analyze if a waste stream is PROFITABLE to purchase.

FRAMEWORK:
1. Material Valuation
   - Current market price (RecyclingMarkets.net)
   - Quality grade (A/B/C based on contamination)
   - Volume consistency

2. Financial Analysis
   - Purchase price recommendation ($/ton)
   - Transportation costs (origin → DSR buyer)
   - Processing costs
   - Resale revenue
   - Net margin calculation

3. Risk Assessment
   - Market volatility
   - Regulatory compliance (RCRA, DOT)
   - Storage requirements

4. Recommendation
   - GO (margin >15%) vs NO-GO
   - Pricing strategy
   - Long-term relationship potential
```

### Herramientas del Agente (Tools)

**Reemplazar herramientas de agua por herramientas de residuos:**

```python
# backend/app/agents/tools/waste_valuation.py

@proposal_agent.tool
def calculate_waste_value(
    waste_type: str,  # "wood", "plastic_hdpe", "metal_aluminum"
    volume_tons: float,
    quality_grade: str,  # "A", "B", "C"
    market_region: str  # "north_mexico", "central_mexico"
) -> dict:
    """
    Calculate market value using REAL commodity prices.
    Data source: RecyclingMarkets.net, ScrapMonster API
    """
    # Precios base por tipo y calidad ($/ton)
    market_prices = {
        "wood": {"A": 45, "B": 30, "C": 15},
        "plastic_hdpe": {"A": 350, "B": 200, "C": 50},
        "metal_aluminum": {"A": 1200, "B": 800, "C": 400},
        "cardboard": {"A": 85, "B": 55, "C": 25}
    }
    
    base_price = market_prices.get(waste_type, {}).get(quality_grade, 0)
    regional_factor = get_regional_multiplier(market_region)
    
    return {
        "base_value_per_ton": base_price,
        "regional_multiplier": regional_factor,
        "adjusted_value": base_price * regional_factor,
        "total_monthly_value": volume_tons * base_price * regional_factor
    }

@proposal_agent.tool
def calculate_transportation_cost(
    origin_zip: str,
    destination_zip: str,
    volume_tons: float,
    material_class: str  # "hazmat" o "non-hazmat"
) -> dict:
    """Calculate trucking costs using industry rates."""
    distance_miles = get_distance(origin_zip, destination_zip)
    
    rates = {
        "non-hazmat": 0.15,  # $/ton-mile
        "hazmat": 0.35
    }
    
    cost_per_ton = distance_miles * rates[material_class]
    
    return {
        "distance_miles": distance_miles,
        "cost_per_ton": cost_per_ton,
        "total_monthly_cost": volume_tons * cost_per_ton
    }

@proposal_agent.tool
def assess_profitability(
    resale_value_per_ton: float,
    purchase_price_per_ton: float,
    transportation_cost_per_ton: float,
    processing_cost_per_ton: float,
    volume_monthly: float
) -> dict:
    """Calculate net margin and GO/NO-GO recommendation."""
    cost_per_ton = purchase_price_per_ton + transportation_cost_per_ton + processing_cost_per_ton
    margin_per_ton = resale_value_per_ton - cost_per_ton
    margin_pct = (margin_per_ton / resale_value_per_ton) * 100 if resale_value_per_ton > 0 else 0
    
    monthly_revenue = resale_value_per_ton * volume_monthly
    monthly_cost = cost_per_ton * volume_monthly
    monthly_profit = monthly_revenue - monthly_cost
    
    return {
        "margin_per_ton": margin_per_ton,
        "margin_percentage": margin_pct,
        "monthly_revenue": monthly_revenue,
        "monthly_profit": monthly_profit,
        "recommendation": "GO" if margin_pct >= 15 else "NO-GO",
        "confidence": "High" if margin_pct > 20 else "Medium" if margin_pct > 10 else "Low"
    }
```

### Cambio en ProposalOutput

```python
# backend/app/models/proposal_output.py

class WasteProposalOutput(BaseModel):
    """Output del agente de IA para evaluaciones de residuos."""
    
    # Resumen ejecutivo
    recommendation: str  # "GO" o "NO-GO"
    confidence_level: str  # "High", "Medium", "Low"
    executive_summary: str
    
    # Análisis financiero
    financial_analysis: dict = {
        "resale_value_per_ton": 350.0,
        "purchase_price_recommendation": 180.0,
        "transportation_cost": 25.0,
        "processing_cost": 15.0,
        "net_margin_per_ton": 130.0,
        "margin_percentage": 37.1,
        "monthly_profit": 5850.0,
        "annual_profit": 70200.0
    }
    
    # Análisis de material
    material_analysis: dict = {
        "waste_type": "Plastic HDPE",
        "quality_grade": "B",
        "contamination_level": "Low",
        "market_demand": "High",
        "price_stability": "Moderate"
    }
    
    # Riesgos
    risk_assessment: dict = {
        "market_volatility": "Medium",
        "volume_consistency": "High",
        "regulatory_compliance": "Compliant",
        "key_risks": ["Price fluctuation in Q2", "Storage capacity"]
    }
    
    # Estrategia de compra
    purchase_strategy: dict = {
        "recommended_price_range": "170-190 $/ton",
        "contract_type": "Monthly recurring",
        "payment_terms": "Net 30",
        "volume_commitment": "12 tons/month minimum"
    }
    
    # Markdown completo (para mostrar en frontend)
    markdown_content: str
```

---

## 🎨 Frontend: UI/UX Changes

### Paleta de Colores DSR

**Del sitio web identifiqué:**
- Verde forestal oscuro (principal)
- Blanco/gris claro (fondos)
- Naranja/amarillo (CTAs y acentos)

```css
/* frontend/app/globals.css */

:root {
  /* DSR Brand Colors */
  --primary: oklch(0.45 0.12 145);      /* Verde forestal DSR */
  --primary-foreground: oklch(0.99 0.002 140);
  
  --accent: oklch(0.65 0.18 45);        /* Naranja para CTAs */
  --accent-foreground: oklch(0.15 0.02 45);
  
  --success: oklch(0.60 0.15 145);      /* Verde éxito */
  --warning: oklch(0.70 0.16 70);       /* Amarillo */
  
  --background: oklch(0.98 0.005 140);  /* Verde muy claro */
  --foreground: oklch(0.20 0.02 140);   /* Verde oscuro */
}
```

### Cambios de Terminología

| Antes (Agua) | Ahora (Residuos) |
|--------------|------------------|
| Projects | Assessments |
| Water Treatment | Waste Management |
| Proposals | Buy/No-Buy Reports |
| Technical Data | Material Evaluation |
| Treatment Train | Processing Route |
| BOD/COD Levels | Material Quality |
| Flow Rate (m³/d) | Volume (tons/month) |

### Componentes Nuevos

#### 1. Dashboard de Admin
```typescript
// components/features/admin/AdminDashboard.tsx
export function AdminDashboard() {
  return (
    <>
      {/* Performance por agente */}
      <SalesAgentPerformance />
      
      {/* Mapa de evaluaciones */}
      <AssessmentMap regions={["Jalisco", "Guanajuato"]} />
      
      {/* Pipeline de deals */}
      <DealPipeline stages={["New", "Under Review", "Approved"]} />
      
      {/* Top materiales */}
      <TopMaterialsByMargin />
    </>
  )
}
```

#### 2. Assessment Card (antes ProjectCard)
```typescript
<AssessmentCard
  company="Honda Manufacturing"
  location="Planta Guadalajara"
  material="Wood - Mixed Hardwood"
  volume="45 tons/month"
  status="Under Review"
  estimatedValue="$1,850/month"
  margin={37}
  agent="Carlos Ramírez"
  createdAt="2024-11-15"
/>
```

#### 3. Company & Location Manager
```typescript
// app/companies/page.tsx
export default function CompaniesPage() {
  return (
    <CompanyList>
      <CompanyCard name="Honda" locations={3} assessments={5} />
      <CompanyCard name="Toyota" locations={2} assessments={3} />
    </CompanyList>
  )
}

// app/companies/[id]/locations/page.tsx
export default function LocationsPage({ companyId }) {
  return (
    <LocationList companyId={companyId}>
      <LocationCard 
        name="Planta Guadalajara"
        city="Guadalajara, Jalisco"
        assessments={2}
        monthlyValue="$5,050"
      />
    </LocationList>
  )
}
```

---

## 📅 Plan de Implementación

### Fase 1: Backend Core (2 semanas)
**Semana 1:**
- [ ] Crear modelos `Company`, `Location`
- [ ] Migrar `Project` → `Assessment`
- [ ] Actualizar `User` con roles y permisos
- [ ] Escribir migración de Alembic

**Semana 2:**
- [ ] CRUD APIs para Companies y Locations
- [ ] Actualizar APIs de Assessments con permisos
- [ ] Middleware de autorización por rol
- [ ] Tests unitarios de permisos

### Fase 2: Agente de IA (1.5 semanas)
**Días 1-3:**
- [ ] Nuevo prompt `waste-assessment.v1.md`
- [ ] Herramientas: `calculate_waste_value`
- [ ] Herramientas: `calculate_transportation_cost`
- [ ] Herramientas: `assess_profitability`

**Días 4-7:**
- [ ] Actualizar `ProposalOutput` para residuos
- [ ] Integrar APIs de precios de mercado
- [ ] Tests de herramientas con datos reales
- [ ] Validación de reportes generados

### Fase 3: Frontend (2 semanas)
**Semana 1:**
- [ ] Paleta de colores DSR (globals.css)
- [ ] Módulo Companies (CRUD)
- [ ] Módulo Locations (CRUD)
- [ ] Renombrar Project → Assessment en todo el código

**Semana 2:**
- [ ] Dashboard de Admin con métricas
- [ ] Filtros por rol (sales agent solo ve lo suyo)
- [ ] Assessment cards con nuevos datos
- [ ] Actualizar todos los textos UI

### Fase 4: Testing & Deploy (1 semana)
- [ ] Tests E2E de flujo completo
- [ ] Tests de permisos (admin vs sales agent)
- [ ] Seed data de ejemplo (Honda con 3 ubicaciones)
- [ ] Documentación de APIs
- [ ] Deploy a staging
- [ ] Training para usuarios

**Total estimado:** 6.5 semanas

---

## ✅ Checklist de Migración

### Backend
- [ ] `models/company.py` creado
- [ ] `models/location.py` creado
- [ ] `models/project.py` → `models/assessment.py` renombrado
- [ ] `models/user.py` actualizado con roles
- [ ] `api/v1/companies.py` creado
- [ ] `api/v1/locations.py` creado
- [ ] `api/v1/projects.py` → `api/v1/assessments.py`
- [ ] `core/permissions.py` creado
- [ ] `agents/tools/waste_valuation.py` creado
- [ ] `prompts/waste-assessment.v1.md` creado
- [ ] Migración Alembic ejecutada

### Frontend
- [ ] `globals.css` con colores DSR
- [ ] `companies/` módulo creado
- [ ] `project/` → `assessment/` renombrado
- [ ] `admin/` dashboard creado
- [ ] `lib/stores/project-store.ts` → `assessment-store.ts`
- [ ] Tipos TypeScript actualizados
- [ ] Todos los textos cambiados (Agua → Residuos)
- [ ] Tests actualizados

### Base de Datos
- [ ] Backup de producción
- [ ] Migración en staging validada
- [ ] Datos de prueba cargados
- [ ] Rollback plan documentado

---

## 🚨 Riesgos y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Pérdida de datos en migración | Media | Alto | Backup completo + rollback plan + dry-run en staging |
| Permisos mal configurados | Alta | Alto | Tests automatizados por rol + code review |
| APIs de precios no disponibles | Media | Medio | Fallback a precios estáticos + caché Redis |
| Resistencia de usuarios | Media | Medio | Training + documentación + soporte 1:1 |
| Bugs en jerarquía 3 niveles | Alta | Medio | Tests E2E exhaustivos + staging prolongado |

---

## 📚 Documentos Complementarios

Crear después:
1. `PERMISSIONS_GUIDE.md` - Guía detallada de permisos
2. `API_MIGRATION.md` - Mapping de endpoints viejos → nuevos
3. `USER_MANUAL.md` - Manual para sales agents
4. `ADMIN_MANUAL.md` - Manual para administradores

---

## 🎯 Siguiente Paso

¿Por dónde empezamos?

**Opción A:** Backend (modelos + migración DB)  
**Opción B:** Agente de IA (nuevas herramientas)  
**Opción C:** Frontend (paleta de colores + UI)  

**Recomendado:** Empezar por **Backend (Opción A)** - Es la base de todo.
