/**
 * AuthFormField Component
 *
 * Wrapper component for form fields in auth forms.
 * Provides consistent styling, error handling, and animations.
 * Integrates seamlessly with React Hook Form.
 *
 * @example
 * <AuthFormField
 *   label="Email"
 *   error={errors.email}
 *   required
 * >
 *   <Input {...register('email')} />
 * </AuthFormField>
 */

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import {
	Children,
	cloneElement,
	isValidElement,
	type ReactElement,
	type ReactNode,
} from "react";
import type { FieldError } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface AuthFormFieldProps {
	/** Label text for the field */
	label: string;
	/** Field identifier (matches the input's name attribute) */
	htmlFor?: string;
	/** Error from React Hook Form */
	error?: FieldError | string | undefined;
	/** Whether the field is required */
	required?: boolean;
	/** Helper text to display below the input */
	helperText?: string;
	/** Additional CSS classes for the container */
	className?: string;
	/** The input element to render */
	children: ReactNode;
}

export function AuthFormField({
	label,
	htmlFor,
	error,
	required,
	helperText,
	className,
	children,
}: AuthFormFieldProps) {
	// Handle both FieldError objects and string errors
	const errorMessage = typeof error === "string" ? error : error?.message;
	const hasError = Boolean(errorMessage);
	const errorId = htmlFor ? `${htmlFor}-error` : undefined;
	const descriptionId = htmlFor ? `${htmlFor}-description` : undefined;

	// Add accessibility attributes to the child input element
	const enhancedChildren = Children.map(children, (child) => {
		if (isValidElement(child)) {
			const ariaDescribedBy =
				[
					hasError ? errorId : null,
					helperText && !hasError ? descriptionId : null,
				]
					.filter(Boolean)
					.join(" ") || undefined;

			return cloneElement(child as ReactElement<Record<string, unknown>>, {
				"aria-invalid": hasError || undefined,
				"aria-describedby": ariaDescribedBy,
			});
		}
		return child;
	});

	return (
		<div className={cn("space-y-2", className)}>
			{/* Label */}
			<Label
				htmlFor={htmlFor}
				className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
			>
				{label}
				{required && (
					<span
						className="text-destructive ml-1"
						role="img"
						aria-label="required"
					>
						*
					</span>
				)}
			</Label>

			{/* Input Element */}
			<div className="relative">{enhancedChildren}</div>

			{/* Error Message with Animation */}
			<AnimatePresence mode="wait">
				{errorMessage && (
					<motion.div
						id={errorId}
						initial={{ opacity: 0, y: -10, height: 0 }}
						animate={{ opacity: 1, y: 0, height: "auto" }}
						exit={{ opacity: 0, y: -10, height: 0 }}
						transition={{ duration: 0.2 }}
						className="flex items-start gap-1.5 text-sm text-destructive"
						role="alert"
						aria-live="polite"
					>
						<AlertCircle
							className="h-4 w-4 mt-0.5 flex-shrink-0"
							aria-hidden="true"
						/>
						<span>{errorMessage}</span>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Helper Text (only show if no error) */}
			{helperText && !errorMessage && (
				<p className="text-xs text-muted-foreground" id={descriptionId}>
					{helperText}
				</p>
			)}
		</div>
	);
}

/**
 * Simplified field wrapper without animations
 * Use for forms where animations might be distracting
 */
export function SimpleFormField({
	label,
	htmlFor,
	error,
	required,
	helperText,
	className,
	children,
}: AuthFormFieldProps) {
	const errorMessage = typeof error === "string" ? error : error?.message;
	const hasError = Boolean(errorMessage);
	const errorId = htmlFor ? `${htmlFor}-error` : undefined;
	const descriptionId = htmlFor ? `${htmlFor}-description` : undefined;

	// Add accessibility attributes to the child input element
	const enhancedChildren = Children.map(children, (child) => {
		if (isValidElement(child)) {
			const ariaDescribedBy =
				[
					hasError ? errorId : null,
					helperText && !hasError ? descriptionId : null,
				]
					.filter(Boolean)
					.join(" ") || undefined;

			return cloneElement(child as ReactElement<Record<string, unknown>>, {
				"aria-invalid": hasError || undefined,
				"aria-describedby": ariaDescribedBy,
			});
		}
		return child;
	});

	return (
		<div className={cn("space-y-2", className)}>
			<Label htmlFor={htmlFor}>
				{label}
				{required && <span className="text-destructive ml-1">*</span>}
			</Label>

			{enhancedChildren}

			{errorMessage && (
				<p
					id={errorId}
					className="text-sm text-destructive flex items-center gap-1.5"
					role="alert"
				>
					<AlertCircle className="h-4 w-4" aria-hidden="true" />
					{errorMessage}
				</p>
			)}

			{helperText && !errorMessage && (
				<p id={descriptionId} className="text-xs text-muted-foreground">
					{helperText}
				</p>
			)}
		</div>
	);
}
