# Files Section Redesign - Modal Glassmorphism

## Status: Ready to implement

## Problem
1. **Side panel UX es pobre**: Panel lateral causa layout shift, split attention, desperdicia espacio
2. **File cards básicas**: Hover states mínimos, thumbnails pequeños, category dots casi invisibles
3. **Mobile drawer desconectado**: Se siente como afterthought, pierde contexto

---

## Solution: Modal-First Preview

**Cambio principal**: Reemplazar side panel + drawer con un **modal glassmorphism** al hacer click en archivo.

### Por qué Modal > Side Panel:
- **Estabilidad espacial**: Grid nunca se mueve ni reflowa
- **Focus**: Atención completa al archivo cuando se preview
- **Mobile parity**: Mismo patrón funciona perfecto en mobile
- **Modern patterns**: Drive, Dropbox, Figma usan modales

---

## Modal Layout (60/40 Split)

```
┌────────────────────────────────────────────────────────────────────┐
│  BACKDROP (backdrop-blur-md bg-background/80)                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ [X Close]                                                    │  │
│  │ ┌──────────────────────────┬───────────────────────────────┐ │  │
│  │ │                          │  Filename.pdf                 │ │  │
│  │ │                          │  SDS · 108 KB · 2 days ago    │ │  │
│  │ │      PREVIEW AREA        │                               │ │  │
│  │ │      (PDF / Image)       │  ┌─ glass-liquid-subtle ────┐ │ │  │
│  │ │                          │  │ ✨ AI Summary             │ │ │  │
│  │ │      60% width           │  │ "This SDS describes..."  │ │ │  │
│  │ │                          │  └───────────────────────────┘ │ │  │
│  │ │                          │                               │ │  │
│  │ │                          │  📋 Key Facts                 │ │  │
│  │ │                          │  • Chemical: Nickel Octoate   │ │  │
│  │ │                          │  • Hazard: Flammable          │ │  │
│  │ │                          │                               │ │  │
│  │ │                          │  [Download] [View] [Delete]   │ │  │
│  │ └──────────────────────────┴───────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

**Mobile**: Stacked layout (preview arriba 40vh, metadata abajo scroll)

---

## Enhanced File Cards

```
┌─────────────────────────┐
│  [Category Badge] ↗     │  ← top-right, más grande (px-2 py-1)
│  [AI ✨] ↗              │
│  ┌───────────────────┐  │
│  │                   │  │
│  │   [Thumbnail]     │  │  ← aspect-[16/10] (mejor para PDFs)
│  │   or Type Icon    │  │
│  │                   │  │
│  └───────────────────┘  │
│  Filename.pdf           │  ← text-sm font-medium
│  108 KB · Today         │  ← text-xs muted
└─────────────────────────┘

Hover: scale(1.02), lift 4px, shadow-md, border-primary/30
```

---

## Files to Modify

### Create (new components)
```
files-section/
├── file-preview-modal.tsx      ← Main modal component (Dialog)
├── file-preview-content.tsx    ← Left pane (PDF/image preview)
└── file-preview-metadata.tsx   ← Right pane (AI summary, facts, actions)
```

### Delete (replaced by modal)
- `files-preview-panel.tsx`
- `files-preview-drawer.tsx`

### Modify
- `files-section.tsx` - handleSelectFile abre modal en vez de panel
- `file-card.tsx` - Mejorar hover states, category badge más grande
- `file-row.tsx` - Mismas mejoras

---

## Implementation Steps

### 1. Create Modal Component
```tsx
// file-preview-modal.tsx
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="glass-liquid-strong max-w-[90vw] max-h-[85vh] p-0">
    <div className="flex h-full">
      {/* Left: Preview */}
      <div className="w-[60%] p-8 bg-muted/10">
        <FilePreviewContent file={file} previewUrl={previewUrl} />
      </div>

      {/* Right: Metadata */}
      <div className="w-[40%] p-6 border-l">
        <FilePreviewMetadata
          file={file}
          analysis={analysis}
          onDownload={handleDownload}
          onDelete={handleDelete}
        />
      </div>
    </div>
  </DialogContent>
</Dialog>
```

### 2. Update files-section.tsx
```tsx
// Remove: selectedFileId, previewUrl state for panel
// Add: modalOpen, modalFile state

const handleSelectFile = (file) => {
  setModalFile(file);
  setModalOpen(true);
  // Fetch preview URL and analysis
};
```

### 3. Enhance file-card.tsx Hover States
```tsx
<button
  className={cn(
    "group rounded-xl border bg-card p-3 transition-all duration-200",
    "hover:scale-[1.02] hover:-translate-y-1 hover:shadow-md hover:border-primary/30"
  )}
>
```

### 4. Mobile Responsive
```tsx
// file-preview-modal.tsx
<DialogContent className={cn(
  "glass-liquid-strong p-0",
  "max-w-[90vw] max-h-[85vh]",        // Desktop
  "max-md:max-w-full max-md:h-full",  // Mobile: fullscreen
  "max-md:rounded-none"
)}>
  <div className="flex h-full max-md:flex-col">
    {/* Preview: 60% desktop, 40vh mobile */}
    <div className="w-[60%] max-md:w-full max-md:h-[40vh]">

    {/* Metadata: 40% desktop, rest mobile */}
    <div className="w-[40%] max-md:w-full max-md:flex-1 overflow-auto">
```

---

## Glassmorphism Classes (already exist)

- `glass-liquid` - Base translucent
- `glass-liquid-subtle` - AI summary card
- `glass-liquid-strong` - Modal container
- `backdrop-blur-md` - Overlay
- `shadow-2xl` - Modal depth

---

## Animations

**Open**:
```css
transform: scale(0.95) → scale(1)
opacity: 0 → 1
duration: 250ms ease-out
```

**Close**:
```css
transform: scale(1) → scale(0.98)
opacity: 1 → 0
duration: 200ms
```

---

## Accessibility

- ARIA: `aria-labelledby`, `aria-describedby`
- Focus trap dentro del modal
- Escape para cerrar
- Return focus al card después de cerrar
- Color contrast WCAG AA (4.5:1)
- `prefers-reduced-motion` respected

---

## Verification

1. `bun run check:ci` passes
2. Click file → modal opens con glassmorphism effect
3. Preview: PDF muestra iframe, imagen muestra img
4. AI Summary visible (si existe)
5. Download/Delete funcionan
6. Escape cierra modal
7. Mobile: layout stacked, slide-up animation
8. Grid nunca se mueve/reflowa

---

## Estimated Effort

- Modal component: 4h
- Preview content: 2h
- Metadata sidebar: 2h
- Integration: 2h
- Card enhancements: 1h
- Mobile responsive: 2h
- Testing: 2h

**Total: ~15h (2 días)**
