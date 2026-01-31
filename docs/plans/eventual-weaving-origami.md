# Plan: Standardized Industry Field

> Reemplazar `sector/subsector/industry` con `industry/subIndustry` usando taxonomía de 20 industrias principales.

## Contexto

**Solicitud del cliente:** Campo Industry estandarizado con dropdown, lista predefinida de industrias de waste/recycling.

**Estado actual:**
- `sector`: 5 valores (commercial, residential, industrial, municipal, other)
- `subsector`: ~15 valores anidados
- `industry`: texto libre auto-generado (redundante, marcado como technical debt)

**Decisión:** Reemplazar los 3 campos con `industry` + `subIndustry` usando taxonomía del documento de referencia.

---

## Archivos Críticos

| Capa | Archivo | Cambio |
|------|---------|--------|
| Config FE | `frontend/lib/sectors-config.ts` | Renombrar → `industries-config.ts`, nueva taxonomía |
| Model BE | `backend/app/models/company.py` | `sector/subsector/industry` → `industry/sub_industry` |
| Schema BE | `backend/app/schemas/company.py` | Actualizar campos |
| Types FE | `frontend/lib/types/company.ts` | Actualizar interfaces |
| Component | `frontend/components/shared/forms/compact-sector-select.tsx` | Renombrar → `compact-industry-select.tsx` |
| Form | `frontend/components/features/companies/create-company-dialog.tsx` | Usar nuevo selector |

---

## Fases de Implementación

### Fase 1: Configuración de Industrias (Frontend)

**Crear `frontend/lib/industries-config.ts`:**

```typescript
export type Industry =
  | "manufacturing_industrial"
  | "automotive_transportation"
  | "chemicals_pharmaceuticals"
  | "oil_gas_energy"
  | "mining_metals_materials"
  | "construction_infrastructure"
  | "packaging_paper_printing"
  | "food_beverage"
  | "agriculture_forestry"
  | "retail_wholesale_distribution"
  | "healthcare_medical"
  | "electronics_it_ewaste"
  | "utilities_public_services"
  | "hospitality_commercial_services"
  | "education_institutions"
  | "logistics_transportation_services"
  | "environmental_waste_services"
  | "consumer_goods_fmcg"
  | "financial_commercial_offices"
  | "specialty_high_risk";

export type SubIndustry =
  | "automotive_manufacturing"
  | "aerospace_manufacturing"
  // ... ~120 sub-industrias del documento
  | "other";

export interface IndustryConfig {
  id: Industry;
  label: string;
  subIndustries: { id: SubIndustry; label: string }[];
}

export const industriesConfig: IndustryConfig[] = [
  {
    id: "manufacturing_industrial",
    label: "Manufacturing & Industrial",
    subIndustries: [
      { id: "automotive_manufacturing", label: "Automotive Manufacturing" },
      { id: "aerospace_manufacturing", label: "Aerospace Manufacturing" },
      // ...
    ]
  },
  // ... 19 industrias más
];
```

**Helpers:** `getIndustryConfig()`, `getSubIndustries()`, `getIndustryBySubIndustry()`

---

### Fase 2: Backend Model + Migration

**2.1 Actualizar modelo `backend/app/models/company.py`:**

```python
# REMOVE:
# sector = Column(String(50), nullable=False, index=True)
# subsector = Column(String(100), nullable=False)
# industry = Column(String(100), nullable=False)

# ADD:
industry = Column(String(50), nullable=False, index=True)  # manufacturing_industrial, food_beverage, etc.
sub_industry = Column(String(100), nullable=False)  # automotive_manufacturing, hospitals, etc.
```

**2.2 Crear migración:**

```python
# backend/alembic/versions/YYYYMMDD_HHMM_replace_sector_with_industry.py

def upgrade():
    # Drop old columns
    op.drop_index('ix_companies_sector', 'companies')
    op.drop_column('companies', 'sector')
    op.drop_column('companies', 'subsector')
    op.drop_column('companies', 'industry')

    # Add new columns
    op.add_column('companies', sa.Column('industry', sa.String(50), nullable=False, server_default='other'))
    op.add_column('companies', sa.Column('sub_industry', sa.String(100), nullable=False, server_default='other'))
    op.create_index('ix_companies_industry', 'companies', ['industry'])

    # Remove server defaults
    op.alter_column('companies', 'industry', server_default=None)
    op.alter_column('companies', 'sub_industry', server_default=None)

def downgrade():
    # Reverse (restore sector/subsector/industry)
    ...
```

