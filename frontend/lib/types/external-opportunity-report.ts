export type MetricStatus = "computed" | "not_computed";
export type ProfitabilityBand = "High" | "Medium" | "Low" | "Unknown";
export type AnnualImpactMagnitudeBand =
	| "Unknown"
	| "Under five figures"
	| "Five figures"
	| "Six figures"
	| "Seven figures+";
export type AnnualImpactBasis =
	| "Unknown"
	| "Avoided disposal cost"
	| "Revenue potential"
	| "Mixed";
export type AnnualImpactConfidence = "Low" | "Medium" | "High";

export interface SustainabilityMetric {
	status: MetricStatus;
	value?: string | null;
	basis?: string | null;
	dataNeeded?: string[];
}

export interface CircularityIndicator {
	name: string;
	metric: SustainabilityMetric;
}

export interface SustainabilitySection {
	summary: string;
	co2eReduction: SustainabilityMetric;
	waterSavings: SustainabilityMetric;
	circularity: CircularityIndicator[];
	overallEnvironmentalImpact: string;
}

export interface ExternalOpportunityReport {
	reportVersion: string;
	generatedAt: string;
	sustainability: SustainabilitySection;
	profitabilityBand: ProfitabilityBand;
	endUseIndustryExamples: string[];
	materialDescription: string;
	recommendedActions: string[];
	handlingGuidance: string[];
	profitabilityStatement: string;
	annualImpactMagnitudeBand?: AnnualImpactMagnitudeBand;
	annualImpactBasis?: AnnualImpactBasis;
	annualImpactConfidence?: AnnualImpactConfidence;
	annualImpactNotes?: string[];
	annualImpactNarrative?: string;
	opportunityNarrative?: string;
}

