📋 PRODUCT REQUIREMENTS DOCUMENT (PRD)
H2O Allegiant - Sistema Integral de Proyectos de Agua

1. EL PROBLEMA 🎯
   Idea Original
   Los gerentes de planta e ingenieros ambientales pierden 6-12 meses coordinando múltiples proveedores para implementar sistemas de tratamiento de agua, con sobrecostos del 30-50% y sin visibilidad del proceso.
   Validación del Dolor
   EVIDENCIA CONCRETA:

- Cliente A: "Pagué $180k por un sistema cotizado en $120k"
- Cliente B: "6 meses después, aún no tengo los equipos"
- Cliente C: "Contraté 5 empresas diferentes, nadie se responsabiliza"

DOLOR CUANTIFICADO:

- Tiempo perdido: 4-8 meses extras
- Sobrecosto: $50-100k por proyecto
- Riesgo: 30% proyectos fallan o se abandonan
  El Problema NO es técnico, es de COORDINACIÓN
  ACTUAL:
  Consultor → Ingeniero → Vendedor → Logistics → Instalador
  (Cada flecha = 2-4 semanas muertas + 15% información perdida)

DESEADO:
Usuario → H2O Allegiant → Planta Operando
(Una interfaz, un responsable, sin gaps)

2. EL APETITO ⏱️
   Tamaño de la Apuesta
   MVP COMPLETO: 8 semanas (2 meses)

- Mes 1: Base + Ingeniería
- Mes 2: Procurement + Polish

EQUIPO:

- 1 AI Full-stack developer (tú)
- ChatGPT Agents + n8n para automatización

PRESUPUESTO:

- $5,000 USD (principalmente APIs y servicios)
  Límites Estrictos
  INCLUIR (8 semanas):
  ✅ Workspace unificado
  ✅ Propuesta con IA (ya existe)
  ✅ Ingeniería automatizada
  ✅ Procurement

NO INCLUIR (post-MVP):
❌ Logística real
❌ IoT/Sensores
❌ API pública

3. LA SOLUCIÓN 💡
   Concepto Central
   Un workspace digital donde el usuario tiene UN proyecto de agua que avanza automáticamente a través de agentes especializados, con visibilidad total y pagos por fase.
   Primitivos del Sistema
1. PROJECT (Proyecto)
   {
   "id": "uuid",
   "status": "PROPOSAL|ENGINEERING|PROCUREMENT|LOGISTICS|INSTALLATION|OPERATING",
   "context": {
   "flow_rate": "500 m3/day",
   "water_type": "industrial",
   "location": "Los Mochis",
   "capex_estimated": 150000
   },
   "documents": [],
   "conversations": [],
   "transactions": []
   }
1. AGENTS (Agentes Ejecutores)
1. ConceptualEngineer (GPT-4 + RAG)
   - Input: Conversación
   - Output: Propuesta PDF + context

1. DetailedDesigner (Pydantic-AI + Templates)
   - Input: Project context
   - Output: P&ID, BOM, Specs

1. ProcurementAgent (ChatGPT Agent + MCP)
   - Input: BOM
   - Output: Cotizaciones, órdenes
1. WORKSPACE (Interfaz Unificada)
   /dashboard

- Project overview
- Timeline visual
- Action buttons

/documents

- Generated docs
- Viewer/Download

/chat

- Contextual AI
- Project memory

/procurement

- Equipment browser
- Comparison tool
- Checkout
  Arquitectura Técnica del MVP
  ┌─────────────────────────────────────────────────┐
  │ FRONTEND │
  │ Next.js + Tailwind + Shadcn │
  ├─────────────────────────────────────────────────┤
  │ API │
  │ FastAPI + Pydantic │
  ├─────────────────────────────────────────────────┤
  │ AGENTS │
  │ ┌─────────────┐ ┌───────────┐ ┌─────────────┐│
  │ │ LangGraph │ │ ChatGPT │ │ MCP ││
  │ │ Workflows │ │ Agents │ │ Connectors ││
  │ └─────────────┘ └───────────┘ └─────────────┘│
  ├─────────────────────────────────────────────────┤
  │ AUTOMATION │
  │ n8n │
  ├─────────────────────────────────────────────────┤
  │ STORAGE │
  │ PostgreSQL + S3 + Redis │
  └─────────────────────────────────────────────────┘
  Flujo del MVP (Generador de Ingresos)
  FASE 1: Propuesta ($750)

1. Usuario entra → Chat con IA
2. IA genera propuesta (30 min)
3. Usuario paga $750
4. Accede a workspace con proyecto
   FASE 2: Ingeniería ($5,000)
5. Botón "Generar Ingeniería"
6. Usuario paga 53% CAPEX (~$5,000)
7. LangGraph orchestrates:
   - Template selection
   - P&ID generation
   - BOM extraction
   - Document creation
8. 48h después: Documentos listos
   FASE 3: Procurement ($3,000)
9. ChatGPT Agent toma BOM
10. Busca en varias fuentes via MCP:
    - Grainger API
    - Email RFQs
    - Historical data
11. Presenta comparación
12. Usuario paga 3% comisión
13. Sistema genera POs
    Implementación con Herramientas Específicas
    ChatGPT Agents para Procurement

