/**
 * Centralized Chart Configuration
 *
 * Following clean code principles:
 * - DRY: Single source of truth for chart colors
 * - Named constants: No magic colors
 * - Semantic naming: Colors convey meaning
 * - Type-safe: Full TypeScript support
 */

import type { ChartConfig } from "@/components/ui/chart";

// Chart color palette - maps to CSS variables in globals.css
export const CHART_COLORS = {
	// Waste material colors
	input: "hsl(20, 90%, 55%)", // Raw material (orange/brown)
	output: "hsl(180, 85%, 55%)", // Processed material (cyan)
	target: "hsl(120, 70%, 50%)", // Target/limit (green)

	// Economics colors (vibrant for dark mode)
	equipment: "hsl(210, 85%, 55%)", // Blue
	civilWorks: "hsl(160, 75%, 50%)", // Teal
	installation: "hsl(280, 70%, 60%)", // Purple
	engineering: "hsl(40, 90%, 55%)", // Gold
	contingency: "hsl(0, 75%, 60%)", // Red

	// OPEX colors
	energy: "hsl(45, 93%, 47%)", // Yellow/Gold
	chemicals: "hsl(262, 83%, 58%)", // Purple
	personnel: "hsl(173, 58%, 39%)", // Teal
	maintenance: "hsl(24, 95%, 53%)", // Orange

	// AI Confidence colors
	high: "hsl(142, 76%, 36%)", // Success green
	medium: "hsl(48, 96%, 53%)", // Warning yellow
	low: "hsl(0, 84%, 60%)", // Destructive red

	// Generic chart colors (for multi-series)
	primary: "hsl(var(--primary))",
	secondary: "hsl(var(--secondary))",
	accent: "hsl(var(--accent))",
} as const;

/**
 * Waste Material Chart Config
 * Used in: proposal-waste-analysis.tsx
 */
export const wasteAnalysisChartConfig = {
	Input: {
		label: "Input Material",
		color: CHART_COLORS.input,
	},
	Output: {
		label: "Output Product",
		color: CHART_COLORS.output,
	},
	Target: {
		label: "Recovery Target",
		color: CHART_COLORS.target,
	},
} satisfies ChartConfig;

/**
 * Economics CAPEX Chart Config
 * Used in: proposal-economics.tsx
 */
export const capexChartConfig = {
	equipment: {
		label: "Equipment",
		color: CHART_COLORS.equipment,
	},
	civilWorks: {
		label: "Civil Works",
		color: CHART_COLORS.civilWorks,
	},
	installation: {
		label: "Installation",
		color: CHART_COLORS.installation,
	},
	engineering: {
		label: "Engineering",
		color: CHART_COLORS.engineering,
	},
	contingency: {
		label: "Contingency",
		color: CHART_COLORS.contingency,
	},
} satisfies ChartConfig;

/**
 * Economics OPEX Chart Config
 * Used in: proposal-economics.tsx
 */
export const opexChartConfig = {
	energy: {
		label: "Electrical Energy",
		color: CHART_COLORS.energy,
	},
	chemicals: {
		label: "Chemicals",
		color: CHART_COLORS.chemicals,
	},
	personnel: {
		label: "Personnel",
		color: CHART_COLORS.personnel,
	},
	maintenance: {
		label: "Maintenance",
		color: CHART_COLORS.maintenance,
	},
} satisfies ChartConfig;

/**
 * AI Confidence Chart Config
 * Used in: proposal-ai-section.tsx
 */
export const confidenceChartConfig = {
	dataQuality: {
		label: "Data Quality",
		color: CHART_COLORS.primary,
	},
	caseSimilarity: {
		label: "Case Similarity",
		color: CHART_COLORS.secondary,
	},
	technologyMatch: {
		label: "Technology Match",
		color: CHART_COLORS.accent,
	},
} satisfies ChartConfig;

/**
 * Common chart theme settings
 * Apply to all Recharts components for consistency
 */
export const CHART_THEME = {
	grid: {
		stroke: "hsl(var(--border))",
		strokeDasharray: "3 3",
		opacity: 0.5,
	},
	axis: {
		stroke: "hsl(var(--foreground))",
		fontSize: 12,
	},
	tooltip: {
		contentStyle: {
			backgroundColor: "hsl(var(--popover))",
			border: "1px solid hsl(var(--border))",
			borderRadius: "8px",
			color: "hsl(var(--foreground))",
		},
	},
	legend: {
		wrapperStyle: {
			color: "hsl(var(--foreground))",
			fontSize: "14px",
		},
	},
} as const;
