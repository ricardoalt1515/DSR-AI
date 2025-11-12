/**
 * PARAMETER TYPES - Shared type definitions
 *
 * Core types for the parameter system.
 * Extracted from parameter-library.ts for better modularity.
 */

import type { Sector, Subsector } from "@/lib/sectors-config";
import type {
	DataSource,
	FieldImportance,
	FieldType,
} from "@/lib/types/technical-data";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type ParameterCategory =
	| "design"
	| "physical"
	| "chemical-inorganic"
	| "chemical-organic"
	| "bacteriological"
	| "operational"
	| "regulatory";

export interface ParameterDefinition {
	id: string;
	label: string;
	category: ParameterCategory;
	targetSection: string;
	relevantSectors: Sector[];
	relevantSubsectors?: Subsector[];
	importance: FieldImportance;
	type: FieldType;
	defaultUnit?: string;
	availableUnits?: string[];
	defaultValue?: string | number | string[];
	typicalRange?: { min: number; max: number };
	description: string;
	tags: string[];
	suggestedSource?: DataSource;
	validationRule?: (value: unknown) => boolean;
	validationMessage?: string;
	options?: string[];
	required?: boolean;
	multiline?: boolean;
	placeholder?: string;
}
