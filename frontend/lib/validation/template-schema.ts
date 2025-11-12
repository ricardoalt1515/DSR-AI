/**
 * Zod validation schemas for template data from backend.
 *
 * These schemas validate the structure of data received from the backend API,
 * ensuring type safety and catching contract violations at runtime.
 *
 * Mirrors backend Pydantic schemas in backend/app/templates/schemas.py
 */

import { z } from "zod";

/**
 * Data source for a field value.
 *
 * - manual: User-entered data
 * - imported: Data from imported file/report
 * - ai: AI-generated or suggested value
 */
export const DataSourceSchema = z.enum(["manual", "imported", "ai"]);

export type DataSource = z.infer<typeof DataSourceSchema>;

/**
 * Field importance level.
 *
 * - critical: Must have for proposal generation
 * - recommended: Should have, helps improve quality
 * - optional: Nice to have, not required
 */
export const FieldImportanceSchema = z.enum([
	"critical",
	"recommended",
	"optional",
]);

export type FieldImportance = z.infer<typeof FieldImportanceSchema>;

/**
 * Field from backend - minimal structure.
 *
 * Backend only sends:
 * - id: parameter ID
 * - value: user's value (can be null)
 * - source: where data came from
 * - notes: optional user notes
 *
 * Frontend rehydrates with full metadata from parameter-library.
 */
export const BackendFieldSchema = z.object({
	id: z.string().min(1, "Field ID cannot be empty"),
	value: z.any().nullable(),
	source: DataSourceSchema,
	notes: z.string().optional(),
});

export type BackendField = z.infer<typeof BackendFieldSchema>;

/**
 * Section from backend.
 *
 * Contains:
 * - id: unique section identifier
 * - title: human-readable name
 * - description: optional explanation
 * - fields: array of fields (minimum 1)
 */
export const BackendSectionSchema = z.object({
	id: z.string().min(1, "Section ID cannot be empty"),
	title: z.string().min(1, "Section title cannot be empty"),
	description: z.string().optional(),
	fields: z
		.array(BackendFieldSchema)
		.min(1, "Section must have at least one field"),
});

export type BackendSection = z.infer<typeof BackendSectionSchema>;

/**
 * Technical sections array from backend.
 *
 * This is what we receive in:
 * GET /api/v1/projects/{id}/data
 *
 * Response format:
 * ```json
 * {
 *   "technical_sections": [ ...sections ]
 * }
 * ```
 */
export const TechnicalSectionsSchema = z.array(BackendSectionSchema);

export type TechnicalSections = z.infer<typeof TechnicalSectionsSchema>;

/**
 * Project data response from backend.
 *
 * Full structure of GET /api/v1/projects/{id}/data
 */
export const ProjectDataResponseSchema = z.object({
	project_id: z.string().uuid("Invalid project ID format"),
	data: z
		.object({
			technical_sections: TechnicalSectionsSchema.optional(),
			// Allow other fields
		})
		.passthrough(),
});

export type ProjectDataResponse = z.infer<typeof ProjectDataResponseSchema>;

/**
 * Validation result type.
 *
 * Used by validation functions to return either success or error.
 */
export type ValidationResult<T> =
	| { success: true; data: T }
	| { success: false; error: z.ZodError };

/**
 * Validate technical sections from backend.
 *
 * @param data - Raw data from backend
 * @returns Validation result with typed data or error
 *
 * @example
 * ```typescript
 * const result = validateTechnicalSections(backendData);
 * if (result.success) {
 *   console.log("Valid sections:", result.data);
 * } else {
 *   console.error("Validation errors:", result.error.errors);
 * }
 * ```
 */
export function validateTechnicalSections(
	data: unknown,
): ValidationResult<TechnicalSections> {
	const result = TechnicalSectionsSchema.safeParse(data);

	if (result.success) {
		return { success: true, data: result.data };
	}

	return { success: false, error: result.error };
}

/**
 * Validate project data response.
 *
 * @param data - Raw response from GET /api/v1/projects/{id}/data
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const response = await fetch(`/api/v1/projects/${id}/data`);
 * const data = await response.json();
 *
 * const result = validateProjectDataResponse(data);
 * if (!result.success) {
 *   logger.error("Invalid backend response", result.error);
 * }
 * ```
 */
export function validateProjectDataResponse(
	data: unknown,
): ValidationResult<ProjectDataResponse> {
	const result = ProjectDataResponseSchema.safeParse(data);

	if (result.success) {
		return { success: true, data: result.data };
	}

	return { success: false, error: result.error };
}

/**
 * Validate single field.
 *
 * Useful for validating individual field updates.
 *
 * @param data - Raw field data
 * @returns Validation result
 */
export function validateField(data: unknown): ValidationResult<BackendField> {
	const result = BackendFieldSchema.safeParse(data);

	if (result.success) {
		return { success: true, data: result.data };
	}

	return { success: false, error: result.error };
}

/**
 * Validate single section.
 *
 * Useful for validating individual section updates.
 *
 * @param data - Raw section data
 * @returns Validation result
 */
export function validateSection(
	data: unknown,
): ValidationResult<BackendSection> {
	const result = BackendSectionSchema.safeParse(data);

	if (result.success) {
		return { success: true, data: result.data };
	}

	return { success: false, error: result.error };
}

/**
 * Get human-readable error messages from Zod error.
 *
 * @param error - Zod validation error
 * @returns Array of formatted error messages
 *
 * @example
 * ```typescript
 * const result = validateTechnicalSections(badData);
 * if (!result.success) {
 *   const messages = formatValidationErrors(result.error);
 *   console.error("Validation failed:", messages.join(", "));
 * }
 * ```
 */
export function formatValidationErrors(error: z.ZodError): string[] {
	return error.errors.map((err) => {
		const path = err.path.join(".");
		return `${path}: ${err.message}`;
	});
}
