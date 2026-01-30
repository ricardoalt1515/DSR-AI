# Waste Opportunity Platform - System Overview

> **Documento para exportación a Google Docs**
> 
> Cada diagrama está en un bloque de código Mermaid. Para convertir a imágenes:
> 1. Copia el contenido del bloque de código (sin las líneas ``` )
> 2. Pégalo en [mermaid.live](https://mermaid.live)
> 3. Exporta como PNG o SVG
> 4. Inserta la imagen en Google Docs en el lugar indicado

---

## 1. Product Overview

**AI-powered SaaS platform for waste management companies.**

| Aspect | Description |
|--------|-------------|
| **Problem** | Waste companies lack efficient tools to assess waste streams, generate feasibility reports, and sync with CRM/trading platforms |
| **Solution** | Automated AI proposal generation with compliance gates and integration readiness |
| **Core Flow** | Opportunities → AI Proposals → Compliance Gates → CRM/Marketplace Sync |

### Key Components

| Component | Purpose |
|-----------|---------|
| **Backend API** | FastAPI service handling auth, projects, AI orchestration |
| **Frontend App** | Next.js dashboard for opportunity management |
| **AI Agents** | pydantic-ai powered agents for proposal/image/document analysis |
| **Infrastructure** | AWS ECS Fargate, RDS PostgreSQL, ElastiCache Redis |

---

## 2. System Architecture

<!-- DIAGRAM 1: System Architecture - Flowchart -->
<!-- Copiar a mermaid.live y exportar como PNG -->

```mermaid
flowchart TB
    subgraph Users
        FA[Field Agents]
        SA[Sales]
        AD[Admins]
    end

    subgraph Frontend
        UI[React Dashboard]
        API_Client[API Client + Zustand Stores]
    end

    subgraph Backend
        REST[REST API v1]
        Auth[FastAPI Users + JWT]
        Services[Business Services]
        Workers[Background Workers]
    end

    subgraph AI
        PA[Proposal Agent]
        IA[Image Analysis Agent]
        DA[Document Analysis Agent]
    end

    subgraph Data
        PG[(PostgreSQL)]
        RD[(Redis Cache)]
        S3[(S3 Storage)]
    end

    subgraph External
        OAI[OpenAI API]
        HS[HubSpot CRM - Planned]
        MP[Waste Marketplace - Planned]
    end

    Users --> UI
    UI --> API_Client
    API_Client --> REST
    REST --> Auth
    REST --> Services
    Services --> Workers
    Workers --> AI
    AI --> OAI
    Services --> PG
    Services --> RD
    Services --> S3
    Services -.-> HS
    Services -.-> MP
```

### Service Responsibilities

| Service | Role |
|---------|------|
| **REST API** | Auth, RBAC, rate limiting, CRUD for all entities |
| **AI Services** | Proposal generation, image/document analysis orchestration |
| **Background Workers** | Async job processing for AI tasks |
| **Cache Layer** | Session storage, rate limiting, job status tracking |

---

## 3. Technology Stack

<!-- DIAGRAM 2: Technology Stack - Mindmap -->
<!-- Copiar a mermaid.live y exportar como PNG -->

```mermaid
mindmap
  root((Waste Platform))
    Backend
      Python 3.11+
      FastAPI
      SQLAlchemy 2.0
      Pydantic
      pydantic-ai
      Alembic
    Frontend
      Next.js 15
      React 19
      TypeScript
      Zustand
      shadcn/ui
      TailwindCSS
    AI and LLM
      OpenAI GPT-4o
      GPT-4o-mini
      Structured Output
    Infrastructure
      AWS ECS Fargate
      RDS PostgreSQL
      ElastiCache Redis
      S3
      ALB
      CloudWatch
    DevOps
      Terraform
      Docker
      GitHub Actions
```

---

## 4. AWS Infrastructure

<!-- DIAGRAM 3: AWS Infrastructure - Flowchart -->
<!-- Copiar a mermaid.live y exportar como PNG -->

```mermaid
flowchart TB
    subgraph Internet
        Client[Browser/Client]
    end

    subgraph AWS_Cloud
        subgraph Public_Subnets
            ALB[Application Load Balancer]
            NAT[NAT Gateway]
        end

        subgraph Private_Subnets
            subgraph ECS_Cluster
                API[Backend API]
                Worker[Intake Worker]
            end
            
            subgraph Data_Tier
                RDS[(RDS PostgreSQL)]
                Redis[(ElastiCache Redis)]
            end
        end

        subgraph Storage
            S3[(S3 Bucket)]
            ECR[ECR Registry]
        end

        subgraph Security
            SM[Secrets Manager]
            CW[CloudWatch]
        end

        subgraph Frontend_Hosting
            AMP[AWS Amplify]
        end
    end

    Client --> AMP
    Client --> ALB
    ALB --> API
    API --> Worker
    API --> RDS
    API --> Redis
    API --> S3
    Worker --> RDS
    Worker --> Redis
    ECS_Cluster --> ECR
    ECS_Cluster --> SM
    ECS_Cluster --> CW
```

### Resource Summary

| Resource | Configuration | Purpose |
|----------|---------------|---------|
| **ECS Fargate** | 2 services (API + Worker) | Serverless containers |
| **RDS PostgreSQL** | Multi-AZ ready | Primary database |
| **ElastiCache Redis** | Single node | Cache + job queue |
| **S3** | Private bucket | File storage (PDFs, images) |
| **ALB** | Public-facing | Load balancing + TLS |
| **Amplify** | Static hosting | Frontend deployment |

---

## 5. Data Flow

### AI Proposal Generation

<!-- DIAGRAM 4: AI Proposal Generation - Sequence Diagram -->
<!-- Copiar a mermaid.live y exportar como PNG -->

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as Backend API
    participant W as Worker
    participant AI as AI Agent
    participant OAI as OpenAI
    participant DB as PostgreSQL
    participant RD as Redis

    U->>FE: Request proposal generation
    FE->>API: POST /ai/proposals/generate
    API->>RD: Create job status queued
    API-->>FE: Return job_id
    
    loop Poll status
        FE->>API: GET /ai/proposals/jobs/id
        API->>RD: Check job status
        API-->>FE: Status update
    end

    W->>RD: Pick up job
    W->>DB: Load project data + file analyses
    W->>AI: Generate proposal
    AI->>OAI: Structured output request
    OAI-->>AI: ProposalOutput
    AI-->>W: Validated response
    W->>DB: Save Proposal record
    W->>RD: Update status completed

    FE->>API: GET /proposals/id
    API->>DB: Fetch proposal
    API-->>FE: Proposal details
    U->>FE: Download PDF
    FE->>API: GET /proposals/id/pdf
    API-->>FE: Generated PDF
```

### Authentication & Multi-Tenancy

<!-- DIAGRAM 5: Auth & Multi-Tenancy - Flowchart -->
<!-- Copiar a mermaid.live y exportar como PNG -->

```mermaid
flowchart LR
    subgraph Request
        R[HTTP Request]
        H1[Authorization Header]
        H2[X-Organization-Id Header]
    end

    subgraph Auth_Pipeline
        JV[JWT Validation]
        OC[Org Context]
        RBAC[Role Check]
    end

    subgraph Data_Access
        Q[Query Builder]
        F[Tenant Filter]
        DB[(Database)]
    end

    R --> JV
    H1 --> JV
    JV --> OC
    H2 --> OC
    OC --> RBAC
    RBAC --> Q
    Q --> F
    F --> DB
```

---

## 6. AI Agent Architecture

<!-- DIAGRAM 6: AI Agent Architecture - Flowchart -->
<!-- Copiar a mermaid.live y exportar como PNG -->

```mermaid
flowchart TB
    subgraph Agents
        PA[Proposal Agent - GPT-4o]
        IA[Image Agent - GPT-4o-mini]
        DA[Document Agent - GPT-4o-mini]
        NA[Notes Agent - GPT-4o-mini]
    end

    subgraph Prompts
        PP[proposal_system.md]
        IP[image_analysis.md]
        DP[document_analysis.md]
    end

    subgraph Schemas
        PO[ProposalOutput]
        IO[ImageAnalysisOutput]
        DO[DocumentAnalysisOutput]
    end

    subgraph Context
        PD[Project Data]
        MD[Metadata]
        FA[File Analyses]
    end

    PP --> PA
    IP --> IA
    DP --> DA
    
    Context --> PA
    Context --> IA
    Context --> DA
    
    PA --> PO
    IA --> IO
    DA --> DO

    subgraph OpenAI
        OAPI[Structured Output Endpoint]
    end

    PA --> OAPI
    IA --> OAPI
    DA --> OAPI
```

### AI Output Summary

| Agent | Input | Output | Use Case |
|-------|-------|--------|----------|
| **Proposal** | Project data, file analyses | GO/NO-GO recommendation, financials, pathways | Feasibility reports |
| **Image** | Waste photos | Material classification, condition assessment | Intake assessment |
| **Document** | SDSs, reports | Extracted facts, compliance data | Document parsing |
| **Notes** | Free-text notes | Structured intake data | Data extraction |

---

## 7. Entity Model

<!-- DIAGRAM 7: Entity Relationship Diagram -->
<!-- Copiar a mermaid.live y exportar como PNG -->

```mermaid
erDiagram
    Organization ||--o{ User : has_members
    Organization ||--o{ Company : manages
    Company ||--o{ Location : has_sites
    Location ||--o{ Project : has_assessments
    Project ||--o{ Proposal : generates
    Project ||--o{ ProjectFile : has_attachments
    Project ||--o{ TimelineEvent : logs_activity
    Location ||--o{ LocationContact : has_contacts

    Organization {
        uuid id PK
        string name
        string slug
        jsonb settings
        bool is_active
    }

    User {
        uuid id PK
        string email
        enum role
        uuid organization_id FK
    }

    Company {
        uuid id PK
        string name
        string industry
        uuid organization_id FK
    }

    Location {
        uuid id PK
        string city
        string state
        uuid company_id FK
    }

    Project {
        uuid id PK
        string name
        enum status
        jsonb project_data
        uuid location_id FK
    }

    Proposal {
        uuid id PK
        int version
        enum status
        jsonb ai_metadata
        uuid project_id FK
    }

    ProjectFile {
        uuid id PK
        string filename
        jsonb ai_analysis
        uuid project_id FK
    }
```

---

## 8. Deployment Pipeline

<!-- DIAGRAM 8: Deployment Pipeline - Flowchart -->
<!-- Copiar a mermaid.live y exportar como PNG -->

```mermaid
flowchart LR
    subgraph Development
        LC[Local Code]
        DC[docker-compose]
    end

    subgraph CI_CD
        GH[GitHub Actions]
        Test[Tests + Lint]
        Build[Docker Build]
    end

    subgraph Registry
        ECR[AWS ECR]
    end

    subgraph Infrastructure
        TF[Terraform Apply]
    end

    subgraph AWS_Production
        ECS[ECS Fargate]
        AMP[Amplify]
    end

    LC --> GH
    GH --> Test
    Test --> Build
    Build --> ECR
    ECR --> TF
    TF --> ECS
    GH --> AMP
```

### Environment Separation

| Environment | Backend | Frontend | Database |
|-------------|---------|----------|----------|
| **Development** | Local + docker-compose | bun dev | Local PostgreSQL |
| **Production** | ECS Fargate | AWS Amplify | RDS PostgreSQL |

---

## 9. Cost Estimate

| Category | Service | Monthly Cost |
|----------|---------|--------------|
| **Compute** | ECS Fargate | ~$60-80 |
| **Database** | RDS PostgreSQL | ~$50-70 |
| **Cache** | ElastiCache Redis | ~$15-25 |
| **Storage** | S3 | ~$5-10 |
| **Network** | ALB + NAT | ~$50-60 |
| **AI** | OpenAI API | ~$50-200 |
| **Total** | | **~$279-429/month** |

---

## 10. Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **JSONB for project_data** | Flexible schema for dynamic questionnaire data |
| **Multi-tenant by design** | Composite FKs with organization_id on all tables |
| **Async AI generation** | Background jobs with polling to avoid timeouts |
| **External prompt files** | Maintainable AI prompts in markdown format |
| **Dual reports** | Internal (full) and External (client-safe) views |
| **Redis rate limiting** | Per-endpoint controls (strict for AI, generous for reads) |

---

## Instrucciones de Exportación

### Paso 1: Generar imágenes de diagramas

Para cada diagrama numerado (8 en total):

1. Abre [mermaid.live](https://mermaid.live)
2. Borra el código de ejemplo
3. Copia el contenido del bloque de código Mermaid (sin las líneas ```)
4. Verifica que renderice correctamente
5. Click en "Actions" → "Export PNG" (o SVG para mejor calidad)
6. Guarda con nombre descriptivo (ej: `diagram-1-architecture.png`)

### Paso 2: Crear documento en Google Docs

1. Crea un nuevo documento en Google Docs
2. Copia el texto de este documento (sin los bloques de código)
3. En cada sección donde hay un diagrama, inserta la imagen correspondiente
4. Ajusta el tamaño de las imágenes según necesites

### Paso 3: Exportar a PDF

1. En Google Docs: Archivo → Descargar → Documento PDF
2. Revisa el PDF generado

### Lista de diagramas

| # | Sección | Tipo | Descripción |
|---|---------|------|-------------|
| 1 | System Architecture | Flowchart | Vista general del sistema |
| 2 | Technology Stack | Mindmap | Stack tecnológico |
| 3 | AWS Infrastructure | Flowchart | Infraestructura AWS |
| 4 | AI Proposal Generation | Sequence | Flujo de generación de propuestas |
| 5 | Auth & Multi-Tenancy | Flowchart | Pipeline de autenticación |
| 6 | AI Agent Architecture | Flowchart | Arquitectura de agentes AI |
| 7 | Entity Model | ER Diagram | Modelo de datos |
| 8 | Deployment Pipeline | Flowchart | Pipeline de despliegue |
