# H₂O Allegiant – Tasks Board

> Mantén este archivo actualizado. Marca cada ítem completado con una `x`.

## 🏁 Sprint 0 — Kick-off (Contratos & UX)
- [ ] OpenAPI v1 – Endpoints `projects`, `phases`, `documents`
- [ ] Esquema eventos Socket.IO (`proposal_ready`, `phase_progress`, `quotes_ready`)
- [ ] Mock server responses (FastAPI routers returning ejemplos)
- [ ] Mock WebSocket broadcaster
- [ ] Hi-fi mockups en Figma confirmados por stakeholders
- [ ] Repositorio monorepo creado (`frontend`, `backend`, `infra`)

---

## 🚀 Sprint 1 — Dashboard & Crear Proyecto
- [ ] AppShell layout (Navbar + Sidebar responsive)
- [ ] Auth guard con JWT (Auth0 placeholder)
- [ ] Página Dashboard vacía con tarjetas métricas skeleton
- [ ] Modal “Crear proyecto” (form + validations zod)
- [ ] Endpoint `/projects` (list, create) conectado via React Query
- [ ] Tests RTL para Modal y Dashboard cards

---

## 📄 Sprint 2 — Fase Propuesta
- [ ] Integrar `modern_proposal_agent` en backend como Celery task
- [ ] Streaming Socket.IO `proposal_ready` event
- [ ] Vista previa PDF con `react-pdf`
- [ ] Descarga segura vía S3 presigned URL
- [ ] Cypress test: crear proyecto → generar propuesta → ver PDF

---

## ⚙️ Sprint 3 — Fase Ingeniería
- [ ] Implementar esqueleto `EngineeringAgent` LangGraph
- [ ] Progreso en tiempo real (`phase_progress`)
- [ ] Generar mock P&ID, BOM y subir a S3
- [ ] UI barra de progreso + lista de documentos
- [ ] Playwright test: iniciar ingeniería y ver progreso

---

## 💰 Sprint 4 — Procurement MVP
- [ ] GraingerConnector real (API key env var)
- [ ] Mock connector “local” para otros equipos
- [ ] Ranking y cálculo de ahorro en backend
- [ ] Wizard UI para comparar 3 opciones/equipo
- [ ] Estado global de selección (Zustand)
- [ ] Socket.IO `quotes_ready` event + realtime updates

---

## ✅ Sprint 5 — QA & Release
- [ ] Cobertura PyTest ≥ 80 %
- [ ] E2E suite estable (Cypress/Playwright)
- [ ] Sentry + Prometheus dashboards
- [ ] GitHub Actions prod pipeline pasando
- [ ] Deploy ECS prod + smoke tests

---

## 🔮 Backlog (post-MVP)
- [ ] Multi-idioma UI
- [ ] Permisos avanzados por rol
- [ ] Mobile-friendly PWA
- [ ] Pagos Stripe Checkout
