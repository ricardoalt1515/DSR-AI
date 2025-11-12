/**
 * OPERATIONAL PARAMETERS
 *
 * Parameters related to system operation and performance.
 * Includes operating hours, retention time, chlorine residual.
 */

import type { ParameterDefinition } from "../types";

export const operationalParameters: ParameterDefinition[] = [
	{
		id: "operating-hours",
		label: "Operating Hours",
		category: "operational",
		targetSection: "general-data",
		relevantSectors: ["municipal", "commercial", "industrial"],
		importance: "recommended",
		type: "unit",
		defaultUnit: "h/day",
		availableUnits: ["h/day"],
		defaultValue: 24,
		typicalRange: { min: 1, max: 24 },
		description: "Daily operating hours",
		tags: ["operation", "schedule"],
		suggestedSource: "manual",
		validationRule: (value) => Number(value) > 0 && Number(value) <= 24,
		validationMessage: "Hours must be between 1 and 24",
	},
	{
		id: "retention-time",
		label: "Hydraulic Retention Time",
		category: "operational",
		targetSection: "treatment-system",
		relevantSectors: ["municipal", "industrial"],
		importance: "recommended",
		type: "unit",
		defaultUnit: "h",
		availableUnits: ["h", "min", "days"],
		defaultValue: 8,
		typicalRange: { min: 0.5, max: 72 },
		description: "Average water residence time",
		tags: ["retention", "hydraulic", "hrt"],
		suggestedSource: "ai",
	},
	{
		id: "chlorine-residual",
		label: "Chlorine Residual",
		category: "operational",
		targetSection: "water-quality",
		relevantSectors: ["municipal", "commercial"],
		importance: "critical",
		type: "unit",
		defaultUnit: "mg/L",
		availableUnits: ["mg/L", "ppm"],
		defaultValue: 0.5,
		typicalRange: { min: 0, max: 5 },
		description: "Free chlorine residual for disinfection",
		tags: ["chlorine", "disinfection", "residual"],
		suggestedSource: "manual",
	},
];
