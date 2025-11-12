/**
 * PasswordInput Component
 *
 * Enhanced password input with:
 * - Show/hide password toggle
 * - Optional password strength meter
 * - Accessibility features (ARIA labels, keyboard navigation)
 * - Consistent styling with shadcn/ui
 *
 * @example
 * <PasswordInput
 *   value={password}
 *   onChange={(e) => setPassword(e.target.value)}
 *   showStrengthMeter
 * />
 */

"use client";

import { Eye, EyeOff, Lock } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PasswordStrengthMeter } from "./password-strength-meter";

export interface PasswordInputProps
	extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
	/** Whether to show the password strength meter */
	showStrengthMeter?: boolean;
	/** Custom icon to display at the start of the input */
	icon?: React.ReactNode;
	/** Additional CSS classes for the container */
	containerClassName?: string;
}

export const PasswordInput = React.forwardRef<
	HTMLInputElement,
	PasswordInputProps
>(
	(
		{
			className,
			containerClassName,
			showStrengthMeter = false,
			icon,
			value,
			onChange,
			disabled,
			...props
		},
		ref,
	) => {
		const [showPassword, setShowPassword] = React.useState(false);
		const passwordValue = (value as string) || "";

		const togglePasswordVisibility = React.useCallback(() => {
			setShowPassword((prev) => !prev);
		}, []);

		// Keyboard shortcut: Ctrl+Shift+P to toggle password visibility
		React.useEffect(() => {
			const handleKeyDown = (e: KeyboardEvent) => {
				if (e.ctrlKey && e.shiftKey && e.key === "P") {
					e.preventDefault();
					togglePasswordVisibility();
				}
			};

			document.addEventListener("keydown", handleKeyDown);
			return () => document.removeEventListener("keydown", handleKeyDown);
		}, [togglePasswordVisibility]);

		return (
			<div className={cn("space-y-2", containerClassName)}>
				{/* Input Container */}
				<div className="relative">
					{/* Optional leading icon */}
					{icon && (
						<div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
							{icon}
						</div>
					)}

					{/* Password Input */}
					<Input
						type={showPassword ? "text" : "password"}
						className={cn(
							"pr-10", // Space for toggle button
							icon && "pl-10", // Space for leading icon
							className,
						)}
						ref={ref}
						value={value}
						onChange={onChange}
						disabled={disabled}
						aria-label="Password"
						aria-describedby={
							showStrengthMeter && passwordValue
								? "password-strength"
								: undefined
						}
						autoComplete="current-password"
						{...props}
					/>

					{/* Show/Hide Toggle Button */}
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
						onClick={togglePasswordVisibility}
						disabled={disabled}
						aria-label={showPassword ? "Hide password" : "Show password"}
						aria-pressed={showPassword}
						tabIndex={-1} // Remove from tab order to avoid confusion
					>
						{showPassword ? (
							<EyeOff
								className="h-4 w-4 text-muted-foreground"
								aria-hidden="true"
							/>
						) : (
							<Eye
								className="h-4 w-4 text-muted-foreground"
								aria-hidden="true"
							/>
						)}
					</Button>
				</div>

				{/* Password Strength Meter */}
				{showStrengthMeter && passwordValue && (
					<div id="password-strength">
						<PasswordStrengthMeter password={passwordValue} />
					</div>
				)}
			</div>
		);
	},
);

PasswordInput.displayName = "PasswordInput";

/**
 * Simplified password input without strength meter
 * Use for login forms where strength checking isn't needed
 */
export const SimplePasswordInput = React.forwardRef<
	HTMLInputElement,
	Omit<PasswordInputProps, "showStrengthMeter">
>((props, ref) => {
	return <PasswordInput ref={ref} {...props} showStrengthMeter={false} />;
});

SimplePasswordInput.displayName = "SimplePasswordInput";

/**
 * Password input with lock icon
 * Common pattern for auth forms
 */
export const PasswordInputWithIcon = React.forwardRef<
	HTMLInputElement,
	PasswordInputProps
>((props, ref) => {
	return (
		<PasswordInput ref={ref} icon={<Lock className="h-4 w-4" />} {...props} />
	);
});

PasswordInputWithIcon.displayName = "PasswordInputWithIcon";
