import type { AISuggestion, UnmappedNote } from "@/lib/types/intake";
import { API_TIMEOUT } from "@/lib/constants/timings";
import { apiClient } from "./client";

export interface IntakeHydrateResponse {
	intakeNotes: string | null;
	notesUpdatedAt: string | null;
	suggestions: AISuggestion[];
	unmappedNotes: UnmappedNote[];
	unmappedNotesCount: number;
	processingDocumentsCount: number;
}

export interface IntakeNotesUpdateResponse {
	text: string;
	updatedAt: string;
}

export type IntakeSuggestionStatus = "applied" | "rejected";

export interface IntakeSuggestionStatusResponse {
	id: string;
	status: IntakeSuggestionStatus;
	updatedAt: string;
}

export type IntakeMapUnmappedRequest = Record<string, unknown> & {
	fieldId: string;
	sectionId: string;
	fieldLabel: string;
	sectionTitle: string;
};

export interface IntakeMapUnmappedResponse {
	unmappedNoteId: string;
	suggestion: AISuggestion;
	mappedToSuggestionId: string;
}

export interface IntakeDismissUnmappedResponse {
	id: string;
	status: "dismissed";
}

export type IntakeDismissUnmappedScope = "all" | "low_confidence" | "file";

export type IntakeDismissUnmappedBulkRequest = {
	scope: IntakeDismissUnmappedScope;
	max_confidence?: number;
	source_file_id?: string | null;
} & Record<string, unknown>;

export interface IntakeDismissUnmappedBulkResponse {
	dismissedCount: number;
}

export interface AnalyzeNotesResponse {
	suggestionsCount: number;
	unmappedCount: number;
	staleIgnored: boolean;
}

// Batch suggestion operations
export type IntakeSuggestionBatchStatus = "applied" | "rejected";

export interface IntakeSuggestionBatchRequest {
	suggestionIds: string[];
	status: IntakeSuggestionBatchStatus;
}

export interface IntakeSuggestionBatchResultItem {
	id: string;
	success: boolean;
	status: IntakeSuggestionBatchStatus | null;
	error: string | null;
}

export interface IntakeSuggestionBatchResponse {
	results: IntakeSuggestionBatchResultItem[];
	appliedCount: number;
	rejectedCount: number;
	errorCount: number;
}

export const intakeAPI = {
	async hydrate(projectId: string): Promise<IntakeHydrateResponse> {
		return apiClient.get<IntakeHydrateResponse>(
			`/projects/${projectId}/intake`,
		);
	},

	async saveNotes(
		projectId: string,
		text: string,
	): Promise<IntakeNotesUpdateResponse> {
		return apiClient.patch<IntakeNotesUpdateResponse>(
			`/projects/${projectId}/intake/notes`,
			{ text },
		);
	},

	async updateSuggestionStatus(
		projectId: string,
		suggestionId: string,
		status: IntakeSuggestionStatus,
	): Promise<IntakeSuggestionStatusResponse> {
		return apiClient.patch<IntakeSuggestionStatusResponse>(
			`/projects/${projectId}/intake/suggestions/${suggestionId}`,
			{ status },
		);
	},

	async mapUnmappedNote(
		projectId: string,
		noteId: string,
		payload: IntakeMapUnmappedRequest,
	): Promise<IntakeMapUnmappedResponse> {
		return apiClient.post<IntakeMapUnmappedResponse>(
			`/projects/${projectId}/intake/unmapped-notes/${noteId}/map`,
			payload,
		);
	},

	async dismissUnmappedNote(
		projectId: string,
		noteId: string,
	): Promise<IntakeDismissUnmappedResponse> {
		return apiClient.post<IntakeDismissUnmappedResponse>(
			`/projects/${projectId}/intake/unmapped-notes/${noteId}/dismiss`,
		);
	},

	async dismissUnmappedNotesBulk(
		projectId: string,
		payload: IntakeDismissUnmappedBulkRequest,
	): Promise<IntakeDismissUnmappedBulkResponse> {
		return apiClient.post<IntakeDismissUnmappedBulkResponse>(
			`/projects/${projectId}/intake/unmapped-notes/dismiss`,
			payload,
		);
	},

	async batchUpdateSuggestions(
		projectId: string,
		suggestionIds: string[],
		status: IntakeSuggestionBatchStatus,
	): Promise<IntakeSuggestionBatchResponse> {
		return apiClient.post<IntakeSuggestionBatchResponse>(
			`/projects/${projectId}/intake/suggestions/batch`,
			{
				suggestion_ids: suggestionIds,
				status,
			},
		);
	},

	async analyzeNotes(
		projectId: string,
		notesUpdatedAt: string,
		signal?: AbortSignal,
	): Promise<AnalyzeNotesResponse> {
		if (typeof notesUpdatedAt !== "string" || notesUpdatedAt.length === 0) {
			throw new Error("notesUpdatedAt must be an ISO string");
		}
		return apiClient.request<AnalyzeNotesResponse>(
			`/projects/${projectId}/intake/notes/analyze`,
			{
				method: "POST",
				body: { notesUpdatedAt },
				timeout: 120000,
				signal,
			},
		);
	},
};
