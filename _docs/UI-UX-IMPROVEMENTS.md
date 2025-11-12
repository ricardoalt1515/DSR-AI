# 🎨 UI/UX Improvements - Proposal Page

## 📸 **ANÁLISIS DE CAPTURAS**

### **Contexto**
Basado en las capturas de pantalla de la propuesta "prueba estable", se identificaron áreas de mejora en jerarquía visual, legibilidad, y experiencia de usuario.

---

## 🎯 **PROBLEMAS PRIORITARIOS**

### **1. HERO SECTION - Decision no destaca suficientemente**

**PROBLEMA ACTUAL:**
```tsx
// proposal-overview.tsx línea 24-38
<div className="flex items-center justify-center gap-3 mb-2">
  <h1 className="text-4xl font-bold">{proposal.title}</h1>
  <Badge variant={...} className="text-sm px-3 py-1">
    {businessOpp.overallRecommendation}
  </Badge>
</div>
```

**ISSUES:**
- ❌ Badge pequeño (text-sm) compite con título grande (text-4xl)
- ❌ Decision se pierde al lado del título largo
- ❌ No hay jerarquía clara: ¿qué es más importante, el título o la decisión?

**SOLUCIÓN PROPUESTA:**

```tsx
{/* OPCIÓN A: Decision Banner Prominente ARRIBA del título */}
<div className="text-center space-y-4">
  {/* Decision Banner - FULL WIDTH */}
  {businessOpp?.overallRecommendation && (
    <div className={cn(
      "mx-auto max-w-2xl rounded-xl p-6 border-2",
      businessOpp.overallRecommendation === "GO" 
        ? "bg-green-50 border-green-500 dark:bg-green-950/30" 
        : businessOpp.overallRecommendation === "NO-GO"
        ? "bg-red-50 border-red-500 dark:bg-red-950/30"
        : "bg-yellow-50 border-yellow-500 dark:bg-yellow-950/30"
    )}>
      <div className="flex items-center justify-center gap-3 mb-2">
        {businessOpp.overallRecommendation === "GO" && <CheckCircle className="h-8 w-8 text-green-600" />}
        {businessOpp.overallRecommendation === "NO-GO" && <XCircle className="h-8 w-8 text-red-600" />}
        {businessOpp.overallRecommendation === "INVESTIGATE FURTHER" && <AlertCircle className="h-8 w-8 text-yellow-600" />}
        <span className="text-3xl font-bold">
          {businessOpp.overallRecommendation}
        </span>
      </div>
      <p className="text-base font-medium opacity-90">
        {businessOpp.decisionSummary}
      </p>
    </div>
  )}

  {/* Facility Title - SECONDARY */}
  <div>
    <h1 className="text-3xl font-bold mb-1">{proposal.title}</h1>
    <p className="text-lg text-muted-foreground">
      {report.clientName} • {report.facilityType} • {report.location}
    </p>
  </div>
</div>
```

**MEJORAS:**
- ✅ Decision banner ocupa ancho completo (max-w-2xl)
- ✅ Texto grande (text-3xl) para la decisión
- ✅ Icon visual (CheckCircle, XCircle, AlertCircle)
- ✅ Decision summary visible desde el inicio
- ✅ Título de facility es secundario (text-3xl → más pequeño que antes)

---

### **2. MÉTRICAS CARDS - Números no destacan**

**PROBLEMA ACTUAL:**
```tsx
<MetricCard
  label="Waste Volume"
  value={report.dailyMonthlyVolume} // "300 kg/day (~9 tons/month; ~109.5 tons/year)"
  subtitle="Total waste generated"
/>
```

**ISSUE:**
- ❌ El `value` es un string largo → se renderiza igual que el label
- ❌ No hay distinción visual entre "300 kg/day" y el resto del texto
- ❌ Cards tienen mismo peso visual aunque algunas métricas son más importantes

**SOLUCIÓN PROPUESTA:**

```tsx
// Crear función helper para parsear valores
const parseWasteVolume = (volumeStr: string) => {
  // "300 kg/day (~9 tons/month; ~109.5 tons/year)"
  const match = volumeStr.match(/^([\d.]+\s*\w+\/\w+)/);
  const primary = match ? match[1] : volumeStr;
  const secondary = volumeStr.replace(primary, '').trim();
  return { primary, secondary };
};

// MetricCard mejorado
<MetricCard
  icon={Package}
  label="Waste Volume"
  primaryValue="300 kg/day"
  secondaryValue="(~9 tons/month; ~109.5 tons/year)"
  subtitle="Total waste generated"
  variant="primary"
  emphasize={true} // Para métricas importantes
/>
```

