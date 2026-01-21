# Waste Opportunity Platform - Comprehensive Documentation

> **AI-powered waste management opportunity identification and proposal generation platform**
>
> `opportunities → AI proposals → compliance gates → CRM/Marketplace sync`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture](#2-architecture)
3. [Implementation](#3-implementation)
4. [Product](#4-product)

---

# 1. Executive Summary

## Platform Overview

The **Waste Opportunity Platform** is a multi-tenant SaaS application that enables waste management companies to identify, assess, and generate AI-powered proposals for waste upcycling and recycling opportunities at client facilities.

### Core Value Proposition

| Stage                | Description                                                          |
| -------------------- | -------------------------------------------------------------------- |
| **Opportunities**    | Identify waste streams at client facilities through site assessments |
| **AI Proposals**     | Generate technical feasibility reports with GO/NO-GO recommendations |
| **Compliance Gates** | Validate against regulatory requirements                             |
| **CRM/Marketplace**  | Sync with sales systems and waste trading platforms                  |

### Technology Stack

````
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│  Next.js 15.5 • React 19 • TypeScript • Tailwind CSS v4         │
│  Zustand • React Hook Form • Radix UI • Framer Motion           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND                                   │
│  FastAPI • Python 3.11+ • SQLAlchemy 2.0 • Pydantic AI          │
│  PostgreSQL • Redis • Alembic • JWT Authentication              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     INFRASTRUCTURE                               │
│  AWS • ECS Fargate • RDS PostgreSQL • ElastiCache Redis         │
│  S3 • ALB • Secrets Manager • CloudWatch • Terraform            │
└─────────────────────────────────────────────────────────────────┘

# 2. Architecture (Software Architect Perspective)

## 2.1 Container Diagram

```mermaid
C4Container
    title Container Diagram - Waste Opportunity Platform

    Person(user, "User", "Platform user")

    Container_Boundary(frontend_boundary, "Frontend") {
        Container(nextjs, "Next.js Application", "React 19, TypeScript", "Server-side rendered web application with client-side interactivity")
    }

    Container_Boundary(backend_boundary, "Backend") {
        Container(fastapi, "FastAPI Server", "Python 3.11, Uvicorn", "REST API with async support, handles business logic")
        Container(workers, "Background Workers", "Python, asyncio", "Long-running AI generation tasks")
    }

    Container_Boundary(data_boundary, "Data Layer") {
        ContainerDb(postgres, "PostgreSQL", "PostgreSQL 14", "Primary data store with multi-tenant isolation")
        ContainerDb(redis, "Redis", "Redis 6", "Caching, rate limiting, job status")
        ContainerDb(s3, "S3 Storage", "AWS S3", "File storage for documents and PDFs")
    }

    System_Ext(openai, "OpenAI API", "LLM for proposals")

    Rel(user, nextjs, "Uses", "HTTPS")
    Rel(nextjs, fastapi, "API calls", "HTTPS/JSON")
    Rel(fastapi, postgres, "Reads/Writes", "asyncpg")
    Rel(fastapi, redis, "Cache/Rate limit", "aioredis")
    Rel(fastapi, s3, "File storage", "aioboto3")
    Rel(workers, openai, "Generate proposals", "HTTPS")
    Rel(workers, postgres, "Store results", "asyncpg")
```

## 2.2 Data Model

The platform implements **organization-level tenant isolation** using composite foreign keys and query filtering at every database access layer.

```mermaid
erDiagram
    ORGANIZATION ||--o{ USER : "has members"
    ORGANIZATION ||--o{ COMPANY : "owns"
    COMPANY ||--o{ LOCATION : "has facilities"
    LOCATION ||--o{ PROJECT : "has assessments"
    LOCATION ||--o{ LOCATION_CONTACT : "has contacts"
    PROJECT ||--o{ PROPOSAL : "generates"
    PROJECT ||--o{ PROJECT_FILE : "has documents"
    PROJECT ||--o{ TIMELINE_EVENT : "tracks history"
    USER ||--o{ PROJECT : "creates"

    ORGANIZATION {
        uuid id PK
        string name
        string slug UK
        string contact_email
        jsonb settings
        boolean is_active
    }

    USER {
        uuid id PK
        uuid organization_id FK
        string email UK
        string hashed_password
        enum role
        boolean is_superuser
        boolean is_verified
    }

    COMPANY {
        uuid id PK
        uuid organization_id FK
        string name
        string industry
        string sector
        uuid created_by_user_id FK
        timestamp locked_at
    }

    LOCATION {
        uuid id PK
        uuid organization_id FK
        uuid company_id FK
        string name
        string city
        string state
        float latitude
        float longitude
    }

    PROJECT {
        uuid id PK
        uuid organization_id FK
        uuid location_id FK
        uuid user_id FK
        string name
        string status
        int progress
        jsonb project_data
    }

    PROPOSAL {
        uuid id PK
        uuid organization_id FK
        uuid project_id FK
        int version
        string status
        float capex
        float opex
        text executive_summary
        jsonb ai_metadata
    }
```

Every table includes `organization_id` with composite foreign key constraints ensuring cross-tenant isolation at the database level.

## 2.3 AWS Infrastructure

```mermaid
flowchart TB
    subgraph Internet
        USER[Users]
    end

    subgraph AWS["AWS Cloud"]
        subgraph VPC["VPC (10.0.0.0/16)"]
            subgraph PublicSubnets["Public Subnets"]
                ALB[Application Load Balancer]
                NAT[NAT Gateway]
            end

            subgraph PrivateSubnets["Private Subnets"]
                subgraph ECS["ECS Cluster (Fargate)"]
                    TASK1[Task 1<br/>FastAPI]
                    TASK2[Task 2<br/>FastAPI]
                    TASK3[Task 3<br/>FastAPI]
                end

                RDS[(RDS PostgreSQL<br/>Multi-AZ)]
                REDIS[(ElastiCache<br/>Redis)]
            end
        end

        S3[(S3 Bucket<br/>File Storage)]
        ECR[ECR<br/>Container Registry]
        SECRETS[Secrets Manager]
        CW[CloudWatch<br/>Logs & Metrics]
    end

    subgraph External
        OPENAI[OpenAI API]
        AMPLIFY[AWS Amplify<br/>Frontend Hosting]
    end

    USER --> ALB
    USER --> AMPLIFY
    AMPLIFY --> ALB
    ALB --> TASK1 & TASK2 & TASK3
    TASK1 & TASK2 & TASK3 --> RDS
    TASK1 & TASK2 & TASK3 --> REDIS
    TASK1 & TASK2 & TASK3 --> S3
    TASK1 & TASK2 & TASK3 --> OPENAI
    TASK1 & TASK2 & TASK3 --> SECRETS
    TASK1 & TASK2 & TASK3 --> CW
    ECR -.-> ECS
    PrivateSubnets --> NAT --> Internet
```

## 2.4 Security

| Layer              | Implementation                                                    |
| ------------------ | ----------------------------------------------------------------- |
| **Network**        | VPC isolation, private subnets, security groups (least privilege) |
| **Transport**      | HTTPS/TLS everywhere, CORS configuration                          |
| **Authentication** | JWT tokens with 24h expiry, bcrypt password hashing               |
| **Authorization**  | Role-based access control (RBAC) with ownership validation        |
| **Data**           | Tenant isolation via composite FKs, RDS encryption at rest        |
| **Secrets**        | AWS Secrets Manager, no credentials in code                       |
| **Rate Limiting**  | Redis-backed, per-endpoint limits (5-60/min)                      |
| **Logging**        | Structured JSON logs, no PII in logs                              |

---

# 3. Implementation

## 3.1 Project Structure

```
waste-platform/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── api/v1/              # REST endpoints
│   │   ├── core/                # Config, database, auth
│   │   ├── models/              # SQLAlchemy models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── services/            # Business logic
│   │   ├── agents/              # AI agents (proposal, image)
│   │   └── authz/policies.py    # RBAC policies
│   ├── alembic/                 # Migrations
│   └── tests/
│
├── frontend/
│   ├── app/                     # Next.js App Router pages
│   ├── components/
│   │   ├── ui/                  # shadcn/Radix primitives
│   │   └── features/            # Domain components
│   └── lib/
│       ├── api/                 # API client
│       ├── stores/              # Zustand stores
│       └── contexts/            # Auth context
│
└── infrastructure/terraform/    # AWS IaC
```

## 3.2 API Endpoints

| Method | Endpoint                  | Description               | Rate Limit |
| ------ | ------------------------- | ------------------------- | ---------- |
| POST   | `/auth/jwt/login`         | Login with email/password | 5/min      |
| POST   | `/auth/register`          | Register new user         | 3/min      |
| GET    | `/auth/me`                | Get current user          | 60/min     |
| GET    | `/companies`              | List companies            | 60/min     |
| POST   | `/companies`              | Create company            | 30/min     |
| GET    | `/companies/{id}`         | Get company detail        | 60/min     |
| GET    | `/projects`               | List projects (filtered)  | 60/min     |
| POST   | `/projects`               | Create project            | 30/min     |
| GET    | `/projects/{id}`          | Get project detail        | 60/min     |
| POST   | `/ai/proposals/generate`  | Start AI generation       | 3/min      |
| GET    | `/ai/proposals/jobs/{id}` | Poll job status           | 60/min     |
| GET    | `/ai/proposals/{id}`      | Get proposal              | 60/min     |
| GET    | `/ai/proposals/{id}/pdf`  | Download PDF              | 30/min     |

## 3.3 AI Pipeline States

```mermaid
stateDiagram-v2
    [*] --> Queued: POST /generate
    Queued --> LoadingData: Worker picks up
    LoadingData --> AnalyzingImages: If photos uploaded
    AnalyzingImages --> GeneratingProposal: Image insights ready
    LoadingData --> GeneratingProposal: No photos
    GeneratingProposal --> ProcessingResponse: AI response received
    ProcessingResponse --> GeneratingPDF: Proposal saved
    GeneratingPDF --> Completed: PDF uploaded

    LoadingData --> Failed: Data error
    GeneratingProposal --> Failed: AI error (after retries)
    GeneratingPDF --> Failed: PDF error

    Completed --> [*]
    Failed --> [*]
```

---

# 4. Product

## 4.1 RBAC Matrix

| Permission           | Super Admin | Org Admin | Field Agent | Contractor | Compliance | Sales |
| -------------------- | :---------: | :-------: | :---------: | :--------: | :--------: | :---: |
| Manage Organizations |     ✅      |    ❌     |     ❌      |     ❌     |     ❌     |  ❌   |
| Manage Org Users     |     ✅      |    ✅     |     ❌      |     ❌     |     ❌     |  ❌   |
| Create Companies     |     ✅      |    ✅     |     ✅      |     ✅     |     ❌     |  ❌   |
| Edit All Companies   |     ✅      |    ✅     |     ❌      |     ❌     |     ❌     |  ❌   |
| Edit Own Companies   |     ✅      |    ✅     |     ✅      |     ✅     |     ❌     |  ❌   |
| Delete Companies     |     ✅      |    ✅     |     ❌      |     ❌     |     ❌     |  ❌   |
| Create Projects      |     ✅      |    ✅     |     ✅      |     ✅     |     ❌     |  ✅   |
| Generate Proposals   |     ✅      |    ✅     |     ✅      |     ✅     |     ✅     |  ✅   |
| Delete Projects      |     ✅      |    ✅     |     ❌      |     ❌     |     ❌     |  ❌   |

## 4.2 Project Status Workflow

```mermaid
stateDiagram-v2
    [*] --> NotStarted: Create Project
    NotStarted --> InProgress: Begin Assessment
    InProgress --> InProgress: Update Data
    InProgress --> ProposalGenerated: Generate Proposal
    ProposalGenerated --> InReview: Submit for Review
    InReview --> Approved: Compliance Approved
    InReview --> InProgress: Revisions Needed
    Approved --> Completed: Deal Closed
    Approved --> OnHold: Client Delayed
    OnHold --> InProgress: Resume
    Completed --> [*]

    InProgress --> Cancelled: Client Lost
    OnHold --> Cancelled: Deal Lost
    Cancelled --> [*]
```

````
