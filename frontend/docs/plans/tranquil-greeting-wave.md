# Intake Panel Improvements

## ✅ Completed: Infinite Loop Fix
- `useShallow` en selectores de arrays (`intake-store.ts`)
- `getState()` en callbacks para evitar deps de subscription

---

## Mejoras Adicionales (Vercel Best Practices)

### 1. 🔴 CRÍTICO: Mutación fuera de immer
**Rule:** Immutability violation
**File:** `intake-panel-content.tsx:136-137`

```typescript
// ❌ Muta DESPUÉS de retornar del store - bypasses immer
const newSuggestion = mapNoteToField(noteId, fieldId, sectionId);
newSuggestion.fieldLabel = fieldLabel;      // Mutación directa!
newSuggestion.sectionTitle = sectionTitle;  // Mutación directa!
```

**Fix:** Actualizar firma de `mapNoteToField`:
```typescript
// intake-store.ts
mapNoteToField: (noteId, fieldId, sectionId, fieldLabel, sectionTitle) => {
  const newSuggestion: AISuggestion = {
    ...
    fieldLabel,      // ✅ Asignar dentro del store
    sectionTitle,    // ✅ Asignar dentro del store
  };
}

// intake-panel-content.tsx - simplificar callback
const handleMapNoteToField = useCallback(
  (noteId, fieldId, sectionId, fieldLabel, sectionTitle) => {
    mapNoteToField(noteId, fieldId, sectionId, fieldLabel, sectionTitle);
  },
  [mapNoteToField],
);
```

---

### 2. 🟡 MEDIO: fieldOptions sin memoizar
**Rule:** `rerender-memo` - Extract expensive work into memoized components
**File:** `unmapped-notes-section.tsx:70-83`

```typescript
// ❌ Recrea arrays en cada render
const fieldOptions = sections.flatMap(section => ...);
const groupedOptions = sections.map(section => ...);
```

**Fix:**
```typescript
const groupedOptions = useMemo(() =>
  sections.map((section) => ({
    sectionTitle: section.title,
    fields: section.fields.map((field) => ({
      fieldId: field.id,
      fieldLabel: field.label,
      sectionId: section.id,
      sectionTitle: section.title,
    })),
  })),
  [sections]
);
```

---

### 3. 🟢 BAJO: Count selector ineficiente
**Rule:** `js-combine-iterations` - Combine multiple iterations
**File:** `intake-store.ts:208-211`

```typescript
// ❌ filter() crea array temporal solo para .length
state.suggestions.filter((s) => s.status === "pending").length
```

**Fix (opcional):**
```typescript
// ✅ reduce() - single pass, no array allocation
state.suggestions.reduce((n, s) => n + (s.status === "pending" ? 1 : 0), 0)
```

---

## Plan de Implementación

| # | Tarea | Archivo | Vercel Rule |
|---|-------|---------|-------------|
| 1 | Actualizar `mapNoteToField` signature | `intake-store.ts:39-43, 152-184` | Immutability |
| 2 | Actualizar caller de mapNoteToField | `intake-panel-content.tsx:125-141` | - |
| 3 | Añadir useMemo a groupedOptions | `unmapped-notes-section.tsx:70-83` | `rerender-memo` |
| 4 | (Opcional) Optimizar count selector | `intake-store.ts:208-211` | `js-combine-iterations` |

## Verificación
1. `bun run check:ci` - must pass
2. Test: mapear nota unmapped → field label debe aparecer
3. Test: aplicar/rechazar/revertir sugerencias
4. Test: resolver conflictos
