import { apiClient } from "./client";

export type FeedbackType =
	| "bug"
	| "incorrect_response"
	| "feature_request"
	| "general";

/** Shared feedback type configuration for consistent UI across components */
export const FEEDBACK_TYPE_CONFIG = {
	bug: { label: "Bug", variant: "destructive" as const },
	incorrect_response: {
		label: "Incorrect Response",
		variant: "secondary" as const,
	},
	feature_request: { label: "Feature Request", variant: "default" as const },
	general: { label: "General", variant: "outline" as const },
} as const satisfies Record<
	FeedbackType,
	{
		label: string;
		variant: "default" | "destructive" | "secondary" | "outline";
	}
>;

export interface FeedbackPayload {
	content: string;
	feedbackType?: FeedbackType;
	pagePath?: string;
}

export interface FeedbackItem {
	id: string;
	content: string;
	feedbackType: FeedbackType | null;
	pagePath: string | null;
	userId: string;
	resolvedAt: string | null;
	resolvedByUserId: string | null;
	createdAt: string;
}

export interface ListFeedbackParams {
	days?: 7 | 30;
	resolved?: boolean;
	feedbackType?: FeedbackType;
	limit?: number;
}

export const feedbackAPI = {
	async submit(payload: FeedbackPayload): Promise<FeedbackItem> {
		return apiClient.post<FeedbackItem>(
			"/feedback",
			payload as unknown as Record<string, unknown>,
		);
	},

	async list(params?: ListFeedbackParams): Promise<FeedbackItem[]> {
		const query = new URLSearchParams();
		if (params?.days) query.set("days", String(params.days));
		if (params?.resolved !== undefined)
			query.set("resolved", String(params.resolved));
		if (params?.feedbackType) query.set("feedback_type", params.feedbackType);
		if (params?.limit) query.set("limit", String(params.limit));

		const queryString = query.toString();
		const endpoint = queryString
			? `/admin/feedback?${queryString}`
			: "/admin/feedback";
		return apiClient.get<FeedbackItem[]>(endpoint);
	},

	async resolve(id: string): Promise<FeedbackItem> {
		return apiClient.patch<FeedbackItem>(`/admin/feedback/${id}`, {
			resolved: true,
		} as unknown as Record<string, unknown>);
	},

	async reopen(id: string): Promise<FeedbackItem> {
		return apiClient.patch<FeedbackItem>(`/admin/feedback/${id}`, {
			resolved: false,
		} as unknown as Record<string, unknown>);
	},
};
