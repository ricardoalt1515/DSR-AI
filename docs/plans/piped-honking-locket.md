# Plan: Mostrar Campos Faltantes del AI Agent en UI y PDF

## Contexto del Problema

El AI agent (`backend/app/agents/proposal_agent.py`) genera un `ProposalOutput` con ~25 campos estructurados, pero varios campos valiosos **NO se muestran** ni en la UI ni en el PDF.

### Modelo de Datos (Backend)

**Archivo:** `backend/app/models/proposal_output.py`

```python
class ProposalOutput(BaseSchema):
    recommendation: Literal["GO", "NO-GO", "INVESTIGATE"]
    headline: str
    confidence: Literal["High", "Medium", "Low"]
    client: str
    location: str
    material: str  # 2-4 paragraphs
    volume: str
    financials: FinancialSummary
    economics_deep_dive: EconomicsDeepDive  # ⚠️ NO SE MUESTRA EN UI
    environment: EnvironmentalImpact  # ⚠️ PARCIALMENTE MOSTRADO
    safety: SafetyHandling
    pathways: list[BusinessPathway]  # ⚠️ CAMPOS FALTANTES
    risks: list[str]  # ⚠️ NO EN PDF
    next_steps: list[str]  # ⚠️ NO EN PDF
    roi_summary: str = ""  # ⚠️ NO EN PDF

class EconomicsDeepDive(BaseSchema):
    profitability_band: Literal["High", "Medium", "Low", "Unknown"]
    profitability_summary: str  # ⚠️ NO SE MUESTRA
    cost_breakdown: list[str]  # ⚠️ NO EN UI
    scenario_summary: list[str]  # ⚠️ NO EN UI
    assumptions: list[str] = []  # ⚠️ NO EN UI
    data_gaps: list[str] = []  # ⚠️ NO EN UI

class EnvironmentalImpact(BaseSchema):
    co2_avoided: str
    esg_headline: str
    current_harm: str
    water_savings: str = ""  # ⚠️ NO SE MUESTRA
    circularity_potential: Literal["High", "Medium", "Low"]  # ⚠️ NO SE MUESTRA
    circularity_rationale: str = ""  # ⚠️ NO SE MUESTRA

class BusinessPathway(BaseSchema):
    action: str
    buyer_types: str
    price_range: str
    annual_value: str
    esg_pitch: str
    handling: str
    feasibility: Literal["High", "Medium", "Low"]  # ⚠️ NO EN UI
    target_locations: list[str] = []  # ⚠️ NO SE MUESTRA
    why_it_works: str  # ⚠️ NO SE MUESTRA
```

---

## ⚠️ ORDEN DE IMPLEMENTACIÓN CORREGIDO

**El orden correcto es:**

1. **Fase 1: Tipos** (`proposal.ts`) - PRIMERO actualizar interfaces
2. **Fase 2: PathwayCards** - Modificar componente existente
3. **Fase 3: EnvironmentDetails** - Crear nuevo componente
4. **Fase 4: EconomicsDeepDive** - Crear nuevo componente
5. **Fase 5: proposal-overview** - Integrar con dynamic imports + SectionErrorBoundary
6. **Fase 6: PDF** - Backend pdf_sections.py

---

## Campos Faltantes por Área

| Área | Campo | UI | PDF | Acción |
|------|-------|:--:|:---:|--------|
| **EconomicsDeepDive** | `profitability_band` | ❌ | ✅ | Agregar a UI |
| | `profitability_summary` | ❌ | ❌ | Agregar a ambos |
| | `cost_breakdown` | ❌ | ✅ | Agregar a UI |
| | `scenario_summary` | ❌ | ✅ | Agregar a UI |
| | `assumptions` | ❌ | ✅ | Agregar a UI |
| | `data_gaps` | ❌ | ✅ | Agregar a UI |
| **Environment** | `water_savings` | ❌ | ❌ | Agregar a ambos |
| | `circularity_potential` | ❌ | ❌ | Agregar a ambos |
| | `circularity_rationale` | ❌ | ❌ | Agregar a ambos |
| **Pathways** | `feasibility` | ❌ | ✅ | Agregar a UI |
| | `target_locations` | ❌ | ❌ | Agregar a ambos |
| | `why_it_works` | ❌ | ❌ | Agregar a ambos |
| **Top-level** | `risks` | ✅ | ❌ | Agregar a PDF |
| | `next_steps` | ✅ | ❌ | Agregar a PDF |
| | `roi_summary` | ✅ | ❌ | Agregar a PDF |

