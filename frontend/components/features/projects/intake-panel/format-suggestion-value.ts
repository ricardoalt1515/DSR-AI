"use client";

import type { AISuggestion } from "@/lib/types/intake";

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
	maximumFractionDigits: 2,
});

export function formatSuggestionValue(
	value: AISuggestion["value"],
	unit?: AISuggestion["unit"],
): string {
	const formattedValue =
		typeof value === "number" ? NUMBER_FORMATTER.format(value) : String(value);
	return unit ? `${formattedValue} ${unit}` : formattedValue;
}
