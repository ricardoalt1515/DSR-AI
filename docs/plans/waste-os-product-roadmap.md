# Waste OS (Broker/Consultora, EE. UU.) — Product Roadmap

**Start date:** 2026-01-20

## Objetivo
Construir el **OS AI** para brokers/consultoras de waste en EE. UU.: transformar oportunidades incompletas en **decisiones rápidas** (GO/NO-GO/INVESTIGATE) y **paquetes ejecutables** (evidence + gates + memo) que se sincronizan al CRM (HubSpot), sin convertirnos en CRM.

## Principios (no negociables)
- **Not-a-CRM:** el CRM del cliente es destino; nosotros somos el **system-of-record técnico/operativo**.
- **Structured > Narrative:** los outputs deben ser **tipados/estructurados** y comparables (v1 vs v2), además de PDF.
- **Human-in-the-loop gates:** compliance/logistics siempre con decisión humana; el agente asiste con flags/checklists.
- **Agent-native OS:** el agente no solo “genera reportes”; debe **operar el workspace** vía tools primitivas.
- **Core + Domain modules:** evitar forks divergentes (waste/water comparten core; difieren en schemas/agents/tools).

## Estado actual (según `PROJECT_DOCUMENTATION.md`)
- Multi-tenant SaaS + RBAC + projects/companies/locations/files/proposals + jobs IA + PDF + S3/Redis/Postgres.
- Workflow de status existe, pero **gates paralelos** (Compliance + Logistics) no están modelados como first-class.
- Audit agent-native: **action parity** y **agent tools** prácticamente en 0 (alto impacto a corregir).

---

## Fase 0 (Semanas 1–4 | 2026-01-20 → 2026-02-17) — “Decidir rápido”
**Outcome:** 1 oportunidad → decisión en <24–72h con evidencia y trazabilidad.

### Entregables
- **BusinessOpportunityOutput v3** (o equivalente) como schema central (ver `_docs/TRANSFORMATION-PLAN-V3.md`).
- **Decision Cockpit** post-propuesta:
  - GO/NO-GO/INVESTIGATE + rationale
  - key financials (rangos) + sensibilidad
  - top risks + missing info
  - next steps (acciones concretas)
- **Gates paralelos (first-class):**
  - `ComplianceGate`: checklist + flags + decision + comments + attachments
  - `LogisticsGate`: checklist + constraints + decision + comments + attachments
  - Estado final `SaleValidated` solo si ambos gates aprueban.
- **HubSpot sync v1 (tenant-configurable):** Company/Deal/Note + attachment PDF + “Deal Memo” (resumen estructurado).

### Criterios de aceptación
- 90%+ de oportunidades generan output estructurado + PDF.
- Gate decisions quedan auditadas (quién/cuándo/por qué).
- HubSpot recibe artefactos consistentes (sin intervención manual).

---

## Fase 1 (Semanas 5–10 | 2026-02-18 → 2026-04-01) — “Ejecución sin marketplace”
**Outcome:** menos back-and-forth, más throughput por broker.

### Entregables
- **Evidence Pack** (SDS/fotos/notas → extracción a campos + referencias + data completeness score).
- **Missing-Info Resolver Agent** (pregunta lo mínimo para subir confidence y destrabar gates).
- **Assumptions & Confidence Ledger:** supuestos por sección + cambios entre versiones + por qué.
- **Outlet Directory interno (no marketplace):** buyers/outlets por material/estado/capacidad + notas de performance.
- **Agent tools (primitivas) para action parity mínima:**
  - `update_project_data(fields)`
  - `create_followup_tasks()`
  - `draft_email_to_generator()`
  - `log_gate_flags()`
  - `prepare_hubspot_payload()`

### Criterios de aceptación
- +30–50% oportunidades/semana por usuario (vs baseline Excel).
- Reducción medible de re-trabajo por data missing.

---

## Fase 2 (Semanas 11–20 | 2026-04-02 → 2026-06-10) — “RFQs / Quotes (precursor a marketplace)”
**Outcome:** cerrar el loop económico con quotes comparables y recomendación explicable.

### Entregables
- **RFQ pipeline:** seleccionar outlets → enviar RFQ → tracking → ingest de quotes.
- **Quote comparison + ranking** (precio/lead time/reliability/terms) + explicación.
- **Outcome analytics:** win/loss, margen estimado vs real, motivos de NO-GO por gate, tiempo por etapa.
- **Plantillas por vertical/material** (playbooks + supuestos + checklists).

### Criterios de aceptación
- ≥2 quotes por oportunidad en pilotos.
- Ranking usado en decisiones reales (no “nice-to-have”).

---

## Fase 3 (Semanas 21–52 | 2026-06-11 → 2027-01-20) — “Standard del sector”
**Outcome:** network effects solo cuando existan datos y flujo real.

### Entregables
- **Marketplace** (solo si hay liquidez): directorio vivo + RFQs + performance data; posible take-rate.
- **Unificación core (waste + water):**
  - Core compartido: tenants/RBAC/projects/files/versioning/timeline/approvals/integrations.
  - Dominios: schemas/agents/tools específicos (waste pathways vs water BOM/procurement).
- **Project Brain:** Q&A sobre portafolio + benchmarks + recomendaciones basadas en outcomes.

---

## Features transversales (hacer “cuando toque”, no antes)
- SSE/WebSockets para jobs (mejor UX que polling) si se vuelve dolor.
- Help Center + “capability summary” del agente (discovery).
- Librería de precedentes/outcomes (sin PII) por tenant.

## Métricas
- **North Star:** oportunidades con decisión (GO/INVESTIGATE) por semana por broker.
- Secundarias: lead→decision time, pass-rate por gate, data completeness, margen estimado vs real, costo IA por oportunidad.

## Riesgos / mitigación
- **Regulatory liability (EE. UU.):** flags + checklist + human sign-off; wording explícito “assistive”.
- **Fork debt:** core+modules; evitar divergencia.
- **Data quality:** completeness score + missing-info agent + evidencia obligatoria para ciertos streams.
- **Adopción vs Excel:** HubSpot sync impecable + UI “Decision Cockpit” que ahorra tiempo real.

## Preguntas abiertas (para cerrar PRD)
- ¿Qué estados/reglas de compliance se cubren primero (CA/TX/etc.)?
- ¿Qué waste streams son top por volumen/margen en pilotos?
- ¿Qué nivel de “quotes” es realista sin marketplace (email/RFQ manual asistido vs APIs)?
- ¿Cuál es la definición exacta de “margen real” que podremos medir en 90 días?