---

## Stack Tecnológico

- **Frontend:** Next.js 14 + React 18 + TypeScript + Tailwind CSS 4 + shadcn/ui + framer-motion
- **Backend:** FastAPI + Python 3.12 + Pydantic
- **PDF:** WeasyPrint (HTML-to-PDF)
- **Package managers:** `bun` (frontend), `uv` (backend)

---

## Implementación UI

### Fase 1: Actualizar Tipos TypeScript (PRIMERO)

**Archivo:** `frontend/components/features/proposals/types.ts` o `frontend/lib/types/proposal.ts`

> ⚠️ **CRÍTICO**: Los tipos DEBEN actualizarse ANTES de tocar cualquier componente.

#### 1.1 Agregar EconomicsDeepDive interface

```typescript
// Agregar nueva interface ANTES de WasteUpcyclingReport
export interface EconomicsDeepDive {
  profitabilityBand?: "High" | "Medium" | "Low" | "Unknown";
  profitabilitySummary?: string;
  costBreakdown?: string[];
  scenarioSummary?: string[];
  assumptions?: string[];
  dataGaps?: string[];
}
```

#### 1.2 Actualizar BusinessPathway interface

```typescript
export interface BusinessPathway {
  action: string;
  buyerTypes: string;
  priceRange: string;
  annualValue: string;
  esgPitch: string;
  handling: string;
  // AGREGAR campos opcionales:
  feasibility?: "High" | "Medium" | "Low";
  targetLocations?: string[];
  whyItWorks?: string;
}
```

#### 1.3 Actualizar EnvironmentalImpact interface

```typescript
export interface EnvironmentalImpact {
  co2Avoided: string;
  esgHeadline: string;
  currentHarm: string;
  // AGREGAR campos opcionales:
  waterSavings?: string;
  circularityPotential?: "High" | "Medium" | "Low";
  circularityRationale?: string;
}
```

#### 1.4 Actualizar WasteUpcyclingReport interface

```typescript
export interface WasteUpcyclingReport {
  // ... campos existentes ...

  // Analysis
  financials: FinancialSummary;
  environment: EnvironmentalImpact;
  safety: SafetyHandling;

  // AGREGAR economicsDeepDive:
  economicsDeepDive?: EconomicsDeepDive;

  // ... resto de campos ...
}
```

---

### Fase 2: PathwayCards - Agregar Campos Faltantes

**Archivo:** `frontend/components/features/proposals/overview/pathway-cards.tsx`

#### 2.1 Actualizar Interface (ya definida en tipos, solo importar)

```typescript
// Línea ~24, actualizar PathwayData interface
// NOTA: Importar de tipos o actualizar aquí para que coincida
export interface PathwayData {
  action: string;
  buyerTypes: string;
  priceRange: string;
  annualValue: string;
  esgPitch: string;
  handling: string;
  // Campos agregados (opcionales para backwards compatibility):
  feasibility?: "High" | "Medium" | "Low";
  targetLocations?: string[];
  whyItWorks?: string;
}
```

#### 2.2 Agregar Config de Colores

```typescript
// Agregar después de imports
const FEASIBILITY_CONFIG = {
  High: {
    bg: "bg-success/10",
    text: "text-success",
    border: "border-success/30",
    icon: CheckCircle2
  },
  Medium: {
    bg: "bg-warning/10",
    text: "text-warning",
    border: "border-warning/30",
    icon: AlertCircle
  },
  Low: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/30",
    icon: XCircle
  },
} as const;
```

#### 2.3 Agregar Badge de Feasibility en Header

```tsx
// En PathwayCard component, después del badge "Best ROI" (~línea 101-109)
{pathway.feasibility && (
  <Badge
    variant="outline"
    className={cn(
      "gap-1",
      FEASIBILITY_CONFIG[pathway.feasibility].bg,
      FEASIBILITY_CONFIG[pathway.feasibility].text,
      FEASIBILITY_CONFIG[pathway.feasibility].border
    )}
  >
    {React.createElement(FEASIBILITY_CONFIG[pathway.feasibility].icon, { className: "h-3 w-3" })}
    {pathway.feasibility}
  </Badge>
)}
```

#### 2.4 Agregar Target Locations y Why It Works en Collapsible

