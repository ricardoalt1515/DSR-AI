"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Label text for the field */
    label: string;
    /** Optional hint text shown below the input */
    hint?: string;
    /** Error message - when present, field shows error state */
    error?: string;
    /** Whether the field is required */
    required?: boolean;
    /** Unique ID for the field - auto-generated if not provided */
    id?: string;
    /** Children (typically an Input, Select, etc.) */
    children: React.ReactNode;
}

/**
 * Field component - wraps form inputs with consistent label, hint, and error styling.
 * Based on shadcn/ui Field pattern (October 2025).
 *
 * Usage:
 * ```tsx
 * <Field label="Email" required error={errors.email?.message} hint="We'll never share your email">
 *   <Input type="email" {...register("email")} />
 * </Field>
 * ```
 */
function Field({
    label,
    hint,
    error,
    required,
    id,
    children,
    className,
    ...props
}: FieldProps) {
    const generatedId = React.useId();
    const fieldId = id || generatedId;
    const hintId = `${fieldId}-hint`;
    const errorId = `${fieldId}-error`;

    // Clone children to inject aria attributes
    const enhancedChildren = React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
                id: fieldId,
                "aria-describedby": cn(hint && hintId, error && errorId),
                "aria-invalid": error ? true : undefined,
                "aria-required": required,
            });
        }
        return child;
    });

    return (
        <div className={cn("space-y-2", className)} {...props}>
            <Label
                htmlFor={fieldId}
                className={cn(
                    "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                    error && "text-destructive"
                )}
            >
                {label}
                {required && (
                    <span className="ml-1 text-destructive" aria-hidden="true">
                        *
                    </span>
                )}
            </Label>

            {enhancedChildren}

            {hint && !error && (
                <p
                    id={hintId}
                    className="text-xs text-muted-foreground"
                >
                    {hint}
                </p>
            )}

            {error && (
                <p
                    id={errorId}
                    className="text-xs text-destructive flex items-center gap-1"
                    role="alert"
                >
                    <svg
                        className="h-3 w-3 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                    >
                        <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                        />
                    </svg>
                    {error}
                </p>
            )}
        </div>
    );
}

export { Field, type FieldProps };