# Configuración del Agent

{
"name": "ProcurementSpecialist",
"instructions": """
Eres un especialista en compras industriales.
Tienes acceso a: - Web search para encontrar proveedores - Email para enviar RFQs - Herramientas de comparación

    Tu objetivo: Encontrar las mejores 3 opciones
    para cada equipo con 20%+ ahorro.
    """,
    "tools": ["web_search", "email", "calculator"]

}
MCP Connectors
// Grainger MCP Connector
{
name: "grainger-catalog",
description: "Search industrial equipment",
schema: {
search: {
input: {
query: "string",
category: "string",
specifications: "object"
},
output: {
products: "array",
prices: "object"
}
}
}
}
n8n Workflows

1. Document Generation Flow
   Trigger: Payment confirmed
   → Start LangGraph agent
   → Generate documents
   → Upload to S3
   → Update database
   → Send notification

2. Procurement Flow
   Trigger: Engineering complete
   → Extract BOM
   → Trigger ChatGPT Agent
   → Collect responses
   → Normalize data
   → Present to user

3. RABBIT HOLES Y NO-GOs 🕳️
   Rabbit Holes (Riesgos de Scope Creep)
4. Integración con ERPs
   RIESGO: Cada cliente tiene un ERP diferente
   MITIGACIÓN: Solo exportar CSVs/PDFs en MVP
5. Precisión de Ingeniería
   RIESGO: IA genera planos incorrectos
   MITIGACIÓN:

- Templates pre-validados
- Disclaimer claro
- Revisión humana opcional ($500 extra)

3. Proveedores sin APIs
   RIESGO: 80% proveedores no tienen API
   MITIGACIÓN:

- Email automation para RFQs
- 3 proveedores con API para MVP
- Historical pricing database

4. Pagos Internacionales
   RIESGO: Complejidad de pagos B2B
   MITIGACIÓN:

- Solo cobrar servicios H2O
- Cliente paga directo a proveedores

5. Data and confidentiality
   RIESGO: clientes no queiran compartir su informacion
   MITIGACIÓN:

- contratos legales con proteccion de datos, etc.

NO-GOs (Definitivamente NO en MVP)
❌ NO hacemos logística real (solo información)
❌ NO manejamos dinero de equipos (solo comisión)
❌ NO garantizamos precios (son estimados)
❌ NO hacemos instalación (solo coordinación)
❌ NO multi-idioma (solo español/inglés)
❌ NO white-label (solo marca H2O)
❌ NO soporte 24/7 (horario oficina)

💰 MODELO DE INGRESOS INMEDIATO
Pricing Strategy
PROYECTO TÍPICO ($750,000 CAPEX):

1. Propuesta: $750 (pagado)
2. Ingeniería: $7,500 (5% de $150k)
3. Procurement: $4,500 (3% de equipos)

TOTAL: $12,750 por proyecto
COSTO: ~$2,000 (hosting, APIs, support)
PROFIT: $10,750 (84% margen)
Quick Wins para Generar Cash
SEMANA 1-2:

- Lanzar con 5 clientes actuales
- 50% descuento early adopter
- Target: $15,000 en pre-ventas

SEMANA 3-4:

- Primeros proyectos completos
- Casos de estudio
- Target: 10 proyectos activos

MES 2:

- Precio completo
- Marketing activo
- Target: $50,000 MRR

🛠️ PLAN DE DESARROLLO TÉCNICO
Sprint 1: Foundation (Semana 1-2)

# Backend Structure

/app
/api
/projects
/documents  
 /chat
/payments
/agents
/conceptual
/engineering
/procurement
/workflows
/langgraph_chains
/integrations
/mcp_connectors

# Frontend Structure

/pages
/dashboard
/chat
/documents
/procurement
/components
/workspace
/timeline
/chat
Sprint 2: Core Agents (Semana 3-4)

# LangGraph Workflow Example

class EngineeringWorkflow:
def **init**(self):
self.chain = (
ExtractSpecsNode() >> GeneratePIDNode() >> CreateBOMNode() >> GenerateDocsNode()
)
Sprint 3: Procurement (Semana 5-6)

# ChatGPT Agent Integration

async def procurement_search(bom_items):
agent = ChatGPTAgent(
instructions=PROCUREMENT_PROMPT,
tools=["web_search", "email_rfq"]
)

    results = await agent.search_equipment(bom_items)
    return normalize_results(results)

Sprint 4: Polish & Launch (Semana 7-8)
Payment integration (Stripe)
Email automation (n8n)
Error handling
Performance optimization

📊 MÉTRICAS DE ÉXITO
MVP Success Metrics
TÉCNICAS:

- Page load <3s
- AI response <30s
- Document generation <2h
- Uptime >99%

NEGOCIO:

- 20 proyectos mes 1
- $50k revenue mes 2
- CAC <$100
- Churn <10%

USUARIO:

- NPS >70
- Completion rate >80%
- Support tickets <5/Proyecto

Calificaion usuario: 1 a 10 (cuestionarios)
Recurrimiento usuario: volveria a utilizarla
