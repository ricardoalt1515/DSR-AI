# SPEC-REFOCUS-2025: Replanteamiento del Producto y Especificación de Implementación

Fecha: 2025-10-11
Estado: Propuesto (listo para implementar)
Autores: Producto + Ingeniería

---

## 1. Executive Summary

- **Qué sí está bien hoy**
  - **Visión acertada**: “hub” para ingenieros, IA como copiloto, versionado y transparencia.
  - **Arquitectura base**: FastAPI + Postgres + Redis + Next.js + Pydantic. Correcta.
  - **Conversión**: Fase 1.5/2 con CTA “Ingeniería Detallada ($7,500)” bien planteada.
- **Desalineaciones/gaps**
  - UI post-propuesta muy “viewer”; falta orientar a decisión + conversión.
  - “Project OS” (hitos, versioning UX, tareas) aún subdesarrollado.
  - Agentes futuros (BOM, Procurement) con diseño conceptual, falta camino de datos y endpoints.
  - Código legacy con hardcode en `h2oallegiant/lib/engines/proposal-engine.ts` (no usado). Debe deprecarse.
- **Recomendación clave**
  - Enfocar como “Engineer OS for Water Projects” con tres momentos: 1) Generar → 2) Decidir → 3) Ejecutar.
  - Alinear UI de Propuesta a 4 bloques TIER 1: `InstantInsightsGrid`, `SmartRecommendations`, `IndustryComparison`, `NextStepsCTA`.
  - Aterrizar un “Camino de datos” para Procurement: BOM tipado → RFQs → Quotes → Ranking → PO.

---

## 2. Visión Refinada

- **Producto**: Plataforma operativa para ingenieros de agua que centraliza datos, versiones, decisiones y ejecución (de propuesta a compra).
- **Pilares**
  - Single Source of Truth: Ficha técnica central + versionado JSON.
  - Transparencia IA: razonamiento, supuestos, casos probados, alternativas.
  - Determinismo + IA: límites y cálculos deterministas; IA para justificación/benchmark.
  - Conversión: guiar de insight → decisión → pago (Fase 2).
- **North Star Metric**: Proyectos que pasan a Ingeniería Detallada (Fase 2).

---

## 3. Personas y JTBD

- **Ingeniero de tratamiento**: preparar propuestas rápido, con confianza y trazabilidad; ejecutar compras sin caos.
- **Consultora/PM**: visibilidad de estado, hitos y decisiones; orden documental.

---

## 4. Flujo End-to-End

```mermaid
flowchart LR
A[Captura de Datos] --> B[Propuesta Conceptual (Agente IA)]
B --> C[Revisión Interactiva (Insights, Benchmarks, Recos)]
C -->|CTA Aprobación| D[Ingeniería Detallada ($)]
D --> E[BOM & P&IDs]
E --> F[Procurement Agent: RFQs→Quotes→Ranking]
F --> G[Orden de Compra/Conexión Proveedor]
G --> H[Seguimiento & Cierre]
C -->|Solicitar Cambios| A
```

---

## 5. Alcance por Fases

- **Fase 1 (hoy)**: Generación conceptual + UI post-propuesta.
  - Scope: Transparencia IA, insights, descarga PDF.
  - No-scope: pagos, BOM, procurement.
- **Fase 1.5 (Hook de decisión)**: Instant insights, recomendaciones, comparativas, CTA siguiente paso.
- **Fase 2 (Ingeniería Detallada $7,500)**: P&IDs, BOM preliminar, especificaciones, checkout (Stripe), SLA 48h.
- **Fase 3 (Procurement $4,500 + 1% GMV)**: Agente de cotizaciones, ranking, RFQs automáticos, PO.

---

## 6. Especificación de UX/UI

- **Project OS** (`h2oallegiant/app/project/[id]/`)
  - Tabs: `Datos`, `Propuestas`, `Archivos`, `Historial`.
  - Ficha técnica central editable (badges de origen: `AI`, `Import`, `User`).
  - Timeline de versiones/hitos (quién cambió qué y cuándo).