```tsx
// Dentro del CollapsibleContent (~línea 199-203), expandir:
<CollapsibleContent>
  <div className="pt-2 px-1 space-y-3">
    {/* Handling existente */}
    <p className="text-sm text-muted-foreground">
      {pathway.handling}
    </p>

    {/* Target Locations - NUEVO */}
    {pathway.targetLocations && pathway.targetLocations.length > 0 && (
      <div className="flex flex-wrap items-center gap-2">
        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          Target Markets:
        </span>
        {pathway.targetLocations.map((loc) => (
          <span
            key={loc}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
          >
            {loc}
          </span>
        ))}
      </div>
    )}

    {/* Why It Works - NUEVO */}
    {pathway.whyItWorks && (
      <div className="pl-3 border-l-2 border-primary/30 bg-primary/5 rounded-r-lg p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Lightbulb className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-primary">Why it works</span>
        </div>
        <p className="text-sm text-muted-foreground italic">
          "{pathway.whyItWorks}"
        </p>
      </div>
    )}
  </div>
</CollapsibleContent>
```

#### 2.5 Imports Necesarios

```typescript
// Agregar a imports existentes
import { AlertCircle, CheckCircle2, Lightbulb, MapPin, XCircle } from "lucide-react";
```

---

### Fase 3: Environment Details - Nuevo Componente

**Archivo nuevo:** `frontend/components/features/proposals/overview/environment-details.tsx`

```tsx
"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Droplets, Globe, Megaphone, RefreshCw, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EnvironmentDetailsProps {
  co2Avoided: string;
  esgHeadline: string;
  currentHarm: string;
  waterSavings?: string;
  circularityPotential?: "High" | "Medium" | "Low";
  circularityRationale?: string;
}

const CIRCULARITY_CONFIG = {
  High: { bg: "bg-success/10", text: "text-success", label: "Closed-loop" },
  Medium: { bg: "bg-warning/10", text: "text-warning", label: "Downcycling" },
  Low: { bg: "bg-destructive/10", text: "text-destructive", label: "Energy recovery" },
} as const;

export function EnvironmentDetails({
  co2Avoided,
  esgHeadline,
  currentHarm,
  waterSavings,
  circularityPotential,
  circularityRationale,
}: EnvironmentDetailsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-success" />
            Environmental Impact
          </h3>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {/* CO2 */}
            <div className="p-4 rounded-xl bg-muted/50 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4 text-success" />
                <span className="text-xs font-medium text-muted-foreground">CO₂ Avoided</span>
              </div>
              <p className="text-lg font-bold text-foreground">{co2Avoided}</p>
              <p className="text-xs text-muted-foreground">per year</p>
            </div>

            {/* Water Savings */}
            {waterSavings && waterSavings !== "Not estimable" && (
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-medium text-muted-foreground">Water Saved</span>
                </div>
                <p className="text-lg font-bold text-foreground">{waterSavings}</p>
                <p className="text-xs text-muted-foreground">per year</p>
              </div>
            )}

            {/* Circularity */}
            {circularityPotential && (
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Circularity</span>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "gap-1",
                    CIRCULARITY_CONFIG[circularityPotential].bg,
                    CIRCULARITY_CONFIG[circularityPotential].text
                  )}
                >
                  {circularityPotential}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {CIRCULARITY_CONFIG[circularityPotential].label}
                </p>
              </div>
            )}
          </div>

          {/* ESG Headline */}
          <div className="p-4 rounded-lg bg-success/5 border border-success/20 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Megaphone className="h-4 w-4 text-success" />
              <span className="text-xs font-semibold text-success">ESG Headline</span>
            </div>
            <p className="text-sm text-foreground">{esgHeadline}</p>
          </div>

          {/* Current Harm */}
          <div className="p-4 rounded-lg bg-warning/5 border border-warning/20 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-xs font-semibold text-warning">If Not Diverted</span>
            </div>
            <p className="text-sm text-muted-foreground">{currentHarm}</p>
          </div>

          {/* Circularity Rationale (Collapsible) */}
          {circularityRationale && (
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-muted-foreground hover:text-foreground"
                >
                  <span className="text-xs">Circularity Details</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      isOpen && "rotate-180"
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="pt-2 px-1 text-sm text-muted-foreground">
                  {circularityRationale}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
```

---

### Fase 4: Economics Deep Dive - Nuevo Componente

**Archivo nuevo:** `frontend/components/features/proposals/overview/economics-deep-dive.tsx`

