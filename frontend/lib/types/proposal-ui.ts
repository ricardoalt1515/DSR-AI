import type { AIMetadata } from "@/lib/types/proposal";

export const PROPOSAL_TYPES = ["Conceptual", "Technical", "Detailed"] as const;
export type ProposalType = (typeof PROPOSAL_TYPES)[number];

export const PROPOSAL_STATUSES = ["Draft", "Current", "Archived"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export interface ProposalUI {
	id: string;
	title: string;
	version: string;
	status: ProposalStatus;
	proposalType: ProposalType;
	author: string;
	createdAt: string;
	capex: number;
	opex: number;
	executiveSummary: string;
	technicalApproach: string;
	aiMetadata: AIMetadata;
	pdfPath?: string;
}
