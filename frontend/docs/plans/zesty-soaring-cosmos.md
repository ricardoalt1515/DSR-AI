# Incoming Materials - Grid Cards UI

## Objetivo
Rediseñar `incoming-materials-card.tsx` con layout de grid 2 columnas, cards compactas con toda la info visible.

## Diseño Visual

```
┌───────────────────────────┬───────────────────────────┐
│ Incoming Materials                    [+ Add Material]│
├───────────────────────────┴───────────────────────────┤
│  ┌──────────────────────┐  ┌──────────────────────┐  │
│  │ 📦 Steel Drums    ✏️ │  │ 📦 Cardboard      ✏️ │  │
│  │ [Metals]             │  │ [Paper]              │  │
│  │ 🚚 50 units/month    │  │ 🚚 200 kg/week       │  │
│  │ 💎 Industrial grade  │  │ 💼 BoxCorp Inc.      │  │
│  └──────────────────────┘  └──────────────────────┘  │
│                                                        │
│  ┌──────────────────────┐                             │
│  │ 📦 Plastic Resin  ✏️ │   Empty state (1 item):    │
│  │ [Plastics]           │   "Add materials to track  │
│  │ 🚚 1000 kg/month     │    what this location      │
│  │ 💎 Food-grade PP     │    consumes"               │
│  │ 💼 AcmeChem          │                            │
│  └──────────────────────┘                             │
└────────────────────────────────────────────────────────┘
```

## Cambios en `incoming-materials-card.tsx`

### Layout
- Contenedor: `grid grid-cols-1 md:grid-cols-2 gap-3`
- Card individual: ~120-140px altura, padding compacto

### Estructura de cada material card
```
┌─────────────────────────────┐
│ 📦 Material Name     ✏️ 🗑️ │  ← Row 1: Icon + Name + Actions
│ [Category Badge]           │  ← Row 2: Badge
│ 🚚 500 kg/month            │  ← Row 3: Volume
│ 💎 Quality spec            │  ← Row 4: Optional (if exists)
│ 💼 Supplier name           │  ← Row 5: Optional (if exists)
│ 📝 Notes truncated...      │  ← Row 6: Optional (if exists)
└─────────────────────────────┘
```

### Detalles de implementación
- CSS Grid: `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`
- Hover: `hover:shadow-md transition-shadow`
- Text truncation: `line-clamp-1` para campos opcionales largos
- Icons para campos opcionales: Sparkles (quality), Briefcase (supplier), FileText (notes)
- Delete button: Solo visible en hover o siempre en móvil
- Card clickeable abre dialog de edit

### Empty state
- Icono Package centrado + texto descriptivo
- Botón "Add First Material"

## Archivos a modificar
- `frontend/components/features/locations/incoming-materials-card.tsx`

## Verificación
- Grid 2 columnas en desktop, 1 en móvil
- Hover eleva card con shadow
- Campos opcionales muestran icono + texto truncado
- Empty state con CTA claro
- Click en card abre edit dialog
