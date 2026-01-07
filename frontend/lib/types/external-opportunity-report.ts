export type MetricStatus = "computed" | "not_computed";
export type ProfitabilityBand = "High" | "Medium" | "Low" | "Unknown";

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
}

