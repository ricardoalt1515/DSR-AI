import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// Formats numbers as currency with sensible defaults for the app.
// Usage: formatCurrency(1500000) -> "$1,500,000.00" (locale dependent)
export function formatCurrency(
	value: number | string | null | undefined,
	options: {
		currency?: string;
		locale?: string;
		minimumFractionDigits?: number;
		maximumFractionDigits?: number;
	} = {},
): string {
	const {
		currency = "USD",
		locale = "es-MX",
		minimumFractionDigits = 2,
		maximumFractionDigits = 2,
	} = options;

	if (value === null || value === undefined || value === "") return "-";
	const num = typeof value === "string" ? Number(value) : value;
	if (Number.isNaN(num)) return "-";

	try {
		return new Intl.NumberFormat(locale, {
			style: "currency",
			currency,
			minimumFractionDigits,
			maximumFractionDigits,
		}).format(num);
	} catch {
		// Fallback
		return `${num.toLocaleString(locale)} ${currency}`;
	}
}

/**
 * Format number with commas and optional decimals
 * Usage: formatNumber(1500.5, 1) -> "1,500.5"
 */
export function formatNumber(
	value: number | string | null | undefined,
	decimals = 1,
): string {
	if (value === null || value === undefined || value === "") return "0";
	const num = typeof value === "string" ? Number(value) : value;
	if (Number.isNaN(num)) return "0";

	return new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 0,
		maximumFractionDigits: decimals,
	}).format(num);
}

/**
 * Format percentage
 * Usage: formatPercent(85.5) -> "85.5%"
 */
export function formatPercent(value: number | undefined): string {
	if (value === undefined || value === null) return "0%";
	return `${formatNumber(value, 1)}%`;
}

/**
 * Format currency as USD without decimals (common use case in proposals)
 * Usage: formatUSD(1234567) -> "$1,234,567"
 */
export function formatUSD(value: number | string | null | undefined): string {
	return formatCurrency(value, {
		locale: "en-US",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	});
}
