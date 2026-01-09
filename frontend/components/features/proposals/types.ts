/**
 * Shared TypeScript types for Waste Upcycling Report components
 * @module ProposalTypes
 */

import type { AIMetadata } from "@/lib/types/proposal";
import type { ProposalUI } from "@/lib/types/proposal-ui";

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
export type { AIMetadata };

export interface Project {
	id: string;
	name: string;
	sector: string;
}

/**
 * Waste Upcycling Report Proposal
 */
export type Proposal = ProposalUI;

export interface ProposalDetailProps {
	proposal: Proposal;
	project: Project;
}