---

### Fase 3: Backend Schemas

**Actualizar `backend/app/schemas/company.py`:**

```python
class CompanyBase(BaseSchema):
    name: str = Field(..., min_length=1, max_length=255)
    industry: str = Field(..., min_length=1, max_length=50, description="Primary industry classification")
    sub_industry: str = Field(..., min_length=1, max_length=100, description="Specific sub-industry")
    # Remove: sector, subsector
```

---

### Fase 4: Frontend Types

**Actualizar `frontend/lib/types/company.ts`:**

```typescript
import type { Industry, SubIndustry } from "@/lib/industries-config";

export interface CompanyBase {
  name: string;
  industry: Industry;      // was: sector
  subIndustry: SubIndustry; // was: subsector
  // Remove: industry (the old redundant one)
}
```

---

### Fase 5: UI Components

**5.1 Renombrar y actualizar selector:**
- `compact-sector-select.tsx` → `compact-industry-select.tsx`
- Cambiar props: `sector/subsector` → `industry/subIndustry`
- Usar `industriesConfig` en lugar de `sectorsConfig`

**5.2 Actualizar `create-company-dialog.tsx`:**
- Usar `<CompactIndustrySelect>`
- Remover lógica de auto-generación de `industry`

---

### Fase 6: Propagación de Cambios

**Archivos que requieren search-and-replace:**

| Área | Archivos | Cambio |
|------|----------|--------|
| Project model | `project.py`, `project.py` schemas | sector→industry, subsector→sub_industry |
| User model | `user.py`, schemas | sector→industry, subsector→sub_industry |
| API dependencies | `dependencies.py` | `SectorFilter` → `IndustryFilter` |
| API routes | `projects.py`, `companies.py` | Actualizar filtros y lógica |
| Services | `proposal_service.py`, `project_data_service.py` | Actualizar referencias |
| Agents | `proposal_agent.py` | client_metadata keys |
| Tests | `conftest.py`, todos los tests | Actualizar fixtures |
| Frontend stores | `company-store.ts`, `project-store.ts` | Actualizar state |
| Frontend pages | `companies/page.tsx`, `dashboard/page.tsx` | Actualizar displays |

---

### Fase 7: Contexto para IA (sectorApplications → industryApplications)

El archivo `sectors-config.ts` tiene `sectorApplications` con parámetros y prioridades por sector/subsector. Crear equivalente:

```typescript
export const industryApplications = {
  manufacturing_industrial: {
    automotive_manufacturing: {
      commonParameters: ["heavy-metals", "oils", "solvents", "scrap-metal"],
      priorities: ["regulatory-compliance", "cost-recovery", "sustainability"],
      description: "Automotive manufacturing waste streams"
    },
    // ...
  },
  // ...
};
```

**Nota:** Esto requiere definir parámetros específicos por industria. Puede hacerse incremental.

---

## Orden de Ejecución

1. `industries-config.ts` - nueva configuración
2. Backend migration + model
3. Backend schemas
4. Frontend types
5. `compact-industry-select.tsx` - nuevo componente
6. `create-company-dialog.tsx` - actualizar formulario
7. Propagación en ~50 archivos restantes
8. Tests

---

## Verificación

```bash
# Backend
cd backend && make check

# Frontend
cd frontend && bun run check:ci

# Tests
cd backend && make test
cd frontend && bun test
```

**Manual:**
1. Crear nueva company → verificar dropdown con 20 industrias
2. Seleccionar industria → verificar sub-industrias filtradas
3. Guardar company → verificar persistencia
4. Editar company → verificar valores pre-poblados

---

## Decisiones Tomadas

1. **industryApplications:** Dejar para iteración futura. Crear estructura vacía, rellenar cuando se necesite.
2. **Alcance:** Reemplazar sector/subsector en **todos los modelos** (Company, Project, User) para consistencia total.

---

## Estimación

- **Fase 1-4 (Core):** ~4 horas - Config, model, schemas, types
- **Fase 5-6 (UI + Propagación):** ~3 horas - Componentes y 50+ archivos
- **Fase 7 (Tests):** ~1 hora - Actualizar fixtures y tests
- **Total:** ~8 horas de implementación
