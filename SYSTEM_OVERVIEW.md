# Waste Opportunity Platform - System Overview

## 1. Product Overview

**AI-powered SaaS platform for waste management companies.**

| Aspect | Description |
|--------|-------------|
| **Problem** | Waste companies lack efficient tools to assess waste streams, generate feasibility reports, and sync with CRM/trading platforms |
| **Solution** | Automated AI proposal generation with compliance gates and integration readiness |
| **Core Flow** | `Opportunities → AI Proposals → Compliance Gates → CRM/Marketplace Sync` |

### Key Components

| Component | Purpose |
|-----------|---------|
| **Backend API** | FastAPI service handling auth, projects, AI orchestration |
| **Frontend App** | Next.js dashboard for opportunity management |
| **AI Agents** | pydantic-ai powered agents for proposal/image/document analysis |
| **Infrastructure** | AWS ECS Fargate, RDS PostgreSQL, ElastiCache Redis |

---

## 2. System Architecture

```mermaid
flowchart TB
    subgraph Users["Users"]
        FA[Field Agents]
        SA[Sales]
        AD[Admins]
    end

    subgraph Frontend["Frontend (Next.js 15)"]
        UI[React Dashboard]
        API_Client[API Client + Zustand Stores]
    end

    subgraph Backend["Backend (FastAPI)"]
        REST[REST API v1]
        Auth[FastAPI Users + JWT]
        Services[Business Services]
        Workers[Background Workers]
    end

    subgraph AI["AI Layer"]
        PA[Proposal Agent]
        IA[Image Analysis Agent]
        DA[Document Analysis Agent]
    end

    subgraph Data["Data Layer"]
        PG[(PostgreSQL)]
        RD[(Redis Cache)]
        S3[(S3 Storage)]
    end

    subgraph External["External Services"]
        OAI[OpenAI API]
        HS[HubSpot CRM]
        MP[Waste Marketplace]
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

    style HS stroke-dasharray: 5 5
    style MP stroke-dasharray: 5 5
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
    AI/LLM
      OpenAI GPT-5.2
      GPT-5-mini
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

```mermaid
flowchart TB
    subgraph Internet
        Client[Browser/Client]
    end

    subgraph AWS["AWS Cloud"]
        subgraph Public["Public Subnets"]
            ALB[Application Load Balancer]
            NAT[NAT Gateway]
        end

        subgraph Private["Private Subnets"]
            subgraph ECS["ECS Fargate Cluster"]
                API[Backend API]
                Worker[Intake Worker]
            end
            
            subgraph Data["Data Tier"]
                RDS[(RDS PostgreSQL)]
                Redis[(ElastiCache Redis)]
            end
        end

        subgraph Storage["Storage"]
            S3[(S3 Bucket)]
            ECR[ECR Registry]
        end

        subgraph Security["Security"]
            SM[Secrets Manager]
            CW[CloudWatch]
        end

        subgraph Frontend_Hosting["Frontend"]
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
    ECS --> ECR
    ECS --> SM
    ECS --> CW
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
    API->>RD: Create job (status: queued)
    API-->>FE: Return job_id
    
    loop Poll status
        FE->>API: GET /ai/proposals/jobs/{id}
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
    W->>RD: Update status: completed

    FE->>API: GET /proposals/{id}
    API->>DB: Fetch proposal
    API-->>FE: Proposal details
    U->>FE: Download PDF
    FE->>API: GET /proposals/{id}/pdf
    API-->>FE: Generated PDF
```

### Authentication & Multi-Tenancy

```mermaid
flowchart LR
    subgraph Request
        R[HTTP Request]
        H1[Authorization: Bearer JWT]
        H2[X-Organization-Id: uuid]
    end

    subgraph Auth["Auth Pipeline"]
        JV[JWT Validation]
        OC[Org Context]
        RBAC[Role Check]
    end

    subgraph Data["Data Access"]
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

```mermaid
flowchart TB
    subgraph Agents["AI Agents (pydantic-ai)"]
        PA[Proposal Agent<br/>gpt-5.2]
        IA[Image Agent<br/>gpt-5-mini]
        DA[Document Agent<br/>gpt-5-mini]
        NA[Notes Agent<br/>gpt-5-mini]
    end

    subgraph Prompts["Prompt Templates"]
        PP[prompts/proposal_system.md]
        IP[prompts/image_analysis.md]
        DP[prompts/document_analysis.md]
    end

    subgraph Schemas["Output Schemas"]
        PO[ProposalOutput]
        IO[ImageAnalysisOutput]
        DO[DocumentAnalysisOutput]
    end

    subgraph Context["Dynamic Context"]
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

    subgraph OpenAI["OpenAI API"]
        API[Structured Output Endpoint]
    end

    PA --> API
    IA --> API
    DA --> API
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

```mermaid
erDiagram
    Organization ||--o{ User : "has members"
    Organization ||--o{ Company : "manages"
    Company ||--o{ Location : "has sites"
    Location ||--o{ Project : "has assessments"
    Project ||--o{ Proposal : "generates"
    Project ||--o{ ProjectFile : "has attachments"
    Project ||--o{ TimelineEvent : "logs activity"
    Location ||--o{ LocationContact : "has contacts"

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

```mermaid
flowchart LR
    subgraph Dev["Development"]
        LC[Local Code]
        DC[docker-compose<br/>PG + Redis]
    end

    subgraph CI["CI/CD"]
        GH[GitHub Actions]
        Test[Tests + Lint]
        Build[Docker Build]
    end

    subgraph Registry
        ECR[AWS ECR]
    end

    subgraph Terraform["Infrastructure"]
        TF[Terraform Apply]
    end

    subgraph AWS["AWS Production"]
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
| **Development** | Local + docker-compose | `bun dev` | Local PostgreSQL |
| **Production** | ECS Fargate | AWS Amplify | RDS PostgreSQL |

---


## 9. Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **JSONB for project_data** | Flexible schema for dynamic questionnaire data |
| **Multi-tenant by design** | Composite FKs with organization_id on all tables |
| **Async AI generation** | Background jobs with polling to avoid timeouts |
| **External prompt files** | Maintainable AI prompts in markdown format |
| **Dual reports** | Internal (full) and External (client-safe) views |
| **Redis rate limiting** | Per-endpoint controls (strict for AI, generous for reads) |
