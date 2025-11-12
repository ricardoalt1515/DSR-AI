/**
 * PARAMETER REGISTRY
 *
 * Central registry that combines all parameter definitions.
 * Single source of truth for all water treatment parameters.
 */

import { bacteriologicalParameters } from "./definitions/bacteriological.params";
import { chemicalInorganicParameters } from "./definitions/chemical-inorganic.params";
import { chemicalOrganicParameters } from "./definitions/chemical-organic.params";
import { designParameters } from "./definitions/design.params";
import { operationalParameters } from "./definitions/operational.params";
import { physicalParameters } from "./definitions/physical.params";
import { regulatoryParameters } from "./definitions/regulatory.params";
import type { ParameterDefinition } from "./types";

/**
 * Complete parameter library - combination of all modules
 *
 * This is the single source of truth for all parameters.
 * Each module is organized by category for better maintainability.
 */
export const PARAMETER_LIBRARY: ParameterDefinition[] = [
	...designParameters,
	...physicalParameters,
	...chemicalInorganicParameters,
	...chemicalOrganicParameters,
	...bacteriologicalParameters,
	...operationalParameters,
	...regulatoryParameters,
];

/**
 * Parameter registry organized by category
 */
export const PARAMETER_REGISTRY = {
	design: designParameters,
	physical: physicalParameters,
	chemicalInorganic: chemicalInorganicParameters,
	chemicalOrganic: chemicalOrganicParameters,
	bacteriological: bacteriologicalParameters,
	operational: operationalParameters,
	regulatory: regulatoryParameters,
	all: PARAMETER_LIBRARY,
};

/**
 * Get total count of parameters
 */
export function getParameterCount(): number {
	return PARAMETER_LIBRARY.length;
}

/**
 * Get parameter count by category
 */
export function getParameterCountByCategory(): Record<string, number> {
	return {
		design: designParameters.length,
		physical: physicalParameters.length,
		chemicalInorganic: chemicalInorganicParameters.length,
		chemicalOrganic: chemicalOrganicParameters.length,
		bacteriological: bacteriologicalParameters.length,
		operational: operationalParameters.length,
		regulatory: regulatoryParameters.length,
		total: PARAMETER_LIBRARY.length,
	};
}
