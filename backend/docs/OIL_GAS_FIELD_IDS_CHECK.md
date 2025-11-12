# 🔍 Oil & Gas Template - Field IDs Verification

**Objetivo**: Verificar que todos los field IDs del template Oil & Gas existen en el parameter-library del frontend.

---

## 📋 Field IDs en Oil & Gas Template

### Section 1: `project-context` (5 campos)

| Field ID | Exists in Parameter Library | Status |
|----------|----------------------------|--------|
| `project-objective` | ✅ Yes | ✅ OK |
| `design-flow-rate` | ✅ Yes | ✅ OK |
| `treatment-goals` | ✅ Yes | ✅ OK |
| `production-type` | ❌ **MISSING** | ⚠️ **NEEDS CREATION** |
| `water-source` | ✅ Yes | ✅ OK |

### Section 2: `water-quality` (8 campos)

| Field ID | Exists in Parameter Library | Status |
|----------|----------------------------|--------|
| `ph` | ✅ Yes | ✅ OK |
| `tds` | ✅ Yes | ✅ OK |
| `tss` | ✅ Yes | ✅ OK |
| `tph` | ✅ Yes | ✅ OK |
| `cadmium` | ✅ Yes | ✅ OK |
| `chromium` | ✅ Yes | ✅ OK |
| `lead` | ✅ Yes | ✅ OK |
| `mercury` | ✅ Yes | ✅ OK |

### Section 3: `project-constraints` (2 campos)

| Field ID | Exists in Parameter Library | Status |
|----------|----------------------------|--------|
| `regulatory-requirements` | ✅ Yes | ✅ OK |
| `constraints` | ✅ Yes | ✅ OK |

### Section 4: `treatment-process` (4 campos)

| Field ID | Exists in Parameter Library | Status |
|----------|----------------------------|--------|
| `treatment-type` | ✅ Yes | ✅ OK |
| `process-units` | ✅ Yes | ✅ OK |
| `discharge-requirements` | ✅ Yes | ✅ OK |
| `reuse-objectives` | ✅ Yes | ✅ OK |

---

## ⚠️ MISSING FIELD: `production-type`

### Definición Requerida

```typescript
// frontend/lib/parameters/definitions/design.params.ts

{
  id: "production-type",
  label: "Production Type",
  category: "design",
  targetSection: "project-context",
  relevantSectors: ["industrial"],
  relevantSubsectors: ["oil_gas"],
  importance: "critical",
  type: "select",
  options: [
    "Upstream (Exploration & Production)",
    "Midstream (Transportation & Storage)",
    "Downstream (Refining & Processing)",
    "Offshore Production",
    "Onshore Production",
    "Enhanced Oil Recovery (EOR)",
    "Gas Processing",
    "Petrochemical"
  ],
  description: "Type of oil & gas production operation generating the water",
  placeholder: "Select production type",
  validationRule: (value) => {
    if (!value || value.trim() === "") {
      return false;
    }
    return true;
  },
  validationMessage: "Production type is required for oil & gas projects",
  suggestedSource: "manual"
}
```

---

## ✅ Resumen

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ **Exists** | 18 / 19 | 94.7% |
| ❌ **Missing** | 1 / 19 | 5.3% |

**Missing Field**: `production-type`

---

## 🚀 Acción Requerida

1. Agregar definición de `production-type` en `frontend/lib/parameters/definitions/design.params.ts`
2. Reiniciar frontend dev server
3. Probar creación de proyecto Oil & Gas
4. Verificar que el campo aparece en la UI

---

## 📝 Notas

- Todos los demás field IDs (18/19) ya existen en parameter-library
- Solo falta `production-type` que es específico de Oil & Gas
- Este campo es crítico para distinguir el tipo de operación petrolera

---

**Próximo paso**: Crear definición de `production-type` en parameter-library
