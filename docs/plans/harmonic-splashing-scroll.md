# Feedback System - Implementation Plan

## Contexto
- SMTP/Email **NO está configurado** (solo código, no infraestructura)
- Ya tienen `httpx` instalado (para HTTP requests)
- Usan Asana/Jira/Dart

## Análisis de Opciones

| Herramienta | Setup | Dependencias | Código | ¿Recomendado? |
|-------------|-------|--------------|--------|---------------|
| **Asana (HTTP)** | 5 min | ✅ Ya tienes httpx | ~15 líneas | ✅ **MEJOR** |
| Jira (HTTP) | 10 min | ✅ Ya tienes httpx | ~20 líneas | ⭐ Buena |
| AWS SES | 30+ min | Verificar dominio, IAM | ~30 líneas | ⚠️ Complejo |
| Gmail API | 30+ min | OAuth, Google Console | ~50 líneas | ❌ Evitar |

---

## ELEGIDO: Jira via HTTP

**Por qué Jira**:
1. **Zero dependencias nuevas** - httpx ya está instalado
2. **Setup de 10 minutos** - API token + project key
3. **API simple** - Un POST y listo
4. **Gratis** - API incluida en tu plan de Jira
5. **Visible para el equipo** - Issues aparecen en tu workflow existente

### Setup (10 minutos)

1. **Crear API Token**: [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens) → Create API token
2. **Obtener Project Key**: En tu proyecto de Jira, es el prefijo de los issues (ej: `FEED-123` → key es `FEED`)
3. **Obtener tu email de Atlassian**: El email con el que accedes a Jira
4. **Agregar env vars**: `JIRA_API_TOKEN`, `JIRA_EMAIL`, `JIRA_PROJECT_KEY`, `JIRA_BASE_URL`

### Código completo

```python
# backend/app/services/jira_service.py
import httpx
import base64
from app.core.config import settings

async def create_feedback_issue(feedback, classification) -> dict:
    """Create Jira issue for user feedback."""

    if not all([settings.JIRA_API_TOKEN, settings.JIRA_EMAIL, settings.JIRA_PROJECT_KEY]):
        return {"success": False, "error": "Jira not configured"}

    # Jira Cloud usa Basic Auth con email:api_token
    auth = base64.b64encode(f"{settings.JIRA_EMAIL}:{settings.JIRA_API_TOKEN}".encode()).decode()

    emoji = {"bug": "🐛", "feature_request": "✨", "improvement": "💡"}.get(classification.category, "📝")

    # Map category to Jira issue type
    issue_type = "Bug" if classification.category == "bug" else "Task"

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.JIRA_BASE_URL}/rest/api/3/issue",
            headers={
                "Authorization": f"Basic {auth}",
                "Content-Type": "application/json"
            },
            json={
                "fields": {
                    "project": {"key": settings.JIRA_PROJECT_KEY},
                    "summary": f"{emoji} [{classification.category}] {classification.summary}",
                    "description": {
                        "type": "doc",
                        "version": 1,
                        "content": [
                            {"type": "paragraph", "content": [{"type": "text", "text": f"Priority: {classification.priority}/5 | Sentiment: {classification.sentiment}"}]},
                            {"type": "paragraph", "content": [{"type": "text", "text": f"Page: {feedback.page_url or 'N/A'}"}]},
                            {"type": "rule"},
                            {"type": "paragraph", "content": [{"type": "text", "text": feedback.content}]},
                            {"type": "rule"},
                            {"type": "paragraph", "content": [{"type": "text", "text": f"Feedback ID: {feedback.id}"}]}
                        ]
                    },
                    "issuetype": {"name": issue_type}
                }
            },
            timeout=15.0
        )

        if response.status_code == 201:
            issue_key = response.json()["key"]
            issue_url = f"{settings.JIRA_BASE_URL}/browse/{issue_key}"
            return {"success": True, "url": issue_url, "key": issue_key}
        return {"success": False, "error": response.text}
```

**~40 líneas, zero dependencias nuevas.**

---

## Flujo Completo

```
User clicks 💬 → Dialog → Submit →
  Backend saves to DB →
  Background job:
    1. OpenAI classifies (category, priority, sentiment, summary)
    2. Create Jira issue with classification
  → Toast "Thanks!"
```

---

## Archivos a Crear

| Archivo | Líneas | Propósito |
|---------|--------|-----------|
| `backend/app/models/feedback.py` | ~25 | Modelo |
| `backend/app/api/v1/feedback.py` | ~30 | POST endpoint |
| `backend/app/services/feedback_service.py` | ~40 | Clasificar + crear issue |
| `backend/app/services/jira_service.py` | ~40 | HTTP a Jira |
| `frontend/components/features/feedback/feedback-button.tsx` | ~20 | Botón flotante |
| `frontend/components/features/feedback/feedback-dialog.tsx` | ~80 | Dialog + form |
| `frontend/lib/api/feedback.ts` | ~15 | API client |
| Migration | ~20 | Tabla feedback |

**Total: ~270 líneas de código**

---

## Modelo Mínimo

```python
class Feedback(BaseModel):
    __tablename__ = "feedback"

    organization_id: UUID  # Multi-tenant
    user_id: UUID
    content: str           # El feedback
    category_hint: str     # Selección del user (opcional)
    ai_category: str       # bug|feature|improvement|question
    ai_priority: int       # 1-5
    ai_summary: str        # One-liner
    page_url: str          # Dónde estaba
    jira_issue_url: str    # Link al issue creado
    jira_issue_key: str    # Ej: FEED-123
```

---

## Issue en Jira (resultado)

```
FEED-42: 🐛 [bug] El botón de guardar no funciona en móvil

Priority: 4/5 | Sentiment: Negative
Page: /projects/abc123/edit
────────────────────────────────
Cuando intento guardar un proyecto desde mi celular,
el botón no hace nada. Probé en Chrome y Safari.
────────────────────────────────
Feedback ID: fb_abc123
```

**Type**: Bug (si category=bug) o Task (otros)

---

## Environment Variables

```env
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your_api_token
JIRA_PROJECT_KEY=FEED
```

---

## Tiempo Estimado

| Task | Tiempo |
|------|--------|
| Modelo + migración | 20min |
| Endpoint POST | 20min |
| AI classification | 30min |
| Jira service | 25min |
| Frontend button + dialog | 1h |
| Testing | 25min |
| **Total** | **~3.5h** |

---

## Verificación

1. Configurar env vars de Jira
2. Click botón 💬 → llenar feedback → submit
3. Verificar:
   - Toast "Thanks!" aparece
   - Record en DB con `ai_category`, `ai_priority`, `jira_issue_url`
   - Issue creado en Jira con clasificación correcta
