/**
 * usePasswordStrength Hook
 *
 * Calculates password strength using zxcvbn library (lazy-loaded for performance).
 * Returns a score from 0-4 and feedback for the user.
 *
 * Score levels:
 * - 0: Too weak (red)
 * - 1: Weak (orange)
 * - 2: Fair (yellow)
 * - 3: Strong (light green)
 * - 4: Very strong (green)
 *
 * @example
 * const { score, feedback, isLoading } = usePasswordStrength(password)
 */

import { useCallback, useEffect, useState } from "react";
import type { ZXCVBNResult } from "zxcvbn";
import { PASSWORD_CHECK_DEBOUNCE } from "@/lib/constants/timings";
import { logger } from "@/lib/utils/logger";

export interface PasswordStrength {
	/** Strength score from 0 (weakest) to 4 (strongest) */
	score: number;
	/** Human-readable label for the score */
	label: string;
	/** Feedback for improving the password */
	feedback: string[];
	/** Whether the password meets minimum requirements */
	isValid: boolean;
	/** Color for visual indication */
	color: "red" | "orange" | "yellow" | "lime" | "green";
	/** Percentage for progress bar (0-100) */
	percentage: number;
	/** Loading state while zxcvbn is being imported */
	isLoading: boolean;
}

// Map score to user-friendly labels
const SCORE_LABELS: Record<number, string> = {
	0: "Too weak",
	1: "Weak",
	2: "Fair",
	3: "Strong",
	4: "Very strong",
};

// Map score to colors for visual feedback
const SCORE_COLORS: Record<number, PasswordStrength["color"]> = {
	0: "red",
	1: "orange",
	2: "yellow",
	3: "lime",
	4: "green",
};

// Minimum score required for password to be considered valid
const MIN_VALID_SCORE = 2;

/**
 * Custom hook for calculating password strength
 *
 * Features:
 * - Lazy loads zxcvbn library only when needed (saves bundle size)
 * - Debounces calculation to avoid excessive computation
 * - Provides actionable feedback for improving password
 * - Returns consistent interface even before zxcvbn loads
 */
export function usePasswordStrength(password: string): PasswordStrength {
	const [zxcvbn, setZxcvbn] = useState<typeof import("zxcvbn") | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [result, setResult] = useState<ZXCVBNResult | null>(null);

	// Lazy load zxcvbn when user starts typing
	useEffect(() => {
		if (password.length > 0 && !zxcvbn && !isLoading) {
			setIsLoading(true);
			import("zxcvbn")
				.then((mod) => {
					setZxcvbn(() => mod.default);
					setIsLoading(false);
				})
				.catch((error) => {
					logger.error("Failed to load zxcvbn", error, "PasswordStrength");
					setIsLoading(false);
				});
		}
	}, [password, zxcvbn, isLoading]);

	// Calculate strength whenever password or zxcvbn changes
	useEffect(() => {
		if (!password) {
			setResult(null);
			return;
		}

		if (zxcvbn) {
			// Debounce calculation slightly to avoid excessive computation
			const timeoutId = setTimeout(() => {
				const calculatedResult = zxcvbn(password);
				setResult(calculatedResult);
			}, PASSWORD_CHECK_DEBOUNCE);

			return () => clearTimeout(timeoutId);
		}

		return undefined;
	}, [password, zxcvbn]);

	// Build feedback messages from zxcvbn result
	const getFeedback = useCallback((): string[] => {
		if (!result) return [];

		const feedbackMessages: string[] = [];

		// Add warning if present
		if (result.feedback.warning) {
			feedbackMessages.push(result.feedback.warning);
		}

		// Add suggestions
		if (result.feedback.suggestions && result.feedback.suggestions.length > 0) {
			feedbackMessages.push(...result.feedback.suggestions);
		}

		// If no feedback but score is low, provide generic advice
		if (feedbackMessages.length === 0 && result.score < MIN_VALID_SCORE) {
			feedbackMessages.push(
				"Use a longer password with a mix of letters, numbers, and symbols",
			);
		}

		return feedbackMessages;
	}, [result]);

	// Return default state if no password entered
	if (!password) {
		return {
			score: 0,
			label: "Enter password",
			feedback: [],
			isValid: false,
			color: "red",
			percentage: 0,
			isLoading: false,
		};
	}

	// Return loading state while zxcvbn is being imported
	if (isLoading || (!result && password.length > 0)) {
		return {
			score: 0,
			label: "Calculating...",
			feedback: [],
			isValid: false,
			color: "yellow",
			percentage: 25,
			isLoading: true,
		};
	}

	// Return calculated strength
	const score = result?.score ?? 0;
	const label = SCORE_LABELS[score] ?? "Unknown";
	const color = SCORE_COLORS[score] ?? "red";
	const percentage = score * 25; // Convert 0-4 scale to 0-100 percentage
	const isValid = score >= MIN_VALID_SCORE;

	return {
		score,
		label,
		feedback: getFeedback(),
		isValid,
		color,
		percentage,
		isLoading: false,
	};
}

/**
 * Simple password validation (synchronous, no zxcvbn needed)
 * Use this for basic validation before the full strength check
 */
export function validatePasswordBasic(password: string): {
	isValid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	if (password.length < 8) {
		errors.push("At least 8 characters required");
	}
	if (!/[A-Z]/.test(password)) {
		errors.push("At least one uppercase letter required");
	}
	if (!/[0-9]/.test(password)) {
		errors.push("At least one number required");
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}
