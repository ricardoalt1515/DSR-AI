import type { ExternalOpportunityReport } from "@/lib/types/external-opportunity-report";

/**
 * Business Opportunity Analysis - Types
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
	esgPitch: string; // Ready to copy-paste for buyers
	handling: string;
	feasibility?: "High" | "Medium" | "Low";
	targetLocations?: string[];
	whyItWorks?: string;
}

// ==============================================
// SUPPORTING TYPES
// ==============================================

export interface FinancialSummary {
	currentCost: string;
	offerTerms: string;
	estimatedMargin: string;
}

export interface EnvironmentalImpact {
	co2Avoided: string;
	esgHeadline: string;
	currentHarm: string;
	waterSavings?: string;
	circularityPotential?: "High" | "Medium" | "Low";
	circularityRationale?: string;
}

export interface SafetyHandling {
	hazard: "None" | "Low" | "Moderate" | "High";
	warnings: string;
	storage: string;
}

export interface EconomicsDeepDive {
	profitabilityBand?: "High" | "Medium" | "Low" | "Unknown";
	profitabilitySummary?: string;
	costBreakdown?: string[];
	scenarioSummary?: string[];
	assumptions?: string[];
	dataGaps?: string[];
}

export interface BusinessOpportunity {
	overallRecommendation?: string;
	decisionSummary?: string;
	circularEconomyOptions?: string[];
	strategicRecommendations?: string[];
	risks?: string[];
	potentialRevenue?: {
		annualPotential?: string[];
		perKg?: string[];
		marketRate?: string[];
		notes?: string[];
	};
	landfillReduction?: {
		before?: string[];
		after?: string[];
		annualSavings?: string[];
	};
	wasteHandlingCostSavings?: {
		before?: string[];
		after?: string[];
		annualSavings?: string[];
	};
	resourceConsiderations?: {
		environmentalImpact?: {
			currentSituation?: string;
			benefitIfDiverted?: string;
			esgStory?: string;
		};
		materialHandling?: {
			hazardLevel?: string;
			ppeRequirements?: string[];
			specificHazards?: string[];
			storageRequirements?: string[];
			degradationRisks?: string[];
			qualityPriceImpact?: string[];
			regulatoryNotes?: string[];
		};
		marketIntelligence?: {
			buyerTypes?: string[];
			typicalRequirements?: string[];
			pricingFactors?: string[];
		};
	};
}

export interface LifeCycleAssessment {
	co2Reduction?: {
		tons?: string[];
		percent?: string[];
		method?: string[];
	};
	environmentalNotes?: string;
}

export interface TechnicalData {
	assumptions?: string[];
	technologySelection?: {
		rejectedAlternatives?: Array<{
			technology: string;
			reasonRejected: string;
		}>;
	};
	designParameters?: {
		peakFactor?: string | number;
		safetyFactor?: string | number;
		operatingHours?: string | number;
		designLifeYears?: string | number;
		regulatoryMarginPercent?: string | number;
	};
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
	economicsDeepDive?: EconomicsDeepDive;

	// Core value: Business pathways
	pathways: BusinessPathway[];

	// Action items
	risks: string[];
	nextSteps: string[];

	// ROI (like Wastetide's "$100 → $1000")
	roiSummary: string;

	// Legacy/report enhancements (optional)
	businessOpportunity?: BusinessOpportunity;
	lca?: LifeCycleAssessment;
	technicalData?: TechnicalData;
	aiInsights?: string[];
	primaryWasteTypes?: string[];
	dailyMonthlyVolume?: string;
	existingDisposalMethod?: string;
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
	proposalExternal?: ExternalOpportunityReport;
	markdownExternal?: string;
	transparency: TransparencyMetadata;
}
