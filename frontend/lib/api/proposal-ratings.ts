import type {
	AdminProposalRatingsDetailResponse,
	AdminProposalRatingsListParams,
	AdminProposalRatingsListResponse,
	ProposalRatingEnvelope,
	ProposalRatingStats,
	ProposalRatingUpsertPayload,
} from "@/lib/types/proposal-rating";
import { apiClient } from "./client";

function buildAdminRatingsQuery(
	params: AdminProposalRatingsListParams,
): string {
	const query = new URLSearchParams();

	if (params.minOverall !== undefined) {
		query.set("minOverall", String(params.minOverall));
	}
	if (params.hasComments) {
		query.set("hasComments", params.hasComments);
	}
	if (params.ratedFrom) {
		query.set("ratedFrom", params.ratedFrom);
	}
	if (params.ratedTo) {
		query.set("ratedTo", params.ratedTo);
	}
	if (params.sort) {
		query.set("sort", params.sort);
	}
	if (params.limit !== undefined) {
		query.set("limit", String(params.limit));
	}
	if (params.offset !== undefined) {
		query.set("offset", String(params.offset));
	}

	const queryString = query.toString();
	return queryString ? `?${queryString}` : "";
}

export const proposalRatingsAPI = {
	async upsert(
		projectId: string,
		proposalId: string,
		payload: ProposalRatingUpsertPayload,
	): Promise<ProposalRatingEnvelope> {
		return apiClient.put<ProposalRatingEnvelope>(
			`/ai/proposals/${projectId}/proposals/${proposalId}/rating`,
			{ ...payload },
		);
	},

	async get(
		projectId: string,
		proposalId: string,
	): Promise<ProposalRatingEnvelope> {
		return apiClient.get<ProposalRatingEnvelope>(
			`/ai/proposals/${projectId}/proposals/${proposalId}/rating`,
		);
	},

	async getStats(
		projectId: string,
		proposalId: string,
	): Promise<ProposalRatingStats> {
		return apiClient.get<ProposalRatingStats>(
			`/ai/proposals/${projectId}/proposals/${proposalId}/rating/stats`,
		);
	},

	async listAdmin(
		params: AdminProposalRatingsListParams,
	): Promise<AdminProposalRatingsListResponse> {
		const query = buildAdminRatingsQuery(params);
		return apiClient.get<AdminProposalRatingsListResponse>(
			`/admin/proposal-ratings${query}`,
		);
	},

	async getAdminDetail(
		proposalId: string,
	): Promise<AdminProposalRatingsDetailResponse> {
		return apiClient.get<AdminProposalRatingsDetailResponse>(
			`/admin/proposal-ratings/${proposalId}`,
		);
	},
};