```tsx
"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  ChevronDown,
  DollarSign,
  HelpCircle,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EconomicsDeepDiveProps {
  profitabilityBand?: "High" | "Medium" | "Low" | "Unknown";
  profitabilitySummary?: string;
  costBreakdown?: string[];
  scenarioSummary?: string[];
  assumptions?: string[];
  dataGaps?: string[];
}

const PROFITABILITY_CONFIG = {
  High: { bg: "bg-success/10", text: "text-success", icon: "💰" },
  Medium: { bg: "bg-warning/10", text: "text-warning", icon: "📊" },
  Low: { bg: "bg-destructive/10", text: "text-destructive", icon: "⚠️" },
  Unknown: { bg: "bg-muted", text: "text-muted-foreground", icon: "❓" },
} as const;

export function EconomicsDeepDive({
  profitabilityBand = "Unknown",
  profitabilitySummary,
  costBreakdown = [],
  scenarioSummary = [],
  assumptions = [],
  dataGaps = [],
}: EconomicsDeepDiveProps) {
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);

  // Don't render if no meaningful data
  if (!profitabilitySummary && costBreakdown.length === 0 && scenarioSummary.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Card className="border-dashed">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Economics Analysis
            </h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              Estimates only
            </span>
          </div>

          {/* Profitability */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-medium text-muted-foreground">Profitability:</span>
            <Badge
              variant="outline"
              className={cn(
                "gap-1 text-sm",
                PROFITABILITY_CONFIG[profitabilityBand].bg,
                PROFITABILITY_CONFIG[profitabilityBand].text
              )}
            >
              {PROFITABILITY_CONFIG[profitabilityBand].icon} {profitabilityBand}
            </Badge>
          </div>

          {/* Profitability Summary */}
          {profitabilitySummary && (
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              {profitabilitySummary}
            </p>
          )}

          {/* Cost Breakdown */}
          {costBreakdown.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Cost Breakdown
              </h4>
              <ul className="space-y-1.5">
                {costBreakdown.map((item, i) => (
                  <li
                    key={i}
                    className="text-sm text-muted-foreground flex items-start gap-2"
                  >
                    <span className="text-primary">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Scenario Summary */}
          {scenarioSummary.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-foreground mb-3">
                📈 Scenarios
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {scenarioSummary.map((scenario, i) => {
                  const isFirst = i === 0;
                  const isLast = i === scenarioSummary.length - 1;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "p-3 rounded-lg border text-sm",
                        isFirst && "bg-success/5 border-success/20",
                        !isFirst && !isLast && "bg-muted/50 border-border",
                        isLast && "bg-warning/5 border-warning/20"
                      )}
                    >
                      <span className="text-xs font-medium text-muted-foreground block mb-1">
                        {isFirst ? "🎯 Best" : isLast ? "⚠️ Worst" : "📊 Base"}
                      </span>
                      <p className="text-foreground">{scenario}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Assumptions (Collapsible) */}
          {assumptions.length > 0 && (
            <Collapsible open={assumptionsOpen} onOpenChange={setAssumptionsOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-muted-foreground hover:text-foreground mb-2"
                >
                  <span className="text-xs flex items-center gap-1">
                    <HelpCircle className="h-3.5 w-3.5" />
                    Assumptions ({assumptions.length})
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      assumptionsOpen && "rotate-180"
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="space-y-1 pl-4 mb-4">
                  {assumptions.map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground">
                      • {item}
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Data Gaps (Warning) */}
          {dataGaps.length > 0 && (
            <div className="p-3 rounded-lg bg-warning/10 border-l-2 border-warning">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="text-xs font-semibold text-warning">Data Gaps</span>
              </div>
              <ul className="space-y-1">
                {dataGaps.map((gap, i) => (
                  <li key={i} className="text-xs text-muted-foreground">
                    • {gap}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
```

---

### Fase 5: Integrar en Proposal Overview

**Archivo:** `frontend/components/features/proposals/proposal-overview.tsx`

> ⚠️ **IMPORTANTE**: Este archivo usa `dynamic` imports de Next.js y `SectionErrorBoundary` para todos los componentes. Seguir el patrón existente.

#### 5.1 Agregar Dynamic Imports (al inicio del archivo, después de los otros imports)

```tsx
// Agregar después de los otros dynamic imports (~línea 49-57)
const EnvironmentDetails = dynamic(
  () =>
    import("./overview/environment-details").then(
      (mod) => mod.EnvironmentDetails,
    ),
  { loading: () => <Skeleton className="h-48 w-full rounded-xl" /> },
);

const EconomicsDeepDive = dynamic(
  () =>
    import("./overview/economics-deep-dive").then(
      (mod) => mod.EconomicsDeepDive,
    ),
  { loading: () => <Skeleton className="h-64 w-full rounded-xl" /> },
);
```

