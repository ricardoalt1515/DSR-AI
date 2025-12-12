# SDS Upload + Document Insights (Core-Reusable Plan)

## Context

DSR necesita incorporar el **upload de SDS** al flujo (`_docs/dsr-ai-platform.md`) para:
- que el usuario pueda subir SDS (normalmente PDFs),
- extraer información útil (peligrosidad, composición, transporte, manejo),
- y que el agente de propuesta (`backend/app/agents/proposal_agent.py`) lo tome en cuenta **igual que hoy toma fotos**.

Además, esto debe quedar construido de forma **reutilizable** para cuando integremos esta plataforma en H2O Allegiant (y para otros clientes), donde el valor equivalente es:
- extraer datos de reportes técnicos (p.ej. water lab reports, specs, permisos),
- sin rehacer la infraestructura ni bifurcar el código.

Este documento define **qué haremos, cómo y por qué**, y explica por qué descartamos opciones alternativas.

## Goals

- Añadir SDS upload + análisis AI + consumo por el agente de propuesta.
- Reutilizar el mismo pipeline para otros tipos de documentos (H2O, futuros clientes).
- Mantener outputs **estables** (apto para UI, QA y evoluciones).
- Evitar meter lógica “DSR-only” en el core.
- Minimizar cambios en BD (ideal: sin migraciones para el MVP).

## Non-goals (MVP)

- OCR completo para PDFs escaneados (se deja como Fase 2).
- Importar automáticamente datos del SDS al `project_data` (sin aprobación del usuario).
- Multi-tenant / marketplace / integraciones externas.

---

## Decisión de arquitectura (la base del diseño)

### Estándar: “Document Insights por archivo”

**Single source of truth** para análisis de archivos:
- `ProjectFile.processed_text` → texto extraído/resumen
- `ProjectFile.ai_analysis` → output estructurado (JSON)
- `ProjectFile.file_metadata` → meta/config de análisis (JSON)

Esto ya existe en el modelo actual (`backend/app/models/file.py`), por lo que el SDS encaja naturalmente.

### Por qué “por archivo” y no “document_insights en project_data”

Guardarlo en `ProjectFile` es mejor porque:
- auditoría: sabes qué insight vino de qué archivo y cuándo se generó,
- versionado natural (si suben un SDS nuevo, es otro file + otro analysis),
- evita mezclar “datos ingresados” (assessment) con “inferencias” sin control,
- habilita reuso: H2O puede subir reportes de laboratorio y analizarlos igual.

---

## `analysis_profile`: la pieza reusable

### Qué es

Un `analysis_profile` es un identificador genérico de “qué queremos extraer” del documento:
- `sds`
- `water_lab_report` (futuro)
- `permit` (futuro)
- etc.

### Dónde vive (MVP sin migración)

Guardar `analysis_profile` en `ProjectFile.file_metadata`, por ejemplo:
```json
{
  "analysis_profile": "sds",
  "schema_version": 1
}
```

Alternativa MVP aún más simple: derivar profile desde `category="sds"` (y persistirlo en metadata para consistencia).

### Por qué no usar `sector` para escoger prompt/behavior

`sector` (industrial/municipal) no identifica el tipo de documento:
- Un SDS y un lab report pueden venir del mismo sector.
- La extracción relevante depende más del **document type** que del sector.

Por eso, profile > sector.

---

## Backend plan

### 1) Permitir AI processing en PDF cuando corresponde

**Hoy** el upload limita AI processing a imágenes.

**Cambio propuesto (MVP):**
- permitir `process_with_ai=true` para PDFs cuando:
  - `category == "sds"` (o `analysis_profile == "sds"`).

Resultado:
- el usuario sube un SDS en PDF,
- el backend encola `process_file_with_ai(...)`,
- y termina con `processed_text` + `ai_analysis` en el `ProjectFile`.

### 2) Extender `DocumentProcessor` para PDF (extracción de texto)

`backend/app/services/document_processor.py` ya es un “router” y tiene el TODO de PDF.

**Implementación:**
- Añadir `_process_pdf(...)`:
  1) extraer texto localmente (sin IA) y normalizarlo,
  2) si el texto viene vacío/muy corto → marcar `needs_ocr=true` en `analysis` y retornar un resultado parcial,
  3) si hay texto → delegar a un analizador según `analysis_profile`.

**Librería de extracción (decisión):**
- Preferir una opción permissive para producción (p.ej. `pypdf`) por licensing y despliegue.
- Si más adelante se requiere mejor extracción, evaluar `PyMuPDF` (pero decidir por licencia antes).

### 3) Crear un `SDSAnalysisAgent` con output tipado

Nuevo agente:
- `backend/app/agents/sds_analysis_agent.py`
- Prompt: `backend/app/prompts/sds-analysis.md`
- Modelo Pydantic output: `backend/app/models/sds_analysis_output.py`

**Campos recomendados (MVP):**
- `summary` (string)
- `hazard_level` (None/Low/Moderate/High)
- `hazard_statements` (list[str])
- `pictograms` (list[str])
- `composition` (list de {name, cas?, percent?})
- `ppe` (list[str])
- `storage` (list[str])
- `transport` (obj: `un_number?`, `hazard_class?`, `packing_group?`)
- `disposal` (list[str])
- `compliance_flags` (list[str])
- `confidence` (High/Medium/Low)
- `missing_info` (list[str])

