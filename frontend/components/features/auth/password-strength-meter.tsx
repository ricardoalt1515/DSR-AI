/**
 * PasswordStrengthMeter Component
 *
 * Visual indicator for password strength with:
 * - Animated progress bar
 * - Color-coded strength levels
 * - Real-time feedback messages
 * - Accessible ARIA labels
 *
 * @example
 * <PasswordStrengthMeter password={password} />
 */

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Shield } from "lucide-react";
import { usePasswordStrength } from "@/lib/hooks/use-password-strength";
import { cn } from "@/lib/utils";

interface PasswordStrengthMeterProps {
	/** The password to analyze */
	password: string;
	/** Additional CSS classes */
	className?: string | undefined;
	/** Whether to show detailed feedback */
	showFeedback?: boolean | undefined;
}

export function PasswordStrengthMeter({
	password,
	className,
	showFeedback = true,
}: PasswordStrengthMeterProps) {
	const strength = usePasswordStrength(password);

	// Don't show anything if password is empty
	if (!password) {
		return null;
	}

	// Semantic color mapping for strength states
	const colorClasses = {
		red: "bg-destructive",
		orange: "bg-warning",
		yellow: "bg-warning/80",
		lime: "bg-success/80",
		green: "bg-success",
	} as const;

	const textColorClasses = {
		red: "text-destructive",
		orange: "text-warning",
		yellow: "text-warning",
		lime: "text-success",
		green: "text-success",
	} as const;

	const bgColorClasses = {
		red: "bg-destructive/10 border-destructive/30",
		orange: "bg-warning/10 border-warning/30",
		yellow: "bg-warning/10 border-warning/30",
		lime: "bg-success/10 border-success/30",
		green: "bg-success/10 border-success/30",
	} as const;

	return (
		<output
			className={cn("space-y-2", className)}
			aria-live="polite"
			aria-atomic="true"
		>
			{/* Progress Bar */}
			<div className="space-y-1.5">
				<div className="flex items-center justify-between">
					<span
						className={cn(
							"text-xs font-medium flex items-center gap-1.5",
							textColorClasses[strength.color],
						)}
					>
						<Shield className="h-3 w-3" />
						Password strength: {strength.label}
					</span>
					<span
						className={cn(
							"text-xs font-medium",
							textColorClasses[strength.color],
						)}
					>
						{strength.percentage}%
					</span>
				</div>

				{/* Progress bar background */}
				<div className="h-2 w-full bg-muted rounded-full overflow-hidden">
					{/* Animated progress fill */}
					<motion.div
						className={cn("h-full rounded-full", colorClasses[strength.color])}
						initial={{ width: 0 }}
						animate={{ width: `${strength.percentage}%` }}
						transition={{
							duration: 0.3,
							ease: "easeOut",
						}}
						aria-valuenow={strength.percentage}
						aria-valuemin={0}
						aria-valuemax={100}
					/>
				</div>
			</div>

			{/* Feedback Messages */}
			{showFeedback && strength.feedback.length > 0 && (
				<AnimatePresence mode="wait">
					<motion.div
						key={strength.feedback.join(",")}
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						transition={{ duration: 0.2 }}
						className={cn(
							"rounded-md border px-3 py-2 space-y-1",
							bgColorClasses[strength.color],
						)}
					>
						{strength.feedback.map((message, index) => (
							<div
								key={`feedback-${index}-${message.slice(0, 20)}`}
								className={cn(
									"flex items-start gap-2 text-xs",
									textColorClasses[strength.color],
								)}
							>
								{strength.isValid ? (
									<CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
								) : (
									<AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
								)}
								<span>{message}</span>
							</div>
						))}
					</motion.div>
				</AnimatePresence>
			)}

			{/* Success indicator when password is strong */}
			{strength.isValid && (
				<motion.div
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					className="flex items-center gap-2 text-xs text-success"
				>
					<CheckCircle2 className="h-4 w-4" />
					<span className="font-medium">Great! This password is secure</span>
				</motion.div>
			)}
		</output>
	);
}

/**
 * Compact version of PasswordStrengthMeter
 * Shows only the progress bar without feedback
 */
export function PasswordStrengthMeterCompact({
	password,
	className,
}: Omit<PasswordStrengthMeterProps, "showFeedback">) {
	return (
		<PasswordStrengthMeter
			password={password}
			className={className}
			showFeedback={false}
		/>
	);
}