#### 5.2 Renderizar con SectionErrorBoundary (después de Financials, ~línea 205)

```tsx
{/* 4.5 ENVIRONMENT DETAILS (new) */}
{report.environment && (
  <SectionErrorBoundary sectionName="Environmental Impact">
    <EnvironmentDetails
      co2Avoided={report.environment.co2Avoided}
      esgHeadline={report.environment.esgHeadline}
      currentHarm={report.environment.currentHarm}
      waterSavings={report.environment.waterSavings}
      circularityPotential={report.environment.circularityPotential}
      circularityRationale={report.environment.circularityRationale}
    />
  </SectionErrorBoundary>
)}

{/* 4.6 ECONOMICS DEEP DIVE (new) */}
{report.economicsDeepDive && (
  <SectionErrorBoundary sectionName="Economics Analysis">
    <EconomicsDeepDive
      profitabilityBand={report.economicsDeepDive.profitabilityBand}
      profitabilitySummary={report.economicsDeepDive.profitabilitySummary}
      costBreakdown={report.economicsDeepDive.costBreakdown}
      scenarioSummary={report.economicsDeepDive.scenarioSummary}
      assumptions={report.economicsDeepDive.assumptions}
      dataGaps={report.economicsDeepDive.dataGaps}
    />
  </SectionErrorBoundary>
)}
```

#### 5.3 Ubicación en el Layout

El orden de secciones debe ser:
1. Hero Decision Banner
2. Photo Evidence
3. Pathway Cards
4. Financials Snapshot
5. **Environment Details (NUEVO)** ← insertar aquí
6. **Economics Deep Dive (NUEVO)** ← insertar aquí
7. Safety Alert
8. Action Playbook
9. Quick Actions

---

## Implementación PDF

### Fase 6: Actualizar PDF Sections

**Archivo:** `backend/app/visualization/pdf_sections.py`

#### 6.1 Agregar a `_build_internal_sections()` después de Business Pathways (~línea 504):

```python
# Risks & Blockers
risks = proposal_data.get("risks") or []
if risks:
    risks_html = """
    <div class="technical-section">
        <h2 class="section-title">Risks & Blockers</h2>
        <ul>
    """
    for risk in risks:
        risks_html += f"<li>{risk}</li>"
    risks_html += "</ul></div>"
    sections.append(risks_html)

# Next Steps
next_steps = proposal_data.get("nextSteps") or []
if next_steps:
    steps_html = """
    <div class="technical-section">
        <h2 class="section-title">Recommended Next Steps</h2>
        <ol>
    """
    for step in next_steps:
        steps_html += f"<li>{step}</li>"
    steps_html += "</ol></div>"
    sections.append(steps_html)

# ROI Summary
roi_summary = proposal_data.get("roiSummary")
if roi_summary:
    # Add to financial section or as separate section
    roi_html = f"""
    <div class="technical-section">
        <h2 class="section-title">ROI Summary</h2>
        <p><strong>{roi_summary}</strong></p>
    </div>
    """
    sections.append(roi_html)
```

#### 6.2 Expandir Environmental Impact (~línea 457-468):

```python
# Environmental Impact - EXPANDIR
env_html = """
<div class="technical-section">
    <h2 class="section-title">Environmental Impact</h2>
"""
co2_avoided = environment.get("co2Avoided") or "N/A"
esg_headline = environment.get("esgHeadline") or "N/A"
current_harm = environment.get("currentHarm") or "N/A"
water_savings = environment.get("waterSavings") or ""
circularity = environment.get("circularityPotential") or ""
circularity_rationale = environment.get("circularityRationale") or ""

env_html += f"<p><strong>CO2 Avoided:</strong> {co2_avoided}</p>"
env_html += f"<p><strong>ESG Headline:</strong> {esg_headline}</p>"
env_html += f"<p><strong>If Not Diverted:</strong> {current_harm}</p>"

# NUEVOS CAMPOS
if water_savings and water_savings != "Not estimable":
    env_html += f"<p><strong>Water Savings:</strong> {water_savings}</p>"

if circularity:
    badge_class = _get_badge_class(circularity)
    env_html += f'<p><strong>Circularity Potential:</strong> <span class="metric-badge {badge_class}">{circularity}</span></p>'

if circularity_rationale:
    env_html += f"<p><em>{circularity_rationale}</em></p>"

env_html += "</div>"
sections.append(env_html)
```

