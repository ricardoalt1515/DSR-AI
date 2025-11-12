# Prompt V3 - Análisis y Lecciones Aplicadas

## Resumen

**V3 es el prompt híbrido óptimo** que combina:
- ✅ Estructura y concisión del DSR prompt
- ✅ Ejemplos claros del V2
- ✅ Lecciones del artículo Amp sobre claridad

**Resultado**: 200 líneas (vs 306 V1, 175 V2, 103 DSR)

---

## Lecciones de Amp Aplicadas al Prompt

### 1. Descripciones Claras > Instrucciones Complejas ⭐⭐⭐⭐⭐

**Lección Amp**:
> "We didn't say 'if a user asks about a file, read the file'. We say 'help me solve the thing' and Claude realizes what to do."

**Aplicado en V3**:

❌ **V1/V2 (complejo)**:
```markdown
You must populate every field of the businessOpportunity schema EXACTLY as described.
Failing to populate these fields is considered an invalid output.
You are a creative business opportunity analyst...
```

✅ **V3 (claro y simple)**:
```xml
<role>
You are a business opportunity analyst for DSR Inc.
Your audience is DSR management making GO/NO-GO decisions.
</role>

<mission>
Generate practical, scouting-level business assessments.
Deliver concise, scannable reports (800-1000 words total).
</mission>
```

**Resultado**: Menos palabras, más claridad

---

### 2. No Over-Constrain el Modelo ⭐⭐⭐⭐⭐

**Lección Amp**:
> "These models are trained to use tools and they're eager to do so. They kinda 'know' they don't know everything."

**Aplicado en V3**:

❌ **V1 (demasiado firme)**:
```markdown
**IMPORTANT**: Describe business ideas GENERICALLY. DO NOT invent company names.
Failing to populate these fields is considered an INVALID OUTPUT.
You MUST always state assumptions when inventing prices.
```

✅ **V3 (balanceado)**:
```xml
<rules>
1. Generic industry types - NEVER invent company names
2. Label assumptions - Prefix all estimates with "Assumption: ..."
3. If data missing - Use "N/A (reason)" instead of guessing
</rules>
```

**Resultado**: Instrucciones claras sin lenguaje excesivamente firme

---

### 3. Referencias Explícitas (No Depender de Memoria) ⭐⭐⭐⭐⭐

**Lección Amp**:
> "All there is to tools are two things: you tell the model what's available, and when it wants to use it, you execute and send response."

Para prompts: **Dar referencias explícitas en vez de asumir que el modelo "recuerda"**

**Aplicado en V3**:

✅ **EPA WaRM Factors como tabla**:
```xml
<reference>

### EPA WaRM CO2 Factors (use these for calculations)

| Material          | Factor (tCO₂e/ton) |
|-------------------|--------------------|
| HDPE/PET plastics | -2.0               |
| Wood/pallets      | -1.6               |
| Mixed organics    | -0.4               |

Transport adder: +0.1 tCO₂e per 100 miles per ton
</reference>
```

**Resultado**: Agente no tiene que "recordar" o inventar factores

---

### 4. Input/Output Schemas Explícitos ⭐⭐⭐⭐

**Lección Amp**:
```go
type EditFileInput struct {
    Path   string `json:"path" jsonschema_description:"The path"`
    OldStr string `json:"old_str" jsonschema_description:"Text to search"`
}
```

**Aplicado en V3**:

✅ **Schema compacto con tipos claros**:
```xml
<businessOpportunity_schema>

- `overallRecommendation`: "GO" | "NO-GO" | "INVESTIGATE FURTHER"
- `decisionSummary`: One-line summary (20-30 words max)
- `circularEconomyOptions`: MAX 3 different pathways

Format: "What to do → who buys it → approx revenue"
</businessOpportunity_schema>
```

**Resultado**: Agente sabe exactamente qué formato usar

---

### 5. Error Handling Explícito ⭐⭐⭐⭐

**Lección Amp**:
```go
if oldContent == newContent {
    return "", fmt.Errorf("old_str not found in file")
}
```

Para prompts: **Decir qué hacer cuando falta data**

**Aplicado en V3**:

✅ **Fallback claro**:
```xml
<rules>
7. **If data missing** - Use "N/A (reason)" instead of guessing
</rules>

<context_available>
If data is missing: make conservative assumptions and label them clearly
Format: "Assumption: [explanation]"
</context_available>
```

**Resultado**: Agente no inventa, marca lo que no sabe

---

### 6. Self-Check Simple ⭐⭐⭐⭐

**Lección Amp**:
> "300 lines and three tools... All that was required was practical engineering."

No over-engineer. Keep it simple.

**Aplicado en V3**:

❌ **DSR (demasiado detallado)**:
```xml
<self_check>
Before finalizing, think carefully and ensure EVERY schema field is populated 
with a single string or list of strings as defined (no nested lists where a 
string is expected). Use "N/A (reason)" if unsure.
</self_check>
```

✅ **V3 (conciso)**:
```xml
<self_check>

Before responding, verify:
- All required fields populated (use "N/A (reason)" if unavailable)
- MAX 3 business ideas listed
- All assumptions clearly labeled
- Generic buyer types only (no company names)
- Environmental context included

</self_check>
```

**Resultado**: Checklist simple y accionable

---

### 7. Ejemplos Concisos pero Completos ⭐⭐⭐⭐

