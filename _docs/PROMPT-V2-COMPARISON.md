# Waste Upcycling Report Prompt - V1 vs V2 Comparison

## Summary

**V1** (actual): Prompt extenso y detallado (306 líneas)  
**V2** (nuevo): Prompt refactorizado con best practices (175 líneas)

---

## Key Changes

### 1. Structure: Markdown → XML Tags

**V1**: Usa markdown headers (`# ROLE`, `## landfillReduction`)  
**V2**: Usa XML tags (`<role>`, `<businessOpportunity_schema>`)

**Beneficio**: GPT-5 procesa mejor contexto estructurado con XML (según best practices)

---

### 2. Length Reduction: 306 → 175 lines (43% reduction)

**Eliminado**:
- Repetición de instrucciones (consolidadas)
- Ejemplos ultra-detallados (103 líneas → 40 líneas más concisos)
- Lenguaje excesivamente firme

**Mantenido**:
- Toda la lógica del esquema
- Reglas críticas
- Ejemplos suficientes

---

### 3. Verbosity Control Added

**V1**: No especifica longitud esperada  
**V2**: `Output concise, scannable reports (800-1000 words total)`

**Beneficio**: Evita outputs excesivamente largos o cortos

---

### 4. Tone Adjustment: Firm → Balanced

**V1**:
```markdown
- "Failing to populate these fields is considered an invalid output"
- "**IMPORTANT**: Describe business ideas GENERICALLY"
```

**V2**:
```markdown
- "Incomplete JSON blocks will require regeneration"
- "**Critical**: Use GENERIC buyer types"
```

**Beneficio**: Reduce riesgo de over-engineering por lenguaje demasiado firme

---

### 5. No Self-Reflection Loop (Deliberate)

**Decisión**: NO agregar "create rubric before starting"

**Razón**: 
- Usuario preocupado por over-engineering
- Self-reflection puede hacer que GPT-5 sea demasiado perfeccionista
- Para scouting reports, speed > perfection

---

### 6. Minimal Nudge Phrase

**V1**: No nudge phrase  
**V2**: `Focus on practical, actionable insights DSR can use for quick decision-making`

**Beneficio**: 
- Activa pensamiento orientado a acción
- NO usa "think deeply" (evita overthinking)
- Enfatiza practicidad

---

### 7. Examples: Detailed → Concise

**V1**: 103 líneas de ejemplo (líneas 190-293)  
**V2**: 40 líneas de ejemplo con JSON limpio

**Beneficio**: 
- Más fácil de leer para el agente
- Reduce ruido en el contexto
- Mantiene claridad

---

## Comparison Table

| Aspect | V1 (Actual) | V2 (Nuevo) | Improvement |
|--------|-------------|------------|-------------|
| **Length** | 306 líneas | 175 líneas | ✅ 43% reducción |
| **Structure** | Markdown | XML tags | ✅ Best practice |
| **Verbosity control** | ❌ No | ✅ 800-1000 words | ✅ Agregado |
| **Tone** | Firme | Balanceado | ✅ Menos over-engineering |
| **Self-reflection** | ❌ No | ❌ No (deliberado) | ✅ Evita overthinking |
| **Nudge phrase** | ❌ No | ✅ Minimal | ✅ Sin exagerar |
| **Examples** | 103 líneas | 40 líneas | ✅ 61% más conciso |
| **XML structure** | ❌ No | ✅ Sí | ✅ GPT-5 optimizado |

---

## Best Practices Applied

### ✅ Applied
1. **XML-like syntax** - Structured blocks con tags
2. **Verbosity control** - Especifica longitud esperada
3. **Balanced language** - No excesivamente firme
4. **Concise examples** - Ejemplos más compactos

### ⚠️ Partially Applied
5. **Nudge phrases** - Minimal (solo al final, no exagerado)

### ❌ Deliberately NOT Applied
6. **Self-reflection loop** - Omitido para evitar over-engineering
7. **"Think deeply" phrases** - Evitado explícitamente

---

## Testing Recommendation

### A/B Test Setup

**Test 1**: Generar propuesta con V1 (actual)  
**Test 2**: Generar propuesta con V2 (nuevo)  

**Comparar**:
- ✅ Calidad del output (completeness, accuracy)
- ✅ Longitud del output (¿V2 más conciso?)
- ✅ Tiempo de generación
- ⚠️ Over-engineering (¿V2 overthinks menos?)

### Migration Path

**Opción A - Gradual**:
1. Probar V2 en 3-5 proyectos
2. Comparar resultados con V1
3. Ajustar según feedback
4. Cambiar a V2 si resultados mejores

**Opción B - Inmediata**:
1. Cambiar `proposal_agent.py` para usar V2
2. Generar 1-2 propuestas de prueba
3. Validar que funciona bien
4. Rollback a V1 si hay problemas

---

## Implementation

### To Use V2

Cambiar en `backend/app/agents/proposal_agent.py`:

```python
# BEFORE
prompt_path = "app/prompts/waste-upcycling-report.v1.md"

# AFTER  
prompt_path = "app/prompts/waste-upcycling-report.v2.md"
```

### Rollback

Si V2 causa problemas, simplemente revertir a v1:

```python
prompt_path = "app/prompts/waste-upcycling-report.v1.md"
```

Ambos archivos están disponibles para A/B testing.

---

## Conclusion

**V2 es más limpio, conciso y optimizado para GPT-5** sin caer en over-engineering.

**Recomendación**: Probar V2 en 2-3 proyectos reales antes de adopción completa.

**Riesgo**: Bajo (puedes rollback fácilmente a V1)

**Reward**: Potencial mejora en calidad, concisión y velocidad de generación.
