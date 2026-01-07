/**
 * Shared TypeScript types for Waste Upcycling Report components
 * @module ProposalTypes
 */

import type { WasteUpcyclingReport } from "@/lib/types/proposal";
import type { ExternalOpportunityReport } from "@/lib/types/external-opportunity-report";

// Project requirements for waste assessment
export interface ProjectRequirements {
	wasteTypes: string[];
	volume: string;
	currentDisposal: string;
	businessObjectives: string[];
	siteConstraints: string[];
}

/**
 * AI Metadata structure for waste upcycling reports
 */
export interface AIMetadata {
	proposal: WasteUpcyclingReport;
	proposalExternal?: ExternalOpportunityReport;
	markdownExternal?: string;
	transparency: {
		clientMetadata?: Record<string, unknown>;
		generatedAt: string;
		generationTimeSeconds: number;
		reportType: string;
	};
}

export interface Project {
	id: string;
	name: string;
	sector: string;
}

/**
 * Waste Upcycling Report Proposal
 */
export interface Proposal {
	id: string;
	title: string;
	version: string;
	status: "Draft" | "Current" | "Archived";
	proposalType: "Conceptual" | "Technical" | "Detailed";
	author: string;
	createdAt: string;

	// For waste reports, these are 0 (costs in tables)
	capex: number;
	opex: number;

	executiveSummary: string;
	technicalApproach: string;

	// Single source of truth - all waste data here
	aiMetadata: AIMetadata;

	pdfPath?: string;
}

export interface ProposalDetailProps {
	proposal: Proposal;
	project: Project;
}
