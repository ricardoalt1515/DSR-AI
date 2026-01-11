/**
 * Format a date string for display using en-US locale
 * @param value - ISO date string
 * @returns Formatted date like "Jan 15, 2024, 2:30 PM"
 */
export function formatDateTime(value: string): string {
	return new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}
