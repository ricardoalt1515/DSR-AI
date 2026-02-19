export interface ProposalRating {
	coverageNeedsScore: number;
	qualityInfoScore: number;
	businessDataScore: number;
	comment: string | null;
	updatedAt: string;
}

export interface ProposalRatingEnvelope {
	rating: ProposalRating | null;
}

export interface ProposalRatingCriteriaAvg {
	coverageNeedsAvg: number;
	qualityInfoAvg: number;
	businessDataAvg: number;
}

export interface ProposalRatingStats {
	visible: boolean;
	ratingCount: number;
	minimumRequiredCount: number;
	overallAvg: number | null;
	criteriaAvg: ProposalRatingCriteriaAvg | null;
}

export interface ProposalRatingUpsertPayload {
	coverageNeedsScore: number;
	qualityInfoScore: number;
	businessDataScore: number;
	comment?: string | null;
}

export type AdminProposalRatingsSort =
	| "highest"
	| "lowest"
	| "mostRated"
	| "recentlyRated";

export type AdminProposalRatingsHasComments = "true" | "false" | "any";

export interface AdminProposalRatingsListParams {
	minOverall?: number;
	hasComments?: AdminProposalRatingsHasComments;
	ratedFrom?: string;
	ratedTo?: string;
	sort?: AdminProposalRatingsSort;
	limit?: number;
	offset?: number;
}

export interface AdminProposalRatingsListItem {
	proposalId: string;
	projectId: string;
	ratingCount: number;
	overallAvg: number;
	criteriaAvg: ProposalRatingCriteriaAvg;
	latestRatingAt: string;
	commentCount: number;
}

export interface AdminProposalRatingsListResponse {
	items: AdminProposalRatingsListItem[];
	limit: number;
	offset: number;
	total: number;
}

export interface ProposalRatingDistribution {
	"1": number;
	"2": number;
	"3": number;
	"4": number;
	"5": number;
}

export interface AdminProposalRatingsDetailResponse {
	proposalId: string;
	projectId: string;
	ratingCount: number;
	overallAvg: number;
	criteriaAvg: ProposalRatingCriteriaAvg;
	distributions: {
		coverageNeedsScore: ProposalRatingDistribution;
		qualityInfoScore: ProposalRatingDistribution;
		businessDataScore: ProposalRatingDistribution;
	};
	comments: Array<{
		comment: string;
		updatedAt: string;
	}>;
}
