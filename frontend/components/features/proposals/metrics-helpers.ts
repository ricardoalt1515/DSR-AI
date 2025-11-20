/**
 * Shared helper functions for extracting and formatting proposal metrics
 * Following DRY principle - single source of truth for metric calculations
 */

import type { WasteUpcyclingReport } from "@/lib/types/proposal";

// EPA standard conversion factors (avoid magic numbers)
const CO2_CONVERSIONS = {
	CARS_PER_YEAR: 4.6, // tCO₂e per car per year
	TREES_PLANTED: 0.024, // tCO₂e absorbed per tree per year
	KWH_COAL: 0.00088, // tCO₂e per kWh coal power
} as const;

/**
 * Extracts the highest revenue estimate from potential revenue data
 * @returns Formatted revenue string (e.g., "$43.8k/yr") or "N/A"
 */
export function extractHighRevenue(report: WasteUpcyclingReport): string {
	const annualPotential =
		report.businessOpportunity?.potentialRevenue?.annualPotential?.[0];

	if (!annualPotential) {
		// Fallback: try to extract from first circular economy option
		const firstOption = report.businessOpportunity?.circularEconomyOptions?.[0];
		if (firstOption) {
			const revenueMatch = firstOption.match(/\$[\d.,]+(?:k)?\/(?:ton|yr)/);
			return revenueMatch?.[0] || "N/A";
		}
		return "N/A";
	}

	// Extract highest value from range (e.g., "$8.8k-$43.8k/yr" → "$43.8k/yr")
	const rangeMatch = annualPotential.match(/\$[\d.,]+k?-\$?([\d.,]+k)/);
	if (rangeMatch?.[1]) {
		return `$${rangeMatch[1]}/yr`;
	}

	// Try to extract any dollar amount
	const dollarMatch = annualPotential.match(/\$[\d.,]+k?(?:\/yr)?/);
	return dollarMatch?.[0] || annualPotential;
}

/**
 * Calculates landfill diversion percentage from before/after data
 * @returns Formatted percentage (e.g., "80%") or tonnage string
 */
export function extractLandfillDiversion(report: WasteUpcyclingReport): string {
	const beforeText =
		report.businessOpportunity?.landfillReduction?.before?.[0] || "";
	const afterText =
		report.businessOpportunity?.landfillReduction?.after?.[0] || "";

	// Try to extract percentage from after text
	if (afterText.includes("%")) {
		const match = afterText.match(/([\d.]+)%/);
		return match ? `${match[1]}%` : "N/A";
	}

	// Try to extract tonnage and calculate percentage
	const tonnageMatch = afterText.match(/~?([\d.,]+)\s*(?:t\/yr|tons?)/i);
	const beforeTonnageMatch = beforeText.match(/~?([\d.,]+)\s*(?:t\/yr|tons?)/i);

	if (tonnageMatch?.[1] && beforeTonnageMatch?.[1]) {
		const after = parseFloat(tonnageMatch[1].replace(/,/g, ""));
		const before = parseFloat(beforeTonnageMatch[1].replace(/,/g, ""));
		const percentage = ((after / before) * 100).toFixed(0);
		return `${percentage}%`;
	}

	// If mentions "divert", show descriptive text
	if (afterText.toLowerCase().includes("divert")) {
		const tonnageOnly = afterText.match(/~?([\d.,]+)\s*(?:t\/yr|tons?)/i);
		return tonnageOnly ? tonnageOnly[0] : "Diverted";
	}

	return "N/A";
}

/**
 * Extracts and formats CO₂ avoided from LCA data
 * @returns Formatted CO₂ string (e.g., "~158 tCO₂e/yr")
 */
export function extractCO2Avoided(report: WasteUpcyclingReport): string {
	const tons = report.lca?.co2Reduction?.tons?.[0];
	if (!tons) return "N/A";

	// Clean up and format (e.g., "~158.4 tCO₂e/yr avoided" → "~158 tCO₂e/yr")
	const cleanMatch = tons.match(/~?([\d.,]+)\s*tCO[₂2]e?(?:\/yr)?/i);
	if (cleanMatch?.[1]) {
		const value = parseFloat(cleanMatch[1]);
		return `~${Math.round(value)} tCO₂e/yr`;
	}

	return tons;
}

/**
 * Extracts numeric CO₂ value in tons for equivalency calculations
 * @returns Numeric tons or null if not found
 */
export function extractCO2Tons(report: WasteUpcyclingReport): number | null {
	const tons = report.lca?.co2Reduction?.tons?.[0];
	if (!tons) return null;

	const match = tons.match(/~?([\d.,]+)\s*tCO[₂2]e?/i);
	if (match?.[1]) {
		return parseFloat(match[1].replace(/,/g, ""));
	}

	return null;
}

/**
 * Converts CO₂ tons to car equivalents
 * @param tons - CO₂ in tons
 * @returns Number of cars (rounded)
 */
export function co2ToCars(tons: number): number {
	return Math.round(tons / CO2_CONVERSIONS.CARS_PER_YEAR);
}

/**
 * Converts CO₂ tons to tree equivalents
 * @param tons - CO₂ in tons
 * @returns Number of trees (rounded)
 */
export function co2ToTrees(tons: number): number {
	return Math.round(tons / CO2_CONVERSIONS.TREES_PLANTED);
}

/**
 * Converts CO₂ tons to coal power kWh equivalents
 * @param tons - CO₂ in tons
 * @returns kWh (rounded)
 */
export function co2ToCoalKwh(tons: number): number {
	return Math.round(tons / CO2_CONVERSIONS.KWH_COAL);
}

/**
 * Formats large numbers with commas for readability
 * @param num - Number to format
 * @returns Formatted string (e.g., "6,500")
 */
export function formatNumber(num: number): string {
	return num.toLocaleString("en-US");
}