**Lección Amp**:
> Mostró 3 tools con ejemplos claros en ~50 líneas

**Aplicado en V3**:

✅ **2 ejemplos JSON limpios** (vs 103 líneas en V1):
```json
{
  "overallRecommendation": "INVESTIGATE FURTHER",
  "decisionSummary": "Moderate wood opportunity...",
  "circularEconomyOptions": [
    "Grind to sawdust → lumber mills @ $180/ton → ≈$8k/yr",
    "Compress to pellets → biomass plants @ $120/ton → ≈$14k/yr"
  ]
}
```

**Resultado**: Suficiente para entender, no abrumador

---

## Comparación: V1 vs V2 vs DSR vs V3

| Aspecto | V1 | V2 | DSR | V3 |
|---------|----|----|-----|-----|
| **Longitud** | 306 líneas | 175 líneas | 103 líneas | 200 líneas |
| **Estructura** | Markdown | XML | XML compacto | XML balanceado |
| **EPA factors** | ❌ No | ❌ No | ✅ Sí | ✅ Sí (tabla clara) |
| **Self-check** | ❌ No | ❌ No | ✅ Sí (verbose) | ✅ Sí (conciso) |
| **Output order** | Vago | Vago | ✅ Explícito | ✅ Explícito |
| **MAX ideas** | "2-4" | "2-4" | ✅ 3 | ✅ 3 |
| **Ejemplos** | 103 líneas | 40 líneas | 15 líneas | 45 líneas |
| **Tone** | Firme | Balanceado | Balanceado | ✅ Balanceado |
| **Error handling** | Vago | Vago | ✅ "N/A" | ✅ "N/A (reason)" |

---

## Mejoras Específicas del V3

### Del DSR Prompt (tomado)
1. ✅ EPA WaRM factors reference explícito
2. ✅ Self-check final
3. ✅ MAX 3 ideas (clear limit)
4. ✅ Output order (1. Markdown, 2. JSON)
5. ✅ Formato compacto en schema

### Del V2 (tomado)
1. ✅ Ejemplos JSON detallados
2. ✅ Explicación de resourceConsiderations
3. ✅ XML structure clara
4. ✅ currentSituation vs benefitIfDiverted

### De Amp Lessons (aplicado)
1. ✅ Descripciones claras sin over-constraining
2. ✅ Referencias explícitas (EPA table)
3. ✅ Error handling claro ("N/A (reason)")
4. ✅ Self-check simple y accionable
5. ✅ No asumir que modelo "recuerda" cosas

### Nuevo en V3
1. ✅ `<output_order>` explícito (de DSR)
2. ✅ EPA factors en tabla visual (de DSR + mejorado)
3. ✅ Rules numeradas simple (de Amp lessons)
4. ✅ Self-check como checklist (de Amp lessons)
5. ✅ Behavior guidelines en un solo bloque

---

## Métricas

**Reducción vs V1**: 306 → 200 líneas (35% más conciso)  
**Aumento vs DSR**: 103 → 200 líneas (+94%, pero con mejores ejemplos)  
**Aumento vs V2**: 175 → 200 líneas (+14%, pero más claro)

**Puntos clave**:
- ✅ EPA factors: Tabla clara para copiar/pegar
- ✅ Self-check: 5 bullet checklist vs párrafo largo
- ✅ Examples: 2 JSON completos (45 líneas vs 103 V1)
- ✅ Rules: 7 reglas numeradas vs bloques de texto
- ✅ Schema: Formato compacto del DSR + explicación del V2

---

## Testing Recommendation

### A/B Test con diferentes waste types

**Test 1**: Wood waste (como ejemplo en prompt)
**Test 2**: Mixed plastics (diferente al ejemplo)
**Test 3**: Organic waste (muy diferente)

**Comparar**:
- ✅ Calidad output (completeness)
- ✅ Uso correcto EPA factors
- ✅ Assumptions etiquetadas
- ✅ MAX 3 ideas respetado
- ✅ "N/A (reason)" cuando falta data

---

## Migration Path

### Paso 1: Probar V3 (1-2 proyectos)
```python
# backend/app/agents/proposal_agent.py
prompt_path = "app/prompts/waste-upcycling-report.v3.md"
```

### Paso 2: Validar Output
- Verificar JSON completo
- Verificar CO2 calculations con EPA factors
- Verificar solo 3 business ideas
- Verificar assumptions etiquetadas

### Paso 3: Comparar con V1
- Generar mismo proyecto con V1 y V3
- Comparar longitud output
- Comparar calidad recommendations
- Decidir si V3 es mejor

### Paso 4: Rollback si necesario
```python
# Si V3 tiene problemas
prompt_path = "app/prompts/waste-upcycling-report.v1.md"
```

---

## Conclusión

**V3 es el mejor prompt hasta ahora** porque:

1. ⭐ Combina concisión del DSR + ejemplos del V2
2. ⭐ Aplica lecciones de Amp sobre claridad
3. ⭐ EPA factors explícitos (no depende de memoria)
4. ⭐ Self-check conciso y accionable
5. ⭐ Tone balanceado (no over-constraining)
6. ⭐ Error handling claro ("N/A (reason)")

**Siguiente paso recomendado**: Generar 1-2 propuestas con V3 y validar calidad antes de adopción completa.

**Riesgo**: Bajo (rollback fácil)  
**Reward**: Output más consistente, conciso y alineado con lo que DSR necesita
