/**
 * PARAMETERS - Public API
 *
 * Central export point for the modular parameter system.
 * Maintains backward compatibility with parameter-library.ts
 *
 * Usage:
 * ```typescript
 * import { getParameterById, PARAMETER_LIBRARY } from "@/lib/parameters"
 *
 * const param = getParameterById("ph")
 * ```
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONSTANTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export { CORE_SECTIONS, isFixedSection } from "./constants";
export { bacteriologicalParameters } from "./definitions/bacteriological.params";
export { chemicalInorganicParameters } from "./definitions/chemical-inorganic.params";
export { chemicalOrganicParameters } from "./definitions/chemical-organic.params";
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PARAMETER DEFINITIONS (organized by category)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export { designParameters } from "./definitions/design.params";
export { operationalParameters } from "./definitions/operational.params";
export { physicalParameters } from "./definitions/physical.params";
export { regulatoryParameters } from "./definitions/regulatory.params";
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REGISTRY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export {
	getParameterCount,
	getParameterCountByCategory,
	PARAMETER_LIBRARY,
	PARAMETER_REGISTRY,
} from "./registry";
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export type { ParameterCategory, ParameterDefinition } from "./types";

import type { Sector, Subsector } from "@/lib/sectors-config";

import { PARAMETER_LIBRARY } from "./registry";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Get parameter by ID
 *
 * @example
 * const phParam = getParameterById("ph")
 */
export function getParameterById(id: string) {
	return PARAMETER_LIBRARY.find((p) => p.id === id);
}

/**
 * Get parameters for a specific section, optionally filtered by sector
 *
 * @example
 * const waterQualityParams = getParametersForSection("water-quality", "industrial")
 */
export function getParametersForSection(
	sectionId: string,
	sector?: string,
	subsector?: string,
) {
	let params = PARAMETER_LIBRARY.filter((p) => p.targetSection === sectionId);

	if (sector) {
		params = params.filter((p) => p.relevantSectors.includes(sector as Sector));
	}

	if (subsector) {
		params = params.filter(
			(p) =>
				!p.relevantSubsectors ||
				p.relevantSubsectors.length === 0 ||
				p.relevantSubsectors.includes(subsector as Subsector),
		);
	}

	return params;
}

/**
 * Filter out parameters that are already added
 *
 * @overload
 * Filter the entire library by existing IDs
 */
export function filterOutExisting(
	existingIds: string[],
): import("./types").ParameterDefinition[];
/**
 * @overload
 * Filter a specific parameter array by existing IDs
 */
export function filterOutExisting(
	params: import("./types").ParameterDefinition[],
	existingIds: string[],
): import("./types").ParameterDefinition[];
export function filterOutExisting(
	paramsOrIds: import("./types").ParameterDefinition[] | string[],
	existingIds?: string[],
) {
	// If second argument exists, first is params array
	if (existingIds !== undefined) {
		const params = paramsOrIds as import("./types").ParameterDefinition[];
		return params.filter((p) => !existingIds.includes(p.id));
	}
	// Otherwise, first argument is existing IDs, filter entire library
	const ids = paramsOrIds as string[];
	return PARAMETER_LIBRARY.filter((p) => !ids.includes(p.id));
}

/**
 * Search parameters by term (label, description, tags)
 *
 * @example
 * const results = searchParameters("ph")
 */
export function searchParameters(term: string) {
	if (!term) return PARAMETER_LIBRARY;

	const searchLower = term.toLowerCase();
	return PARAMETER_LIBRARY.filter(
		(p) =>
			p.label.toLowerCase().includes(searchLower) ||
			p.description.toLowerCase().includes(searchLower) ||
			p.tags.some((tag) => tag.toLowerCase().includes(searchLower)),
	);
}

/**
 * Filter parameters by category
 */
export function filterByCategory(category: string) {
	return PARAMETER_LIBRARY.filter((p) => p.category === category);
}

/**
 * Filter parameters by sector
 */
export function filterBySector(sector: string) {
	return PARAMETER_LIBRARY.filter((p) =>
		p.relevantSectors.includes(sector as Sector),
	);
}

/**
 * Filter parameters by subsector
 */
export function filterBySubsector(subsector: string) {
	return PARAMETER_LIBRARY.filter(
		(p) =>
			!p.relevantSubsectors ||
			p.relevantSubsectors.length === 0 ||
			p.relevantSubsectors.includes(subsector as Subsector),
	);
}

/**
 * Filter parameters by section
 */
export function filterBySection(sectionId: string) {
	return PARAMETER_LIBRARY.filter((p) => p.targetSection === sectionId);
}
