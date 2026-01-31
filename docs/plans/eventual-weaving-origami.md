# Plan: Standardized Industry Field (UI-Only)

> Cambiar labels de "Sector/Subsector" a "Industry/Sub-Industry" + nueva taxonomía. **Cero migraciones.**

## Decisión

Reusar campos existentes `sector/subsector` pero presentarlos como "Industry/Sub-Industry" en la UI.

| Capa | Campo interno | Label en UI |
|------|---------------|-------------|
| DB | `sector` | - |
| API | `sector` | - |
| Frontend | `sector` | **"Industry"** |
| DB | `subsector` | - |
| API | `subsector` | - |
| Frontend | `subsector` | **"Sub-Industry"** |

---

## Archivos a Modificar (3 archivos)

### 1. `frontend/lib/sectors-config.ts`

Actualizar la taxonomía con las 20 industrias del documento de referencia:

```typescript
export type Sector =  // Mantener nombre interno
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

export type Subsector =
  | "automotive_manufacturing"
  | "aerospace_manufacturing"
  // ... ~120 sub-industrias del documento
  | "other";

export const sectorsConfig: SectorConfig[] = [
  {
    id: "manufacturing_industrial",
    label: "Manufacturing & Industrial",  // Label visible al usuario
    subsectors: [
      { id: "automotive_manufacturing", label: "Automotive Manufacturing" },
      { id: "aerospace_manufacturing", label: "Aerospace Manufacturing" },
      // ...
    ]
  },
  // ... 19 industrias más
];
```

### 2. `frontend/components/shared/forms/compact-sector-select.tsx`

Cambiar labels de UI:

```diff
- <Label>Sector</Label>
+ <Label>Industry</Label>

- <Label>Subsector</Label>
+ <Label>Sub-Industry</Label>

- placeholder="Select sector..."
+ placeholder="Select industry..."

- placeholder="Select subsector..."
+ placeholder="Select sub-industry..."
```

### 3. Cualquier otro lugar que muestre "Sector" al usuario

Buscar y reemplazar labels en:
- `company-card.tsx` (si muestra "Sector: X")
- `companies/[id]/page.tsx` (detail view)
- Otros componentes de display

---

## Verificación

```bash
# Frontend checks
cd frontend && bun run check:ci

# Manual testing
1. Crear company → dropdown muestra "Industry" con 20 opciones
2. Seleccionar industria → "Sub-Industry" filtra opciones
3. Labels dicen "Industry/Sub-Industry" en toda la UI
```

---

## Estimación

| Tarea | Tiempo |
|-------|--------|
| Actualizar sectorsConfig con 20 industrias | 20 min |
| Cambiar labels en componentes | 10 min |
| Testing | 10 min |
| **Total** | **~40 min** |

---

## Nota sobre el campo `industry` redundante

El campo `industry` en Company (texto auto-generado) sigue existiendo pero es irrelevante para este cambio. Se puede eliminar en una tarea separada de technical debt.
