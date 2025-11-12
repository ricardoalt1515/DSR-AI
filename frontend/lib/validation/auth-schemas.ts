/**
 * Authentication Validation Schemas
 *
 * Zod schemas for validating auth forms (login, register, password reset).
 * All validation messages are in English and follow UX best practices.
 */

import { z } from "zod";

/**
 * Email validation schema
 * - Must be a valid email format
 * - Provides clear error messages
 */
export const emailSchema = z
	.string()
	.min(1, "Email is required")
	.email("Please enter a valid email address")
	.toLowerCase()
	.trim();

/**
 * Password validation schema
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one number
 * - Provides specific feedback for each requirement
 */
export const passwordSchema = z
	.string()
	.min(8, "Password must be at least 8 characters")
	.regex(/[A-Z]/, "Password must contain at least one uppercase letter")
	.regex(/[0-9]/, "Password must contain at least one number");

/**
 * Optional password schema (allows empty string)
 * Used for profile updates where password change is optional
 */
export const optionalPasswordSchema = z
	.string()
	.optional()
	.refine(
		(val) =>
			!val || (val.length >= 8 && /[A-Z]/.test(val) && /[0-9]/.test(val)),
		{
			message:
				"Password must be at least 8 characters with one uppercase and one number",
		},
	);

/**
 * Name validation schema
 * - Minimum 2 characters
 * - Maximum 50 characters
 * - Only letters, spaces, hyphens, and apostrophes
 */
export const nameSchema = z
	.string()
	.min(2, "Name must be at least 2 characters")
	.max(50, "Name must be less than 50 characters")
	.regex(
		/^[a-zA-ZÀ-ÿ\s'-]+$/,
		"Name can only contain letters, spaces, hyphens, and apostrophes",
	)
	.trim();

/**
 * Company name schema (optional)
 * - Minimum 2 characters if provided
 * - Maximum 100 characters
 */
export const companySchema = z
	.string()
	.min(2, "Company name must be at least 2 characters")
	.max(100, "Company name must be less than 100 characters")
	.trim()
	.optional()
	.or(z.literal(""));

// ============================================================================
// Form Schemas
// ============================================================================

/**
 * Login form schema
 */
export const loginSchema = z.object({
	email: emailSchema,
	password: z.string().min(1, "Password is required"),
	rememberMe: z.boolean().optional().default(false),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Register form schema
 * - Includes password confirmation validation
 * - Company field is optional
 */
export const registerSchema = z
	.object({
		email: emailSchema,
		password: passwordSchema,
		confirmPassword: z.string().min(1, "Please confirm your password"),
		firstName: nameSchema,
		lastName: nameSchema,
		company: companySchema,
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ["confirmPassword"],
	});

export type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Multi-step register schema (for wizard)
 * Step 1: Email + Password
 */
export const registerStep1Schema = z
	.object({
		email: emailSchema,
		password: passwordSchema,
		confirmPassword: z.string().min(1, "Please confirm your password"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ["confirmPassword"],
	});

export type RegisterStep1Data = z.infer<typeof registerStep1Schema>;

/**
 * Multi-step register schema (for wizard)
 * Step 2: Personal Info
 */
export const registerStep2Schema = z.object({
	firstName: nameSchema,
	lastName: nameSchema,
	company: companySchema,
});

export type RegisterStep2Data = z.infer<typeof registerStep2Schema>;

/**
 * Password reset request schema
 */
export const passwordResetRequestSchema = z.object({
	email: emailSchema,
});

export type PasswordResetRequestData = z.infer<
	typeof passwordResetRequestSchema
>;

/**
 * Password reset confirmation schema
 */
export const passwordResetConfirmSchema = z
	.object({
		token: z.string().min(1, "Reset token is required"),
		newPassword: passwordSchema,
		confirmPassword: z.string().min(1, "Please confirm your password"),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Passwords don't match",
		path: ["confirmPassword"],
	});

export type PasswordResetConfirmData = z.infer<
	typeof passwordResetConfirmSchema
>;

/**
 * Profile update schema
 */
export const profileUpdateSchema = z.object({
	firstName: nameSchema.optional(),
	lastName: nameSchema.optional(),
	company: companySchema,
	currentPassword: z.string().optional(),
	newPassword: optionalPasswordSchema,
});

export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;
