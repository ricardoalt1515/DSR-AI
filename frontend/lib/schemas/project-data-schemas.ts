/**
 * Zod validation schemas for project data structure.
 *
 * Validates data coming from backend to ensure type safety at runtime.
 * Prevents breaking changes from affecting frontend.
 *
 * Principles:
 * - Fail fast: Runtime validation catches issues early
 * - Good names: Clear schema names matching backend
 */

import { z } from "zod";

// ═══════════════════════════════════════════════════════════
// FIELD SCHEMA
// ═══════════════════════════════════════════════════════════

/**
 * Individual field schema.
 * Matches backend minimal field structure.
 */
export const FieldSchema = z.object({
	id: z.string().min(1, "Field ID required"),
	value: z.any().nullable(),
	source: z.enum(["manual", "imported", "calculated"]).default("manual"),
	importance: z.enum(["critical", "recommended", "optional"]).optional(),
	required: z.boolean().optional(),
	unit: z.string().optional(),
});

export type Field = z.infer<typeof FieldSchema>;

// ═══════════════════════════════════════════════════════════
// SECTION SCHEMA
// ═══════════════════════════════════════════════════════════

/**
 * Section schema containing multiple fields.
 * Matches backend section structure.
 */
export const SectionSchema = z.object({
	id: z.string().min(1, "Section ID required"),
	title: z.string().min(1, "Section title required"),
	description: z.string().optional(),
	fields: z.array(FieldSchema),
	allowCustomFields: z.boolean().default(true),
	order: z.number().optional(),
});

export type Section = z.infer<typeof SectionSchema>;

// ═══════════════════════════════════════════════════════════
// PROJECT DATA SCHEMA
// ═══════════════════════════════════════════════════════════

/**
 * Complete project data schema.
 * Validates full technical_sections structure from backend.
 */
export const ProjectDataSchema = z.object({
	technical_sections: z.array(SectionSchema).optional(),
	schema_version: z.number().default(1),
});

export type ProjectData = z.infer<typeof ProjectDataSchema>;

// ═══════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Validate technical sections array.
 *
 * @throws ZodError if validation fails
 *
 * @example
 * try {
 *   const sections = validateTechnicalSections(apiResponse.technical_sections);
 *   // sections is now type-safe
 * } catch (error) {
 *   console.error("Invalid data structure:", error);
 * }
 */
export function validateTechnicalSections(data: unknown): Section[] {
	return z.array(SectionSchema).parse(data);
}

/**
 * Validate technical sections with safe fallback.
 * Returns empty array if validation fails instead of throwing.
 *
 * @example
 * const sections = safeParseTechnicalSections(apiResponse.technical_sections);
 * // Always returns Section[], never throws
 */
export function safeParseTechnicalSections(data: unknown): Section[] {
	const result = z.array(SectionSchema).safeParse(data);

	if (result.success) {
		return result.data;
	}

	console.error("Failed to parse technical sections:", result.error);
	return [];
}

/**
 * Validate field structure.
 *
 * @example
 * const field = validateField({
 *   id: "ph",
 *   value: 7.2,
 *   source: "manual"
 * });
 */
export function validateField(data: unknown): Field {
	return FieldSchema.parse(data);
}

/**
 * Check if data has valid schema version.
 * Useful for detecting backend migrations.
 *
 * @example
 * if (getSchemaVersion(projectData) === 2) {
 *   // Handle v2 structure
 * }
 */
export function getSchemaVersion(data: Record<string, unknown>): number {
	return typeof data.schema_version === "number" ? data.schema_version : 1;
}
