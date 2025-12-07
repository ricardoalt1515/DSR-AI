/**
 * Shared helper functions for extracting proposal metrics
 * Updated for new buyer-focused schema
 */

import type { WasteUpcyclingReport, BusinessPathway } from "@/lib/types/proposal";

/**
 * Extract annual value from pathways (highest)
 */
export function extractHighRevenue(report: WasteUpcyclingReport): string {
	if (!report.pathways || report.pathways.length === 0) return "N/A";

	// Return first pathway's value (they're ordered by margin)
	return report.pathways[0]?.annualValue || "N/A";
}

/**
 * Get margin estimate
 */
export function extractMargin(report: WasteUpcyclingReport): string {
	return report.financials?.dsrMargin || "N/A";
}

/**
 * Get CO2 avoided
 */
export function extractCO2Avoided(report: WasteUpcyclingReport): string {
	return report.environment?.co2Avoided || "N/A";
}

/**
 * Get pathway count
 */
export function getPathwayCount(report: WasteUpcyclingReport): number {
	return report.pathways?.length || 0;
}

/**
 * Get risk count
 */
export function getRiskCount(report: WasteUpcyclingReport): number {
	return report.risks?.length || 0;
}

/**
 * Get ESG headline for display
 */
export function getESGHeadline(report: WasteUpcyclingReport): string {
	return report.environment?.esgHeadline || "Environmental assessment pending";
}

/**
 * Get top pathways for display
 */
export function getTopPathways(report: WasteUpcyclingReport, limit = 3): BusinessPathway[] {
	return report.pathways?.slice(0, limit) || [];
}

// Backward compat aliases
export const extractLandfillDiversion = () => "100%"; // DSR diverts all
export const getBusinessIdeasCount = getPathwayCount;

// ==============================================
// CO2 CONVERSION FUNCTIONS (for Economics page)
// ==============================================

/**
 * Extract CO2 tons from report (handles old and new schema)
 */
export function extractCO2Tons(report: WasteUpcyclingReport): number | null {
	// Try new schema first
	const co2String = report.environment?.co2Avoided;
	if (co2String) {
		const match = co2String.match(/([\d.,]+)\s*(tons?|tCO2e?)/i);
		if (match?.[1]) {
			return parseFloat(match[1].replace(/,/g, ""));
		}
	}
	return null;
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
	return Math.round(num).toLocaleString();
}

/**
 * Convert CO2 tons to equivalent cars off the road for 1 year
 * EPA: 1 car = 4.6 metric tons CO2/year
 */
export function co2ToCars(tons: number): number {
	return tons / 4.6;
}

/**
 * Convert CO2 tons to equivalent trees planted for 10 years
 * EPA: 1 tree absorbs ~0.039 metric tons CO2/year
 */
export function co2ToTrees(tons: number): number {
	return tons / 0.039;
}

/**
 * Convert CO2 tons to equivalent kWh of coal power avoided
 * EPA: ~0.85 kg CO2 per kWh coal
 */
export function co2ToCoalKwh(tons: number): number {
	return (tons * 1000) / 0.85;
}
