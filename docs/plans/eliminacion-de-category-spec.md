Sí. aquí spec/plan refinado para **eliminación total de `category`** en bulk-import, minimizando breakage.

**Objetivo**
- Quitar `category` de flujo bulk-import end-to-end.
- Cero bloqueo UX por category.
- Compat temporal con datos/payloads legacy.

**Scope**
- Solo bulk-import waste-stream/project.
- No tocar categorías de files/incoming materials/etc.

**Plan (2 PRs + cleanup)**
- PR1 — **Compat backend first** (sin romper FE/redesign)
- `backend/app/services/bulk_import_service.py`
  - dejar de persistir `normalized_data.category` en nuevos items.
  - dejar de persistir `project_data.bulk_import_category`.
  - agregar scrubber legacy antes de validar/finalizar (`pop("category", None)` en boundary).
- mantener modelos actuales en este PR (evitar corte de contrato inmediato).
- tests en `backend/tests/test_bulk_import.py`:
  - finalize funciona con rows legacy que traen category.
  - finalize funciona sin category.
  - nuevos proyectos no guardan `bulk_import_category`.

- PR2 — **Hard removal contract + frontend**
- backend:
  - quitar `category` de `NormalizedProjectDataV1` (`backend/app/models/bulk_import_output.py`).
  - quitar `category` de `BulkImportAIWasteStreamOutput` (`backend/app/models/bulk_import_ai_output.py`).
  - quitar merge/alternates de category en `backend/app/services/bulk_import_ai_extractor.py`.
  - actualizar prompt `backend/app/prompts/bulk-import-extraction.md` (sin category).
  - parser CSV/text: category column permitida pero ignorada; no dependencia para crear row (`backend/app/services/bulk_import_service.py`).
- frontend:
  - quitar field Category del drawer (`frontend/components/features/bulk-import/edit-item-drawer.tsx`).
  - quitar badges/render de category en review components (o nuevos componentes del redesign).
  - alinear tipos bulk-import en `frontend/lib/api/bulk-import.ts` y componentes nuevos.

- PR3 — **Docs/ops cleanup**
- actualizar docs/plans que dicen category requerido.
- query de verificación rollout: contar `import_items` con `normalized_data ? 'category'`.
- dejar nota de deprecación cerrada.

**Go/No-Go gates**
- `cd backend && make check` verde.
- `cd frontend && bun run check:ci` verde.
- smoke PDF + XLSX: upload -> review -> amend -> finalize OK.
- nuevos runs: `normalized_data` de project sin `category`.
- project importado abre questionnaire correctamente.

**Riesgos clave**
- romper finalize en rows legacy por `extra='forbid'` si no scrubbeas antes.
- deploy-order FE/BE (si BE hard-remove antes de FE, puede fallar amend payload viejo).
- extractor/schema mismatch si prompt/modelos no se cambian juntos.

Unresolved questions:
- ¿quieres mantener scrubber legacy permanente (recomendado) o solo durante 1-2 releases?
- ¿PR2 lo acoplamos al branch del redesign UI o lo hacemos backend-first y FE después de rebase?
- ¿quieres incluir script opcional de limpieza histórica (`normalized_data.category`) o solo fix-forward?
