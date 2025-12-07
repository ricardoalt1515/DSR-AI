/**
 * DSR Business Opportunity Analysis - Types
 * Simplified, buyer-pitch focused
 */

// ==============================================
// STRUCTURED PATHWAY (core value)
// ==============================================

export interface BusinessPathway {
	action: string;
	buyerTypes: string;
	priceRange: string;
	annualValue: string;
	esgPitch: string;  // Ready to copy-paste for buyers
	handling: string;
}

// ==============================================
// SUPPORTING TYPES
// ==============================================

export interface FinancialSummary {
	currentCost: string;
	dsrOffer: string;
	dsrMargin: string;
}

export interface EnvironmentalImpact {
	co2Avoided: string;
	esgHeadline: string;
	currentHarm: string;
}

export interface SafetyHandling {
	hazard: "None" | "Low" | "Moderate" | "High";
	warnings: string;
	storage: string;
}

// ==============================================
// MAIN REPORT (matches backend ProposalOutput)
// ==============================================

export interface WasteUpcyclingReport {
	// Quick summary
	recommendation: "GO" | "NO-GO" | "INVESTIGATE";
	headline: string;
	confidence: "High" | "Medium" | "Low";

	// Context
	client: string;
	location: string;
	material: string;
	volume: string;

	// Analysis
	financials: FinancialSummary;
	environment: EnvironmentalImpact;
	safety: SafetyHandling;

	// Core value: Business pathways
	pathways: BusinessPathway[];

	// Action items
	risks: string[];
	nextSteps: string[];

	// ROI (like Wastetide's "$100 → $1000")
	roiSummary: string;
}

// ==============================================
// AI METADATA
// ==============================================

export interface TransparencyMetadata {
	clientMetadata: Record<string, unknown>;
	generatedAt: string;
	generationTimeSeconds: number;
	reportType: string;
}

export interface AIMetadata {
	proposal: WasteUpcyclingReport;
	transparency: TransparencyMetadata;
}
