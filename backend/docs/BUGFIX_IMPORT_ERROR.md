# 🔧 Bugfix: ImportError en template_tasks.py

**Fecha**: Octubre 31, 2025  
**Error**: `ImportError: cannot import name 'async_session_maker' from 'app.core.database'`

---

## 🐛 Problema

Al intentar crear un proyecto, el backend crasheaba con:

```python
ImportError: cannot import name 'async_session_maker' from 'app.core.database'
```

**Causa raíz:**
- `template_tasks.py` importaba `async_session_maker` que no existe
- El nombre correcto es `AsyncSessionLocal` (definido en `database.py`)

---

## ✅ Solución

### 1. Fix Import (línea 22)
```python
# ❌ ANTES
from app.core.database import async_session_maker

# ✅ DESPUÉS
from app.core.database import AsyncSessionLocal
```

### 2. Fix Session Usage (2 ocurrencias)
```python
# ❌ ANTES
async with async_session_maker() as db:

# ✅ DESPUÉS
async with AsyncSessionLocal() as db:
```

### 3. Fix Function Import (línea 23)
```python
# ❌ ANTES
from app.core.template_engine import (
    apply_template_to_project,  # No existe
    resolve_inheritance_chain,
    merge_sections,
    ...
)

# ✅ DESPUÉS
from app.core.template_engine import apply_template  # Orquesta todo
```

### 4. Fix Function Calls (2 ocurrencias)
```python
# ❌ ANTES
sections = await apply_template_to_project(db, project, template)

# ✅ DESPUÉS
sections = await apply_template(db, template)
# apply_template ya maneja internamente:
# - resolve_inheritance_chain
# - merge_sections
# - validate_template_sections
# - materialize_sections
```

---

## 🧪 Verificación

```bash
# Restart backend
docker-compose restart app

# Verificar que inicia sin errores
docker-compose logs app | grep -i error

# Debería NO mostrar ImportError
```

---

## 📝 Archivos Modificados

**backend/app/core/template_tasks.py**
- Línea 22: Import correcto `AsyncSessionLocal`
- Línea 23: Import simplificado `apply_template`
- Línea 75: Uso de `AsyncSessionLocal()`
- Línea 92: Llamada correcta `apply_template(db, template)`
- Línea 205: Uso de `AsyncSessionLocal()`
- Línea 218: Llamada correcta `apply_template(db, template)`

---

## ✅ Estado

**RESUELTO** - Backend debería iniciar correctamente ahora.

Siguiente paso: Probar creación de proyecto.
