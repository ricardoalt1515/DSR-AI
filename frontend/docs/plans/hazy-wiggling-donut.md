# Enhancement: Make `.aqua-floating-chip` More Prominent

## Estado Actual (post-fix)

El texto ya es legible, pero el chip se ve demasiado sutil visualmente.

**Valores actuales** (`globals.css:1486`):
- Background: `16% primary → 10% accent` (muy transparente)
- Border: `40% primary opacity`
- Color: `var(--primary)` ✅ (ya corregido)

---

## Cambios en `app/globals.css`

| Propiedad | Antes | Después |
|-----------|-------|---------|
| Background gradient | 16% → 10% | **25% → 18%** |
| Border | 40% | **55%** |

### Código

**Línea ~1495-1501:**
```css
/* ANTES */
background: linear-gradient(135deg,
    color-mix(in srgb, var(--primary) 16%, transparent) 0%,
    color-mix(in srgb, var(--accent) 10%, transparent) 100%
);
border: 1px solid color-mix(in srgb, var(--primary) 40%, transparent);

/* DESPUÉS */
background: linear-gradient(135deg,
    color-mix(in srgb, var(--primary) 25%, transparent) 0%,
    color-mix(in srgb, var(--accent) 18%, transparent) 100%
);
border: 1px solid color-mix(in srgb, var(--primary) 55%, transparent);
```

---

## Verificación

```bash
cd frontend && bun run check:ci
```

Manual: Toggle light/dark → verificar chip prominente en ambos modos
