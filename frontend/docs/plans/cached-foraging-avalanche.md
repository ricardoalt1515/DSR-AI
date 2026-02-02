# Plan: Destacar Campo Destino con Multi-Stage Highlight

## Problema
El vuelo del chip es visible, pero el DESTINO (campo donde aterriza la información) no es suficientemente notorio. El usuario necesita ver claramente "ahí fue a parar mi dato".

## Estado Actual
- ✅ Vuelo con arco Bézier + sparkles + launch burst (ya implementado)
- ❌ El burst de aterrizaje actual es sutil (solo box-shadow expansion)

## Recomendación UX/UI: Multi-Stage Field Highlight

### Por qué funciona
1. **Redundancia visual**: Border + background + glow = imposible de ignorar
2. **Decaimiento progresivo**: Impacto fuerte → confirmación sostenida → fade suave
3. **No bloquea interacción**: Efectos no-modales, usuario puede editar inmediatamente
4. **Uso repetido**: No fatiga visual gracias al decay

---

## Plan de Implementación

### 1. Reemplazar animación `field-apply-burst`
**File:** `globals.css`

```css
@keyframes field-apply-burst {
  0% {
    box-shadow:
      0 0 0 0 hsl(var(--primary) / 0.6),
      0 0 0 0 hsl(var(--primary) / 0.3),
      inset 0 0 0 2px hsl(var(--primary) / 0.8);
    background-color: hsl(var(--primary) / 0.15);
    transform: scale(1.02);
  }
  15% {
    box-shadow:
      0 0 20px 4px hsl(var(--primary) / 0.4),
      0 0 0 8px hsl(var(--primary) / 0.25),
      inset 0 0 0 2px hsl(var(--primary) / 0.6);
    background-color: hsl(var(--primary) / 0.12);
  }
  40% {
    box-shadow:
      0 0 30px 8px hsl(var(--primary) / 0.25),
      0 0 0 16px hsl(var(--primary) / 0.12),
      inset 0 0 0 2px hsl(var(--primary) / 0.4);
    background-color: hsl(var(--primary) / 0.08);
  }
  100% {
    box-shadow:
      0 0 12px 2px hsl(var(--primary) / 0.08),
      0 0 0 32px transparent,
      inset 0 0 0 0px transparent;
    background-color: transparent;
  }
}
```

**Cambio clave**: Añadir `inset` border glow que hace visible el contorno del campo.

### 2. Añadir animación de glow sostenido
**File:** `globals.css`

```css
@keyframes field-sustained-glow {
  0% {
    box-shadow: 0 0 0 1px hsl(var(--primary) / 0.5), 0 0 16px 2px hsl(var(--primary) / 0.3);
    background-color: hsl(var(--primary) / 0.06);
  }
  100% {
    box-shadow: 0 0 0 1px transparent, 0 0 0 0 transparent;
    background-color: transparent;
  }
}

.animate-sustained-glow {
  animation: field-sustained-glow 2000ms cubic-bezier(0.4, 0, 0.6, 1) forwards;
  animation-delay: 700ms;
}
```

### 3. Actualizar clase existente
**File:** `globals.css`

```css
.animate-apply-burst {
  animation: field-apply-burst 1000ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

Aumentar duración: 900ms → 1000ms para que el inset border sea más visible.

### 4. Actualizar función `applyBurst`
**File:** `focus-field.ts`

```typescript
export function applyBurst(element: HTMLElement) {
  element.classList.remove("animate-apply-burst", "animate-sustained-glow");
  void element.offsetWidth; // Force reflow
  element.classList.add("animate-apply-burst", "animate-sustained-glow");

  // Cleanup after animations complete
  setTimeout(() => {
    element.classList.remove("animate-apply-burst", "animate-sustained-glow");
  }, 2800);
}
```

### 5. Reduced motion fallback
**File:** `globals.css`

```css
@media (prefers-reduced-motion: reduce) {
  .animate-apply-burst {
    animation: none;
    background-color: hsl(var(--primary) / 0.15);
    transition: background-color 0.3s ease;
  }
  .animate-sustained-glow {
    animation: none;
  }
}
```

## Archivos a Modificar
1. `globals.css` - Actualizar `field-apply-burst`, añadir `field-sustained-glow`
2. `focus-field.ts` - Actualizar `applyBurst()` para aplicar ambas clases

## Timeline Visual del Efecto Completo

```
0ms      400ms    850ms    1000ms   1700ms   2800ms
|--------|--------|--------|--------|--------|
[Launch burst    ]
         [Chip flying with sparkles          ]
                  [Burst with inset glow     ]
                           [Sustained glow fading........]
```

## Verificación
1. Click Apply → chip vuela con sparkles
2. Al aterrizar: burst con BORDE INTERIOR visible (inset)
3. Glow sostenido por ~2s adicionales
4. Campo claramente identificable como "recién actualizado"
5. Reduced-motion: solo background color sin animaciones
6. `bun run check:ci` pasa