**Por qué tipado (Pydantic) y no `dict` libre**
- estabilidad para UI y para downstream (proposal agent),
- validación y fail-fast cuando el prompt/modelo cambie,
- facilita tests/evals (comparar outputs),
- reduce “prompt drift” en producción.

Podemos seguir guardando opcionalmente `raw` si queremos, pero el contrato principal debe ser estable.

### 4) Almacenar análisis con envelope (recomendado)

Guardar en `ProjectFile.ai_analysis` un envelope versionado:
```json
{
  "kind": "sds",
  "schema_version": 1,
  "summary": "…",
  "data": { "hazard_level": "Moderate", ... },
  "needs_ocr": false
}
```

Esto permite coexistir varios analizadores y versiones sin romper UI.

### 5) Propagar SDS al agente de propuesta (igual que fotos)

Hoy `ProposalService._load_attachments_summary` construye `photoInsights`.

**Extensión:**
- incluir `sdsInsights` buscando `ProjectFile.category == "sds"` y `ai_analysis != null`.
- pasar a `client_metadata.attachmentsSummary`:
```json
{
  "photoInsights": [...],
  "sdsInsights": [
    {
      "fileId": "...",
      "filename": "...",
      "uploadedAt": "...",
      "analysis": { "kind": "sds", "schema_version": 1, "data": {...} }
    }
  ]
}
```

Luego, en `backend/app/agents/proposal_agent.py`, inyectar un bloque:
- `SDS ANALYSIS:` con bullets y flags críticos.

**Por qué no pasar el PDF completo**
- costo de tokens,
- prompt injection surface,
- inestabilidad por longitud.

Pasamos “signals” (estructurados + pocos bullets), igual que hacemos con fotos.

---

## Frontend plan

### 1) UX para subir SDS

Hoy el uploader:
- marca fotos como `category="photos"` y activa `process_with_ai`,
- todo lo demás lo sube como `general` sin AI.

**Cambio MVP:**
- permitir seleccionar `category` (mínimo: `general`, `photos`, `sds`).
- si `category="sds"` y el archivo es PDF → `process_with_ai=true`.

### 2) Polling/refresh mientras SDS se procesa

Hoy hay auto-refresh solo si hay `photos` pendientes.

**Extensión:**
- si hay archivos `category in ("photos","sds")` con status no completado → refrescar lista.

### 3) Mostrar insights SDS

En el panel de detalle del archivo:
- mostrar `summary`,
- mostrar flags principales (hazard level, transporte, PPE),
- y un “raw JSON toggle” para debug (opcional).

No hace falta construir UI compleja en v1; basta con “hacer visible” el valor.

---

## Alternativas consideradas (y por qué no)

### Opción A: “DocumentAnalysisAgent genérico con `output_type=dict` + prompt por sector”

Pros:
- muy rápido de implementar.

Contras (razón para no elegirla como estándar de core):
- output inestable → UI difícil, QA difícil, rompe silenciosamente con cambios de prompt/modelo,
- “sector” no representa tipo de documento,
- aumenta deuda técnica para H2O (cada doc type termina en prompt hacks),
- más difícil comparar resultados y medir calidad.

Esta opción sirve para prototipo, pero no como base producible.

### Opción B: Guardar `document_insights` en `project.project_data`

Contras:
- mezcla inferencias con input del usuario,
- se pierde trazabilidad por archivo,
- complica reuso entre dominios,
- puede “ensuciar” el assessment y romper completitud/cálculos.

### Opción C: OCR desde el día 1

Contras:
- añade dependencias pesadas y edge cases,
- se vuelve un subproyecto (detección, idiomas, calidad de scan).

Mejor: v1 soporta PDFs con texto; v2 añade OCR (con feature flag).

---

## Implementación por fases

### Fase 1 (MVP producible)

1) Upload:
   - `category="sds"` disponible en UI.
   - permitir `process_with_ai=true` para PDF cuando `category="sds"`.
2) Backend:
   - PDF text extraction (sin OCR).
   - `SDSAnalysisAgent` + output tipado.
   - guardar `ai_analysis` envelope versionado.
3) Propuesta:
   - `attachmentsSummary.sdsInsights`
   - `proposal_agent.py` considera SDS.
4) UI:
   - mostrar insights básicos SDS.

### Fase 2 (mejora)

- OCR para PDFs escaneados + `needs_ocr` handling.
- “Apply to assessment”: permitir que el usuario aplique campos extraídos a `technical_sections` (con aprobación).
- Otros profiles (`water_lab_report`, `permit`, `spec`).

---

## Acceptance Criteria

- Un usuario puede subir un PDF SDS con `category="sds"` y ver:
  - que el archivo queda con `ai_analysis` y `processed_text` (o `needs_ocr=true` si vacío).
- Al generar propuesta:
  - el job incluye SDS en `attachmentsSummary`,
  - el output de la propuesta refleja riesgos/handling/composición cuando están presentes.
- El sistema queda reusable:
  - para H2O basta crear un nuevo `analysis_profile` y un agente tipado equivalente, sin cambiar el core.

---

## Notas de reuso hacia H2O Allegiant

Esta estrategia se alinea con el enfoque de core reutilizable (`_docs/CORE-STANDARDIZATION-PLAN.md`):
- pipeline de archivos es core,
- “profiles” y agentes son enchufables,
- la propuesta consume `attachmentsSummary` sin acoplarse a un dominio específico.