- **Propuesta (post-generación)**
  - TIER 1 (críticos para conversión):
    - `InstantInsightsGrid` → Compliance, CAPEX/OPEX, timeline, ROI.
    - `SmartRecommendations` → derivadas de `aiMetadata.alternatives` con beneficios y confianza.
    - `IndustryComparison` → Benchmarks desde proven cases (promedios sectoriales).
    - `NextStepsCTA` → oferta “Ingeniería Detallada”, precio dinámico (p.ej., 5% CAPEX), trust.
  - Soporte existente y alineado con “no hardcode”:
    - `EquipmentListImproved`, `ProblemSolutionHero`, `TreatmentEfficiency/Water Transformation`, `AITransparency`.

- **Procurement UI (Fase 3)**
  - “Procurement Wizard”:
    - Paso 1: BOM confirmado.
    - Paso 2: RFQs generadas (tracking: enviado/abierto/respondido).
    - Paso 3: Comparativa (precio, entrega, garantía, proveedor score).
    - Paso 4: Selección + PO.

---

## 7. Arquitectura Técnica

- **Frontend**: Next.js + TypeScript + shadcn/ui; stores tipo Zustand (`h2oallegiant/lib/stores/`).
- **Backend**: FastAPI + Postgres + Redis, tareas pesadas con Celery.
- **IA**: Agentes en `backend-h2o/app/agents/`:
  - `proposal_agent.py` (Pydantic validation, reasoning, deviation logging).
  - Futuros: `bom_designer_agent.py`, `procurement_agent.py`.
- **Storage**: S3/MinIO (PDFs/archivos).
- **Observabilidad**: Logs estructurados, métricas de uso, Sentry.

---

## 8. Modelo de Datos (DB)

- **Core**
  - `projects(id, name, client, sector, location, status, created_at, updated_at)`
  - `project_data_json(project_id, data jsonb, version, source, created_by, created_at)`
  - `proposals(id, project_id, version, type, status, content jsonb, capex, opex, created_at)`
  - `ai_metadata(proposal_id, jsonb)`
  - `history(project_id, actor, action, payload jsonb, created_at)`

- **Engineering (Fase 2)**
  - `bom_items(id, proposal_id, tag, description, spec jsonb, quantity, unit, criticality)`
  - `documents(id, project_id, type, path, version, created_at)`

- **Procurement (Fase 3)**
  - `suppliers(id, name, email, phone, score, regions jsonb, categories jsonb)`
  - `rfqs(id, project_id, bom_snapshot jsonb, sent_at, due_date, status)`
  - `quotes(id, rfq_id, supplier_id, items jsonb, total_price, delivery_days, warranty_months, documents jsonb, received_at)`
  - `purchase_orders(id, project_id, supplier_id, quote_id, status, terms jsonb, created_at)`

---

## 9. APIs (ejemplos)

- **Propuestas** (`h2oallegiant/lib/api/proposals.ts` ya mapea):
  - `POST /ai/proposals/generate`
  - `GET /ai/proposals/jobs/{jobId}`
  - `GET /ai/proposals/{projectId}/proposals`
  - `GET /ai/proposals/{projectId}/proposals/{proposalId}`
  - `GET /ai/proposals/{projectId}/proposals/{proposalId}/pdf`

- **Ingeniería Detallada (Fase 2)**
  - `POST /engineering/{projectId}/start` → crea job y cobra (Stripe)
  - `GET /engineering/jobs/{jobId}` → progreso
  - `GET /engineering/{projectId}/deliverables` → P&IDs/BOM

- **Procurement (Fase 3)**
  - `POST /procurement/{projectId}/rfqs` → generar y enviar
  - `GET /procurement/{projectId}/rfqs` → listar
  - `POST /procurement/rfqs/{rfqId}/remind` → recordatorio a proveedores
  - `GET /procurement/{projectId}/quotes` → agregación y ranking
  - `POST /procurement/{projectId}/purchase-orders` → crear PO

---

## 10. Diseño de Agentes

- **Conceptual Engineer Agent** (existente)
  - Input: ficha técnica estructurada + notas.
  - Tools: base de precedentes, cálculo determinista, políticas por país.
  - Output: `ProposalOutput` (Pydantic).
  - Observabilidad: “Deviation analysis” (exponer a UI como transparencia extra).

- **Detailed Designer Agent** (Fase 2)
  - Input: `ProposalOutput`.
  - Output: BOM preliminar + P&IDs básicos + especificaciones.
  - Validación: reglas deterministas (balance hidráulico).
  - SLA: 48h con worker/queue (Celery) y “ready-to-review”.

