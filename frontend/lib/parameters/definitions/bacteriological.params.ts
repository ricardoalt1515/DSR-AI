/**
 * BACTERIOLOGICAL PARAMETERS
 *
 * Parameters related to microbiological water quality.
 * Includes coliforms, E. coli, and other bacterial indicators.
 */

import type { ParameterDefinition } from "../types";

export const bacteriologicalParameters: ParameterDefinition[] = [
	{
		id: "total-coliforms",
		label: "Total Coliforms",
		category: "bacteriological",
		targetSection: "water-quality",
		relevantSectors: [
			"utilities_public_services",
			"hospitality_commercial_services",
		],
		importance: "critical",
		type: "unit",
		defaultUnit: "MPN/100ml",
		availableUnits: ["MPN/100ml", "CFU/100ml"],
		defaultValue: 0,
		description: "General microbiological contamination indicator",
		tags: ["coliforms", "bacteria", "safety"],
		suggestedSource: "imported",
		required: true,
	},
	{
		id: "fecal-coliforms",
		label: "Fecal Coliforms",
		category: "bacteriological",
		targetSection: "water-quality",
		relevantSectors: [
			"utilities_public_services",
			"hospitality_commercial_services",
		],
		importance: "critical",
		type: "unit",
		defaultUnit: "MPN/100ml",
		availableUnits: ["MPN/100ml", "CFU/100ml"],
		defaultValue: 0,
		description: "Fecal contamination indicator",
		tags: ["coliforms", "fecal", "bacteria"],
		suggestedSource: "imported",
		required: true,
	},
	{
		id: "ecoli",
		label: "E. Coli",
		category: "bacteriological",
		targetSection: "water-quality",
		relevantSectors: [
			"utilities_public_services",
			"hospitality_commercial_services",
		],
		importance: "critical",
		type: "unit",
		defaultUnit: "MPN/100ml",
		availableUnits: ["MPN/100ml", "CFU/100ml"],
		defaultValue: 0,
		description: "Recent fecal contamination indicator",
		tags: ["ecoli", "bacteria", "pathogen"],
		suggestedSource: "imported",
		required: true,
	},
];
