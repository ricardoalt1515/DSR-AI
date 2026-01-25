# H2O Allegiant Backend

AI-powered water treatment engineering platform backend built with FastAPI.

## 🏗️ Architecture

### Clean Architecture with Separation of Concerns

```
backend-h2o/
├── app/
│   ├── api/v1/          # API endpoints (controllers)
│   ├── core/            # Core configuration and utilities
│   ├── models/          # SQLAlchemy ORM models
│   ├── schemas/         # Pydantic schemas (Request/Response)
│   ├── services/        # Business logic layer
│   ├── repositories/    # Data access layer
│   ├── agents/          # AI agents (proposal generation)
│   ├── utils/           # Utility functions
│   └── middleware/      # Custom middleware
├── alembic/             # Database migrations
├── tests/               # Unit and integration tests
└── logs/                # Application logs
```

### Key Design Principles

- **Clean Architecture**: Separation of concerns with distinct layers
- **Type Safety**: Full TypeScript-like typing with Pydantic
- **Async First**: Async/await throughout for better performance
- **API Contract**: Schemas match frontend interfaces exactly
- **Documentation**: Auto-generated OpenAPI docs

## 🚀 Quick Start

### Opción A: Docker (Recomendado) 🐳

**Todo pre-configurado. Solo necesitas Docker y tu OpenAI API key.**

```bash
# 1. Agregar tu OpenAI API key
echo "OPENAI_API_KEY=sk-tu-api-key-aqui" > .env

# 2. Iniciar todo con Docker Compose (incluye intake worker)
docker-compose up --build

# 3. En otra terminal, ejecutar migraciones
docker-compose exec app alembic upgrade head
```

**¡Listo!** Backend corriendo en:
- 🌐 API: http://localhost:8000
- 📚 Docs: http://localhost:8000/api/v1/docs

Ver [DOCKER_SETUP.md](DOCKER_SETUP.md) para más detalles.

---

### Opción B: Local (Sin Docker)

**Prerequisites:**
- Python 3.11+
- PostgreSQL 14+
- Redis 6+

**1. Setup Environment**

```bash
# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env
```

**2. Install Dependencies**

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -e .
```

**3. Database Setup**

```bash
# Create database
createdb h2o_allegiant

# Run migrations
alembic upgrade head
```

**4. Start Services**

```bash
# Terminal 1: Redis
redis-server

# Terminal 2: Backend
python app/main.py
```

Server will start at: http://localhost:8000

## 📚 API Documentation

Once the server is running, access:

- **Swagger UI**: http://localhost:8000/api/v1/docs
- **ReDoc**: http://localhost:8000/api/v1/redoc
- **OpenAPI JSON**: http://localhost:8000/api/v1/openapi.json

## 🗄️ Database Models

### Core Models

- **User**: Authentication and profile
- **Project**: Water treatment projects
- **TechnicalSection**: Groups of technical parameters
- **TechnicalField**: Individual data points
- **Proposal**: AI-generated proposals
- **ProjectFile**: Uploaded documents
- **TimelineEvent**: Project activity history

### Relationships

```
User ──1:N──> Project
Project ──1:N──> TechnicalSection ──1:N──> TechnicalField
Project ──1:N──> Proposal
Project ──1:N──> ProjectFile
Project ──1:N──> TimelineEvent
```

## 🔐 Authentication

JWT-based authentication with Bearer tokens:

```bash
# Register
POST /api/v1/auth/register
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "first_name": "John",
  "last_name": "Doe"
}

# Login
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "SecurePass123"
}

# Returns
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {...}
}

# Use token in headers
Authorization: Bearer eyJhbGc...
```

## 🔄 API Endpoints

### Projects

```bash
GET    /api/v1/projects              # List projects (paginated)
GET    /api/v1/projects/{id}         # Get project detail
POST   /api/v1/projects              # Create project
PATCH  /api/v1/projects/{id}         # Update project
DELETE /api/v1/projects/{id}         # Delete project
```

### Technical Data

```bash
GET    /api/v1/projects/{id}/technical-data          # Get technical data
PATCH  /api/v1/projects/{id}/technical-data          # Update fields
POST   /api/v1/projects/{id}/technical-data/validate # Validate completeness
```

### AI Proposals

```bash
POST   /api/v1/ai/proposals/generate     # Start generation (background job)
GET    /api/v1/ai/proposals/jobs/{jobId} # Poll job status
GET    /api/v1/projects/{id}/proposals   # List proposals
```

### Files

```bash
POST   /api/v1/projects/{id}/files    # Upload file
GET    /api/v1/projects/{id}/files    # List files
DELETE /api/v1/projects/{id}/files/{fileId}
```

## 🧪 Testing

```bash
# Run all tests
pytest

# With coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_projects.py

# Run with verbose output
pytest -v
```

## 🔧 Configuration

All configuration is done via environment variables in `.env`:

### Required Variables

- `POSTGRES_PASSWORD`: Database password
- `SECRET_KEY`: JWT secret (min 32 chars)
- `OPENAI_API_KEY`: OpenAI API key

### Optional Variables

- `DEBUG`: Enable debug mode (default: false)
- `CORS_ORIGINS`: Comma-separated allowed origins
- `USE_LOCAL_STORAGE`: Use local storage instead of S3 (default: true)

See `.env.example` for all available options.

## 📦 Database Migrations

Using Alembic for database schema management:

```bash
# Create a new migration
alembic revision --autogenerate -m "Add new table"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# Show current version
alembic current

# Show migration history
alembic history
```

## 🐳 Docker (Coming Soon)

```bash
# Build and run (incluye intake worker)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## 📝 Code Quality

### Linting and Formatting

```bash
# Format code with Black
black app/

# Lint with Ruff
ruff check app/

# Type check with mypy
mypy app/
```

### Pre-commit Hooks

```bash
# Install pre-commit
pip install pre-commit
pre-commit install

# Run manually
pre-commit run --all-files
```

## 🚀 Production Deployment

### Environment Setup

1. Set `DEBUG=false`
2. Use strong `SECRET_KEY`
3. Configure PostgreSQL with SSL
4. Enable Redis persistence
5. Set up AWS S3 for file storage

### Running with Gunicorn

```bash
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 300 \
  --access-logfile - \
  --error-logfile -
```

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## 📄 License

Proprietary - H2O Allegiant

## 📧 Support

For support, email: support@h2oallegiant.com
