/**
 * Form Schemas - Zod validation schemas for all forms
 * Single source of truth for form validation
 */
import { z } from "zod";
import { ADDRESS_TYPES, CUSTOMER_TYPES } from "@/lib/types/company";

export const ZIP_CODE_REGEX = /^\d{5}(-\d{4})?$/;
export const ZIP_CODE_REQUIRED_MESSAGE = "ZIP code is required";
export const ZIP_CODE_FORMAT_MESSAGE = "Enter ZIP as 12345 or 12345-6789";

export function parseZipCode(value: string): string {
	return value.trim();
}

export function isValidZipCode(value: string): boolean {
	return ZIP_CODE_REGEX.test(value);
}

// =============================================================================
// COMPANY SCHEMAS
// =============================================================================

export const companySchema = z.object({
	name: z.string().min(1, "Company name is required").max(100),
	customerType: z.enum(CUSTOMER_TYPES, {
		required_error: "Please select a customer type",
	}),
	industry: z.string().optional(),
	sector: z.string().min(1, "Please select a sector"),
	subsector: z.string().min(1, "Please select a subsector"),
	notes: z.string().optional(),
});

export type CompanyFormData = z.infer<typeof companySchema>;

// Partial schema for step 1 only (basic info)
export const companyBasicSchema = companySchema.pick({
	name: true,
	industry: true,
	sector: true,
	subsector: true,
	customerType: true,
	notes: true,
});

// =============================================================================
// LOCATION SCHEMAS
// =============================================================================

export const locationSchema = z.object({
	name: z.string().min(1, "Location name is required").max(100),
	addressType: z.enum(ADDRESS_TYPES, {
		required_error: "Please select an address type",
	}),
	city: z.string().min(1, "City is required"),
	state: z.string().min(1, "State is required"),
	address: z.string().default(""),
	zipCode: z
		.string()
		.transform(parseZipCode)
		.refine((value) => value.length > 0, {
			message: ZIP_CODE_REQUIRED_MESSAGE,
		})
		.refine((value) => isValidZipCode(value), {
			message: ZIP_CODE_FORMAT_MESSAGE,
		})
		.default(""),
	notes: z.string().default(""),
});

export type LocationFormData = z.infer<typeof locationSchema>;

// =============================================================================
// PROJECT/ASSESSMENT SCHEMAS
// =============================================================================

export const projectSchema = z.object({
	name: z.string().min(1, "Assessment name is required").max(100),
	companyId: z.string().min(1, "Please select a company"),
	locationId: z.string().min(1, "Please select a location"),
	description: z.string().optional(),
});

export type ProjectFormData = z.infer<typeof projectSchema>;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get first error message from Zod validation
 */
export function getFirstError(
	result: z.SafeParseReturnType<unknown, unknown>,
): string | null {
	if (result.success) return null;
	const firstError = result.error.errors[0];
	return firstError?.message ?? "Validation error";
}

/**
 * Format Zod errors into a record for form fields
 */
export function formatErrors(
	result: z.SafeParseReturnType<unknown, unknown>,
): Record<string, string> {
	if (result.success) return {};
	return result.error.errors.reduce(
		(acc, err) => {
			const path = err.path.join(".");
			if (path && !acc[path]) {
				acc[path] = err.message;
			}
			return acc;
		},
		{} as Record<string, string>,
	);
}