**MEJORAS:**
- ✅ `primaryValue` en text-3xl font-bold
- ✅ `secondaryValue` en text-sm text-muted-foreground
- ✅ Prop `emphasize` para destacar cards importantes
- ✅ Mejor legibilidad de números clave

---

### **3. BUSINESS IDEAS - Falta estructura**

**PROBLEMA ACTUAL** (Imagen 2):
```
Circular Economy Business Ideas
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1  Option 1: Manual segregation → bale clean HDPE/PP/PET → sell to regional 
   reprocessor @ $300–$600/ton → estimated revenue $15k–$35k/yr (after sorting 
   cost margin 12–22%).

2  Option 2: Contaminated plastics → partner with plastic-to-fuel pyrolysis 
   operator (tolling) → lower per-ton revenue but handles oily fractions; 
   estimated DSR margin small but avoids disposal costs.

3  Option 3: Install small wash & bale line (CapEx) → upgrade mixed to 'clean 
   regrind' → direct sale to compounders @ premium; higher margin but requires 
   3–6 month payback depending on scale.
```

**ISSUES:**
- ❌ Mucho texto en cada opción → difícil de escanear
- ❌ No hay separación clara entre: descripción, revenue, margin, requirements
- ❌ Faltan indicadores visuales de ROI/complexity/time

**SOLUCIÓN PROPUESTA:**

```tsx
{/* Circular Economy Options - STRUCTURED CARDS */}
{circularEconomyOptions.length > 0 && (
  <div className="space-y-4">
    <h3 className="text-xl font-semibold">Business Pathways</h3>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {circularEconomyOptions.map((option: string, idx: number) => {
        // Parse option text (AI should ideally return structured data, but we can parse)
        const parsed = parseBusinessOption(option);
        
        return (
          <Card key={idx} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">{idx + 1}</span>
                  </div>
                  <div>
                    <CardTitle className="text-base">{parsed.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{parsed.method}</p>
                  </div>
                </div>
                {parsed.complexity && (
                  <Badge variant="outline" className="text-xs">
                    {parsed.complexity}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Revenue Estimate */}
              {parsed.revenue && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                  <span className="text-xs text-muted-foreground">Est. Revenue</span>
                  <span className="text-sm font-bold text-green-600">{parsed.revenue}</span>
                </div>
              )}
              
              {/* Margin */}
              {parsed.margin && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">DSR Margin</span>
                  <span className="text-sm font-semibold">{parsed.margin}</span>
                </div>
              )}
              
              {/* Requirements/Notes */}
              {parsed.notes && (
                <p className="text-xs text-muted-foreground border-t pt-2">
                  {parsed.notes}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  </div>
)}

// Helper function to parse business option
function parseBusinessOption(optionText: string) {
  // Match patterns like "Option 1: [title] → [method] → [details]"
  // Revenue: "$15k–$35k/yr"
  // Margin: "12–22%"
  // This is a temporary solution - ideally AI returns structured JSON
  
  const titleMatch = optionText.match(/Option \d+:\s*([^→]+)/);
  const revenueMatch = optionText.match(/\$[\d,]+[k]?[–—-]\$[\d,]+[k]?\/yr/i);
  const marginMatch = optionText.match(/(\d+[–—-]\d+%)/);
  
  return {
    title: titleMatch?.[1]?.trim() || "Business Option",
    method: optionText.split('→')[1]?.trim() || "",
    revenue: revenueMatch?.[0] || null,
    margin: marginMatch?.[1] || null,
    complexity: optionText.includes("CapEx") ? "High CapEx" : "Low CapEx",
    notes: optionText.split('→').slice(-1)[0]?.trim() || optionText
  };
}
```

**MEJORAS:**
- ✅ Grid layout (2 columnas en desktop)
- ✅ Cards individuales con hover effect
- ✅ Revenue destacado en verde
- ✅ Badges para complexity
- ✅ Separación clara: título, método, revenue, margin, notes
- ✅ Mucho más escaneable

---

### **4. ECONOMICS TAB - Información densa**

**PROBLEMA ACTUAL** (Imagen 3):
```
DSR Revenue Potential
━━━━━━━━━━━━━━━━━━━━
Annual Potential
Low case = $8.8k/yr (@ $0.08/kg × 109,500 kg)
High case = $43.8k/yr (@ $0.40/kg × 109,500 kg)

Market Rates
Indicative Mexican market: PET (recycle $200–$600/ton; HDPE/PP $300–$700/ton depending on cleanliness and demand...
```

