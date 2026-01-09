import type { ProposalDTO } from "@/lib/types/proposal-dto";
import {
	PROPOSAL_STATUSES,
	PROPOSAL_TYPES,
	type ProposalStatus,
	type ProposalType,
	type ProposalUI,
} from "@/lib/types/proposal-ui";

const isProposalType = (value: string): value is ProposalType =>
	PROPOSAL_TYPES.includes(value as ProposalType);

const isProposalStatus = (value: string): value is ProposalStatus =>
	PROPOSAL_STATUSES.includes(value as ProposalStatus);

export function mapProposalDtoToUi(dto: ProposalDTO): ProposalUI {
	if (!isProposalType(dto.proposalType)) {
		throw new Error(`Unexpected proposal type: ${dto.proposalType}`);
	}

	if (!isProposalStatus(dto.status)) {
		throw new Error(`Unexpected proposal status: ${dto.status}`);
	}

	if (!dto.aiMetadata) {
		throw new Error("Proposal is missing aiMetadata");
	}

	return {
		id: dto.id,
		title: dto.title,
		version: dto.version,
		status: dto.status,
		proposalType: dto.proposalType,
		author: dto.author,
		createdAt: dto.createdAt,
		capex: dto.capex,
		opex: dto.opex,
		executiveSummary: dto.executiveSummary ?? "",
		technicalApproach: dto.technicalApproach ?? "",
		aiMetadata: dto.aiMetadata,
		pdfPath: dto.pdfPath,
	};
}
