/**
 * DSR Business Opportunity Analysis - Types
 * Simplified structure for waste brokerage decisions
 */

// ==============================================
// BUSINESS OPPORTUNITY ANALYSIS
// ==============================================

/**
 * Landfill Reduction Metrics
 */
export interface LandfillReduction {
	before: string[];
	after: string[];
	annualSavings: string[];
}

/**
 * Waste Handling Cost Savings (Generator perspective - negotiation leverage)
 */
export interface WasteHandlingCostSavings {
	before: string[];
	after: string[];
	annualSavings: string[];
}

/**
 * DSR Revenue Potential from Resale
 */
export interface PotentialRevenue {
	perKg: string[];
	annualPotential: string[];
	marketRate: string[];
	notes: string[];
}

/**
 * Environmental Impact Context
 */
export interface EnvironmentalImpact {
	currentSituation: string;
	benefitIfDiverted: string;
	esgStory: string;
}

/**
 * Material Safety and Handling
 */
export interface MaterialHandling {
	hazardLevel: "None" | "Low" | "Moderate" | "High";
	specificHazards: string[];
	ppeRequirements: string[];
	regulatoryNotes: string[];
	storageRequirements: string[];
	degradationRisks: string[];
	qualityPriceImpact: string[];
}

/**
 * Market Intelligence (Generic - no company names)
 */
export interface MarketIntelligence {
	buyerTypes: string[];
	typicalRequirements: string[];
	pricingFactors: string[];
}

/**
 * Resource Considerations (Practical Guidance)
 */
export interface ResourceConsiderations {
	environmentalImpact: EnvironmentalImpact;
	materialHandling: MaterialHandling;
	marketIntelligence: MarketIntelligence;
}

/**
 * Complete Business Opportunity Analysis
 * Contains all financial, strategic, and material intelligence
 */
export interface BusinessOpportunity {
	// Decision (GO/NO-GO)
	overallRecommendation: "GO" | "NO-GO" | "INVESTIGATE FURTHER";
	decisionSummary: string;

	// Financial Analysis
	landfillReduction: LandfillReduction;
	wasteHandlingCostSavings: WasteHandlingCostSavings;
	potentialRevenue: PotentialRevenue;

	// Strategic Guidance
	strategicRecommendations: string[];
	circularEconomyOptions: string[];
	risks: string[];

	// Material Intelligence
	resourceConsiderations: ResourceConsiderations;
}

// ==============================================
// LIFE CYCLE ASSESSMENT (LCA)
// ==============================================

/**
 * CO₂ Reduction Metrics
 */
export interface CO2Reduction {
	percent: string[];
	tons: string[];
	method: string[];
}

/**
 * Toxicity and Safety Assessment
 */
export interface ToxicityImpact {
	level: string; // "None" | "Low" | "Moderate" | "High"
	notes: string;
}

/**
 * Resource Recovery and Efficiency Metrics
 */
export interface ResourceEfficiency {
	materialRecoveredPercent: string[];
	notes: string;
}

/**
 * Complete Life Cycle Assessment
 * Contains all environmental impact data
 */
export interface LifeCycleAssessment {
	co2Reduction: CO2Reduction;
	toxicityImpact: ToxicityImpact;
	resourceEfficiency: ResourceEfficiency;
	environmentalNotes: string; // Environmental pitch for buyers/generators
}

// ==============================================
// MAIN REPORT OUTPUT
// ==============================================

/**
 * DSR Business Opportunity Report - Simplified Output
 * Contains only essential data for GO/NO-GO decisions
 */
export interface WasteUpcyclingReport {
	// Basic Context
	clientName: string;
	facilityType: string;
	location: string;
	primaryWasteTypes: string[];
	dailyMonthlyVolume: string;
	existingDisposalMethod: string;

	// Core Structured Data
	businessOpportunity: BusinessOpportunity;
	lca: LifeCycleAssessment;
	aiInsights: string[];

	// Display & Metadata
	markdownContent: string;
	confidenceLevel: "High" | "Medium" | "Low";
}

// ==============================================
// AI METADATA (Transparency)
// ==============================================

/**
 * AI Metadata for waste upcycling reports
 * Simplified for business-focused analysis (no engineering tools)
 */
export interface AIMetadata {
	usage_stats: {
		total_tokens: number;
		model_used: string;
		cost_estimate?: number;
		generation_time_seconds?: number;
	};
	user_sector?: string;
	confidence_level: "High" | "Medium" | "Low";
	recommendations?: string[];
	generated_at: string;
	report_type: string; // e.g., "waste_upcycling_feasibility"
}