**ISSUES:**
- ❌ Números importantes ($8.8k, $43.8k) no destacan suficiente
- ❌ "Low case" y "High case" tienen mismo formato
- ❌ Falta visualización (chart/gauge) para ranges

**SOLUCIÓN PROPUESTA:**

```tsx
{/* DSR Revenue Potential - VISUAL RANGE */}
<Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <DollarSign className="h-5 w-5 text-primary" />
      DSR Revenue Potential
    </CardTitle>
    <p className="text-sm text-muted-foreground">
      Projected annual revenue range
    </p>
  </CardHeader>
  <CardContent className="space-y-6">
    {/* VISUAL REVENUE RANGE */}
    <div className="relative">
      {/* Range Bar */}
      <div className="h-20 bg-gradient-to-r from-yellow-500/20 via-green-500/20 to-green-600/30 rounded-lg relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-between px-6">
          {/* Low Case */}
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">
              $8.8k
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Conservative
            </div>
          </div>
          
          {/* Arrow */}
          <ArrowRight className="h-6 w-6 text-muted-foreground" />
          
          {/* High Case */}
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              $43.8k
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Optimistic
            </div>
          </div>
        </div>
      </div>
      
      {/* Assumptions */}
      <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
        <div className="p-3 rounded bg-yellow-50 dark:bg-yellow-950/20">
          <span className="font-semibold">Low: </span>
          <span className="text-muted-foreground">$0.08/kg × 109,500 kg</span>
        </div>
        <div className="p-3 rounded bg-green-50 dark:bg-green-950/20">
          <span className="font-semibold">High: </span>
          <span className="text-muted-foreground">$0.40/kg × 109,500 kg</span>
        </div>
      </div>
    </div>

    {/* Market Rates - COLLAPSIBLE */}
    <Collapsible>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium">
        <ChevronDown className="h-4 w-4" />
        Market Rate Details
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 p-3 rounded bg-muted/30 text-sm">
        {businessOpp.potentialRevenue.marketRate.map((rate: string, idx: number) => (
          <p key={idx} className="text-muted-foreground">{rate}</p>
        ))}
      </CollapsibleContent>
    </Collapsible>
  </CardContent>
</Card>
```

**MEJORAS:**
- ✅ Números grandes y destacados ($8.8k, $43.8k)
- ✅ Visual range bar con gradient
- ✅ Color coding: amarillo (conservative), verde (optimistic)
- ✅ Assumptions en boxes separados
- ✅ Market rates collapsible para reducir densidad
- ✅ Mucho más visual y escaneable

---

### **5. SIDEBAR - Decision Card demasiado grande**

**PROBLEMA ACTUAL:**
```
DECISION RECOMMENDATION
━━━━━━━━━━━━━━━━━━━━━━
🟡 INVESTIGATE FURTHER

Moderate-value mixed-plastics opportunity 
(estimated 10–18% margin); buyer interest 
likely but polymer mix & oil contamination 
require validation before GO.

✓ Financial
Low case = $8.8k/yr (@ $0.08/kg × 
100,500 kg)

✓ Environmental
=66 tCO e/yr avoided (Assumption: 
109.5 t/yr × 0.6 tCO e avoided per ton)
```

**ISSUE:**
- ❌ Card ocupa ~40% del viewport height
- ❌ Información duplicada con banner de arriba
- ❌ Sidebar debería ser para acciones rápidas, no contenido

**SOLUCIÓN PROPUESTA:**

```tsx
{/* COMPACT Decision Card - Solo en móvil */}
{/* En desktop, el decision banner en hero es suficiente */}
<div className="lg:hidden">
  <DecisionRecommendationCard
    recommendation={businessOpp.overallRecommendation}
    rationale={businessOpp.decisionSummary}
    keyFinancials={businessOpp.potentialRevenue.annualPotential[0]}
    keyEnvironmentalImpact={envSummary}
  />
</div>

{/* Report Status - MÁS PROMINENTE */}
<Card className="border-primary/20">
  <CardHeader className="pb-3">
    <CardTitle className="text-sm">Report Status</CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">Status</span>
      <Badge variant={proposal.status === "Current" ? "default" : "secondary"}>
        {proposal.status}
      </Badge>
    </div>
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">Version</span>
      <span className="text-sm font-medium">{proposal.version}</span>
    </div>
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">Generated</span>
      <span className="text-sm font-medium">
        {new Date(proposal.createdAt).toLocaleDateString()}
      </span>
    </div>
  </CardContent>
</Card>

{/* Quick Actions - MÁS ESPACIO */}
<QuickActionsCard proposal={proposal} onDownloadPDF={onDownloadPDF} />

{/* Agent Confidence */}
<Card>
  <CardHeader className="pb-3">
    <CardTitle className="text-sm">AI Confidence</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="flex items-center gap-4">
      <CircularGauge
        value={confidenceProgress}
        size={80}
        strokeWidth={8}
      />
      <div>
        <div className="text-2xl font-bold">{confidenceLevel}</div>
        <div className="text-xs text-muted-foreground">
          Based on data completeness and market intelligence
        </div>
      </div>
    </div>
  </CardContent>
</Card>
```

