/**
 * Password validation: min 8 chars, 1 uppercase, 1 number
 */
export function isValidPassword(password: string): boolean {
	return (
		password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)
	);
}

/**
 * Check if password and confirmation match
 */
export function passwordsMatch(password: string, confirm: string): boolean {
	return password === confirm;
}

/**
 * Get tooltip message for disabled action buttons.
 * Replaces nested ternaries with explicit conditions.
 */
export function getTooltipMessage(
	context: "role" | "status",
	flags: {
		isTenantUser: boolean;
		isSelf: boolean;
		isLastActiveAdmin: boolean;
	},
): string {
	if (flags.isTenantUser) {
		return "Manage tenant users via organizations";
	}
	if (flags.isSelf) {
		return context === "role"
			? "You can\u2019t change your own role"
			: "You can\u2019t deactivate your own account";
	}
	if (flags.isLastActiveAdmin) {
		return "Keep at least one active admin";
	}
	return "";
}

export const PASSWORD_HINT = "Min 8 chars, 1 uppercase, 1 number";