- **Procurement Agent** (Fase 3)
  - Input: BOM confirmado.
  - Tools:
    - MCP: conectores a catálogos/proveedores.
    - Web/API search: marketplaces/portales.
    - Email/RFQ: plantillas por categoría; tracking de estado.
  - Ranking (ponderación): precio (40%), entrega (30%), confiabilidad (20%), garantía/soporte (10%).
  - Output: comparativa + recomendación con explainability.

---

## 11. Métricas y Analítica

- **Producto**: Conversiones F1→F2 (North Star), tiempo a propuesta, % datos completos, ROI estimado.
- **Operativas**: Éxito generación IA (>=95%), errores por endpoint (<1%), costo por propuesta (tokens).
- **Procurement**: Tasa respuesta RFQs, tiempo a cotización, ahorro vs. industria.

Implementación: PostHog/Segment + eventos frontend/backend (ver `docs/ANALYTICS-METRICS.md`).

---

## 12. Cambios Inmediatos Recomendados

- **Deprecate** `h2oallegiant/lib/engines/proposal-engine.ts` (hardcode, no usado por flujo real). Añadir banner `DEPRECATED` o eliminar.
- **Integrar TIER 1** en la página de propuesta `h2oallegiant/app/project/[id]/proposals/[proposalId]/page.tsx`:
  - `InstantInsightsGrid` + `SmartRecommendations` + `IndustryComparison` + `NextStepsCTA`.
  - Garantizar que todo consume datos del agente (helpers en `h2oallegiant/lib/proposal-data-helpers.ts`).
- **Exponer Deviation Analysis** en UI (transparencia extra).

---

## 13. Roadmap (10-12 semanas)

- **S1-S2 (2-3 semanas): Hook de Conversión**
  - Integrar TIER 1 en `page.tsx` de propuesta.
  - “Compliance checks” con targets reales + visual.
  - A/B de `NextStepsCTA`.
- **S3-S4 (2-3 semanas): Ingeniería Detallada**
  - Endpoint “start engineering”, pago (Stripe).
  - Entregables stub + checklist humano.
- **S5-S7 (3-4 semanas): BOM + Procurement Fundamentals**
  - Modelo BOM + vista de edición/confirmación.
  - RFQ pipeline (enviar/trackear), almacenamiento de quotes.
  - Ranking básico + comparativa.
- **S8 (1-2 semanas): Hardening & Launch**
  - QA con 5-10 ingenieros.
  - Observabilidad/KPIs + playbook de soporte.

---

## 14. Riesgos y Mitigaciones

- **Calidad IA** → Validación determinista + UI “datos incompletos” + solicitar más datos.
- **Procurement lento** → Semilla “Supplier Directory” + RFQ efectivas + recordatorios.
- **Barrera de pago** → Garantía y trust signals + valor tangible (insights + PDF).
- **Coste IA** → Caching, modelos ligeros, rate limits.

---

## 15. Criterios de Aceptación

- **F1.5**: Se muestran insights/recomendaciones/comparativas; CTA visible; +30% CTR vs. baseline.
- **F2**: 1 pago real procesado; entregables mínimos en 48h con feedback ≥8/10.
- **F3**: RFQs reales con ≥2 respuestas por proyecto; ranking usado para decidir.

---

## 16. Notas sobre el Código Actual

- **Sin hardcode en flujo real**: `backend-h2o/app/agents/proposal_agent.py` + `h2oallegiant/lib/proposal-data-helpers.ts` consumen datos del agente.
- **Archivo a deprecar**: `h2oallegiant/lib/engines/proposal-engine.ts` (hardcode, no participa en ProposalsAPI real).
- **Componentes TIER 1 creados**:
  - `h2oallegiant/components/features/proposals/instant-insights-grid.tsx`
  - `h2oallegiant/components/features/proposals/next-steps-cta.tsx`
  - `h2oallegiant/components/features/proposals/smart-recommendations.tsx`

---

## 17. Siguientes Pasos

1) Integrar componentes TIER 1 en `page.tsx` de propuesta.  
2) Marcar `proposal-engine.ts` como `DEPRECATED` o eliminar.  
3) Definir endpoints de Fase 2 y 3 (stub) y contratos de datos.  
4) Preparar PR con cambios + test de usuario con 2-3 proyectos reales.