**MEJORAS:**
- ✅ Decision card solo en móvil (en desktop hay banner)
- ✅ Más espacio para Quick Actions
- ✅ Report Status más compacto pero legible
- ✅ Agent Confidence con gauge horizontal
- ✅ Sidebar menos cluttered

---

### **6. TYPOGRAPHY & SPACING - Inconsistencias**

**PROBLEMAS GENERALES:**
- text-sm en subtítulos es muy pequeño
- text-muted-foreground tiene bajo contraste en dark mode
- Spacing entre sections varía (space-y-4, space-y-6, space-y-8)

**SOLUCIÓN - DESIGN TOKENS:**

```tsx
// tailwind.config.ts - Agregar custom spacing
module.exports = {
  theme: {
    extend: {
      spacing: {
        'section': '2rem',      // 32px - entre secciones principales
        'card': '1.5rem',       // 24px - entre cards dentro de sección
        'content': '1rem',      // 16px - dentro de card content
      },
      fontSize: {
        'hero': ['3rem', { lineHeight: '1.1', fontWeight: '700' }],     // Decision banner
        'title': ['2.25rem', { lineHeight: '1.2', fontWeight: '700' }], // Page titles
        'heading': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }], // Section headings
        'subheading': ['1.125rem', { lineHeight: '1.4', fontWeight: '600' }], // Card titles
        'metric-value': ['2rem', { lineHeight: '1.2', fontWeight: '700' }], // Big numbers
        'metric-label': ['0.875rem', { lineHeight: '1.4', fontWeight: '500' }], // Metric labels
      },
      colors: {
        'text-primary': 'hsl(var(--foreground))',
        'text-secondary': 'hsl(var(--muted-foreground) / 0.8)',  // Mejor contraste
        'text-tertiary': 'hsl(var(--muted-foreground) / 0.6)',
      }
    }
  }
}

// Uso consistente
<h1 className="text-hero">Decision</h1>
<h2 className="text-title">Waste Upcycling Report</h2>
<h3 className="text-heading">Business Opportunities</h3>
<CardTitle className="text-subheading">Revenue Potential</CardTitle>
<div className="text-metric-value">$43.8k</div>
<span className="text-metric-label">Annual Revenue</span>
```

---

## 📋 **IMPLEMENTATION PLAN**

### **FASE 1: Quick Wins (2-3 horas)**
- [ ] Mejorar Hero Section con decision banner prominente
- [ ] Aumentar tamaño de números en metric cards
- [ ] Reducir decision card en sidebar (solo móvil)
- [ ] Aplicar spacing consistente (space-section, space-card)

### **FASE 2: Structured Business Ideas (3-4 horas)**
- [ ] Crear componente `BusinessPathwayCard` estructurado
- [ ] Implementar parser para opciones de negocio
- [ ] Grid layout en 2 columnas
- [ ] Badges para complexity/CapEx

### **FASE 3: Visual Economics (4-5 horas)**
- [ ] Revenue range bar visual
- [ ] Collapsible sections para market rates
- [ ] Improved CO2 card con iconografía
- [ ] Risk cards con mejor contraste

### **FASE 4: Design System (6-8 horas)**
- [ ] Design tokens en Tailwind config
- [ ] Actualizar todas las typography scales
- [ ] Mejorar contraste en dark mode
- [ ] Documentar component patterns

---

## 🎯 **PRIORIDAD DE IMPLEMENTACIÓN**

1. **CRÍTICO** ⚠️ - Hero Section (decision banner)
2. **ALTO** 🔥 - Business Ideas structure
3. **MEDIO** 📊 - Economics visual range
4. **BAJO** 🎨 - Design system tokens

**Tiempo estimado total**: 15-20 horas

---

**Siguiente paso**: ¿Implemento las mejoras de FASE 1 (Quick Wins) ahora?
