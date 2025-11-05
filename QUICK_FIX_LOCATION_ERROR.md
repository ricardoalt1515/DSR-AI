# 🐛 Fix - Location Creation Error

## Error Identificado

```
sqlalchemy.orm.exc.DetachedInstanceError: Parent instance <Location> is not bound to a Session; 
lazy load operation of attribute 'company' cannot proceed
```

### Causa
El `__repr__()` del modelo `Location` intentaba acceder a `self.company.name` fuera de una sesión de SQLAlchemy, causando un error cuando la instancia estaba "detached".

### Contexto
Este error ocurre cuando:
1. FastAPI serializa la respuesta (Location creado)
2. Pydantic valida la respuesta
3. Si hay un error de validación, intenta loggear el objeto Location
4. `__repr__()` se ejecuta
5. Intenta hacer lazy load de `self.company` → **DetachedInstanceError**

---

## ✅ Solución Implementada

### Archivo: `backend/app/models/location.py`

**Antes (❌):**
```python
def __repr__(self) -> str:
    company_name = self.company.name if self.company else "N/A"
    return f"<Location {self.name} ({company_name})>"
```

**Después (✅):**
```python
def __repr__(self) -> str:
    """Safe repr that doesn't trigger lazy loads."""
    try:
        # Only access company if already loaded to avoid DetachedInstanceError
        from sqlalchemy import inspect
        insp = inspect(self)
        if 'company' in insp.unloaded:
            company_name = "N/A"
        else:
            company_name = self.company.name if self.company else "N/A"
    except Exception:
        company_name = "N/A"
    return f"<Location {self.name} ({company_name})>"
```

### Explicación

1. **Usa `inspect()`** de SQLAlchemy para verificar estado de la relación
2. **Verifica si está loaded** con `insp.unloaded`
3. **Solo accede si está cargado**, evitando lazy load
4. **Try/catch** como fallback de seguridad

---

## 🧪 Testing

### Crear Location (Debe funcionar ahora)

1. Abre wizard → Step 1
2. Selecciona una company existente
3. Click "+ Create new location"
4. Llena formulario:
   - Name: "Plant Test"
   - City: "Guadalajara"
   - State: "Jalisco"
5. Click "Create Location"

**Resultado esperado:**
- ✅ Location se crea exitosamente
- ✅ Backend no arroja `DetachedInstanceError`
- ✅ Location aparece seleccionado en el ComboBox

---

## 📍 Cómo Crear Companies/Locations

### Desde el Wizard (Inline Creation)

#### Crear Company:
```
Dashboard → "+ New Assessment" → Step 1 "Company & Location"
  ↓
Click Company ComboBox (desplegable)
  ↓
Scroll abajo → "+ Create new company"
  ↓
Dialog abre → Llenar formulario:
  - Name: "Honda Manufacturing"
  - Industry: "Automotive"
  - Contact Info (opcional)
  ↓
Click "Create Company"
  ↓
✅ Company creada y auto-seleccionada
```

#### Crear Location:
```
Wizard Step 1 → Selecciona Company primero
  ↓
Click Location ComboBox (se activa después de seleccionar company)
  ↓
Scroll abajo → "+ Create new location"
  ↓
Dialog abre → Llenar formulario:
  - Name: "Planta Guadalajara"
  - City: "Guadalajara"
  - State: "Jalisco"
  - Address (opcional)
  ↓
Click "Create Location"
  ↓
✅ Location creada y auto-seleccionada
```

---

## 🔍 Otros Errores Similares (Prevención)

### Regla General para `__repr__()` con Relationships

**Problema:** Cualquier modelo con relaciones puede tener el mismo error

**Solución:** Usar el mismo patrón safe

```python
def __repr__(self) -> str:
    """Safe repr that doesn't trigger lazy loads."""
    try:
        from sqlalchemy import inspect
        insp = inspect(self)
        
        # Check each relationship before accessing
        if 'related_entity' in insp.unloaded:
            related_name = "N/A"
        else:
            related_name = self.related_entity.name if self.related_entity else "N/A"
    except Exception:
        related_name = "N/A"
    
    return f"<{self.__class__.__name__} {related_name}>"
```

### Modelos a Revisar (Si tienen `__repr__` con relaciones)

- ✅ `Location` - **Ya arreglado**
- 🔍 `Project` - Verificar si tiene `__repr__` con relaciones
- 🔍 `Company` - Verificar si tiene `__repr__` con relaciones
- 🔍 `Proposal` - Verificar si tiene `__repr__` con relaciones

---

## 📊 Resumen

### ✅ Problema Resuelto
- Location creation ya no causa `DetachedInstanceError`
- `__repr__()` es seguro y no dispara lazy loads

### ✅ Companies/Locations Accesibles
- Se crean **inline desde el wizard**
- ComboBox con "+ Create new..." en el dropdown
- Auto-selección después de crear

### 🚧 Mejora Futura (Fase 2)
- Página dedicada `/companies` para gestión
- Lista de companies con búsqueda
- CRUD completo desde UI standalone

---

## 🎓 Lección Aprendida

### Nunca acceder a relaciones lazy en `__repr__()`

**Por qué:** 
- `__repr__()` se llama en contextos fuera de sesión (logging, debugging)
- Lazy loads requieren sesión activa
- Causa `DetachedInstanceError` en producción

**Solución:**
- Usar `inspect()` para verificar estado
- Solo acceder a relaciones ya loaded
- Tener fallback seguro ("N/A")

---

**Fix aplicado:** 5 Nov 2025  
**Status:** ✅ RESUELTO  
**Backend reiniciado:** Sí
