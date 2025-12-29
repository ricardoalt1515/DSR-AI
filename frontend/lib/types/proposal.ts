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

	// Legacy fields (from older proposal versions) - optional
	businessOpportunity?: LegacyBusinessOpportunity;
	lca?: LegacyLCA;
	technicalData?: LegacyTechnicalData;

	// Additional legacy fields used by some proposal views
	aiInsights?: string[];
	primaryWasteTypes?: string[];
	dailyMonthlyVolume?: string;
	existingDisposalMethod?: string;
	markdownContent?: string;
}

// ==============================================
// LEGACY TYPES (for older proposal versions)
// ==============================================

export interface LegacyBusinessOpportunity {
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
	resourceConsiderations?: LegacyResourceConsiderations;
}

export interface LegacyResourceConsiderations {
	environmentalImpact?: {
		currentSituation?: string;
		benefitIfDiverted?: string;
		esgStory?: string;
	};
	materialHandling?: {
		hazardLevel?: "None" | "Low" | "Moderate" | "High";
		specificHazards?: string[];
		ppeRequirements?: string[];
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
}

export interface LegacyLCA {
	co2Impact?: string;
	co2Reduction?: {
		tons?: string[];
		percent?: string[];
		method?: string[];
	};
	environmentalNotes?: string;
}

export interface LegacyTechnicalData {
	assumptions?: string[];
	technologySelection?: {
		rejectedAlternatives?: Array<{
			technology: string;
			reasonRejected: string;
		}>;
	};
	designParameters?: {
		peakFactor?: number;
		safetyFactor?: number;
		operatingHours?: number;
		designLifeYears?: number;
		regulatoryMarginPercent?: number;
	};
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
