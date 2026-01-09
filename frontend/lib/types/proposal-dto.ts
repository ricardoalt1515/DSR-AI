import type { AIMetadata } from "@/lib/types/proposal";

export interface ProposalDTO {
	id: string;
	version: string;
	title: string;
	proposalType: string;
	status: string;
	createdAt: string;
	author: string;
	capex: number;
	opex: number;
	executiveSummary?: string;
	technicalApproach?: string;
	implementationPlan?: string;
	risks?: string[];
	pdfPath?: string;
	aiMetadata?: AIMetadata;
}