#### 6.3 Expandir Business Pathways (~línea 485-503):

```python
# Business Pathways - EXPANDIR
if pathways:
    pathways_html = """
    <div class="technical-section">
        <h2 class="section-title">Business Pathways</h2>
    """
    for idx, pathway in enumerate(pathways, 1):
        action = pathway.get("action") or f"Pathway {idx}"
        buyer_types = pathway.get("buyerTypes") or "N/A"
        price_range = pathway.get("priceRange") or "N/A"
        annual_value = pathway.get("annualValue") or "N/A"
        feasibility = pathway.get("feasibility") or "Medium"
        esg_pitch = pathway.get("esgPitch") or ""
        handling = pathway.get("handling") or ""
        target_locations = pathway.get("targetLocations") or []
        why_it_works = pathway.get("whyItWorks") or ""

        badge_class = _get_badge_class(feasibility)

        pathways_html += f"""
        <h3>{action}</h3>
        <p><strong>Buyers:</strong> {buyer_types}</p>
        <p><strong>Price:</strong> {price_range}</p>
        <p><strong>Annual Value:</strong> {annual_value}</p>
        <p><strong>Feasibility:</strong> <span class="metric-badge {badge_class}">{feasibility}</span></p>
        """

        # NUEVOS CAMPOS
        if esg_pitch:
            pathways_html += f"<p><strong>ESG Pitch:</strong> <em>\"{esg_pitch}\"</em></p>"
        if handling:
            pathways_html += f"<p><strong>Handling:</strong> {handling}</p>"
        if target_locations:
            locations_str = ", ".join(target_locations)
            pathways_html += f"<p><strong>Target Markets:</strong> {locations_str}</p>"
        if why_it_works:
            pathways_html += f"<p><strong>Why it works:</strong> <em>{why_it_works}</em></p>"

        pathways_html += "<hr style='margin: 1rem 0; border-top: 1px solid #e5e7eb;'>"

    pathways_html += "</div>"
    sections.append(pathways_html)
```

---

## Verificación

### Comandos de Test

```bash
# Frontend
cd frontend && bun run check:ci

# Backend
cd backend && make check
```

### Checklist Manual

- [ ] Generar una propuesta nueva con todos los campos
- [ ] Verificar PathwayCards muestra feasibility badge
- [ ] Verificar PathwayCards muestra target locations tags
- [ ] Verificar PathwayCards muestra why it works quote
- [ ] Verificar EnvironmentDetails muestra water savings
- [ ] Verificar EnvironmentDetails muestra circularity badge
- [ ] Verificar EconomicsDeepDive muestra todos los campos
- [ ] Descargar PDF interno y verificar nuevas secciones
- [ ] Verificar colores de badges son consistentes UI ↔ PDF

---

## Archivos a Modificar (Resumen)

**Orden de ejecución:**

```
1. frontend/lib/types/proposal.ts           # MODIFICAR PRIMERO (tipos)
2. frontend/components/features/proposals/overview/
   ├── pathway-cards.tsx                    # MODIFICAR (agregar campos)
   ├── environment-details.tsx              # CREAR
   └── economics-deep-dive.tsx              # CREAR
3. frontend/components/features/proposals/
   └── proposal-overview.tsx                # MODIFICAR (dynamic imports + integration)
4. backend/app/visualization/
   └── pdf_sections.py                      # MODIFICAR
```

**Patrones a seguir:**
- `dynamic()` imports con `loading: () => <Skeleton ... />`
- `SectionErrorBoundary` para envolver cada sección
- Campos opcionales con `?` para backwards compatibility

---

## Notas de Diseño

### Sistema de Colores (Tokens CSS)
- `--success` → High (verde)
- `--warning` → Medium (amarillo)
- `--destructive` → Low (rojo)
- `--primary` → Accent/Brand (azul)
- `--muted` → Backgrounds secundarios

### Patrones de Componentes
- Cards con `border-dashed` = datos estimados
- Badges con `bg-{color}/10 text-{color}` = niveles
- Collapsibles para contenido secundario
- Motion con `framer-motion` para animaciones de entrada

### PDF Badges
```css
.badge-high { background: #dcfce7; color: #16a34a; }
.badge-medium { background: #fef3c7; color: #d97706; }
.badge-low { background: #fee2e2; color: #dc2626; }
```
