import { TIME_MS } from "@/lib/constants";

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

/**
 * Format file size in bytes to human-readable string
 * @param bytes - File size in bytes
 * @returns Formatted string like "1.5 MB"
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format a date string for compact UI display (e.g. "Jan 15, 2:30 PM")
 */
export function formatShortDateTime(value: string): string {
	return new Date(value).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

/**
 * Format a date string with relative labels for recent dates.
 */
export function formatRelativeDate(value: string): string {
	const date = new Date(value);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffDays = Math.floor(diffMs / TIME_MS.DAY);

	if (diffDays <= 0) return "Today";
	if (diffDays === 1) return "Yesterday";
	if (diffDays < 7) return `${diffDays} days ago`;

	return date.toLocaleDateString();
}

/**
 * Format a date for "Member since" display (e.g. "Jan 2024")
 */
export function formatMemberSince(dateString: string): string {
	const date = new Date(dateString);
	if (Number.isNaN(date.getTime())) return "--";
	return date.toLocaleDateString(undefined, {
		month: "short",
		year: "numeric",
	});
}
