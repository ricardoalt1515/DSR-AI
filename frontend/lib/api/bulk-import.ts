/**
 * Bulk Import API client
 * Handles file upload, run polling, item review, and finalization.
 */

import { apiClient } from "./client";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type RunStatus =
	| "uploaded"
	| "processing"
	| "review_ready"
	| "finalizing"
	| "completed"
	| "failed"
	| "no_data";

export type ItemStatus =
	| "pending_review"
	| "accepted"
	| "amended"
	| "rejected"
	| "invalid";

export type ItemType = "location" | "project";
export type EntrypointType = "company" | "location";
export type ItemAction = "accept" | "amend" | "reject" | "reset";

export interface BulkImportUploadResponse {
	runId: string;
	status: RunStatus;
}

export interface BulkImportRun {
	id: string;
	entrypointType: EntrypointType;
	entrypointId: string;
	sourceFilename: string;
	status: RunStatus;
	progressStep: string | null;
	processingError: string | null;
	totalItems: number;
	acceptedCount: number;
	rejectedCount: number;
	amendedCount: number;
	invalidCount: number;
	duplicateCount: number;
	createdByUserId: string | null;
	finalizedByUserId: string | null;
	finalizedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface DuplicateCandidate {
	id: string;
	name: string;
	reason: string;
	[key: string]: unknown;
}

export interface BulkImportItem {
	id: string;
	runId: string;
	itemType: ItemType;
	status: ItemStatus;
	needsReview: boolean;
	confidence: number | null;
	extractedData: Record<string, unknown>;
	normalizedData: Record<string, unknown>;
	userAmendments: Record<string, unknown> | null;
	reviewNotes: string | null;
	duplicateCandidates: DuplicateCandidate[] | null;
	confirmCreateNew: boolean;
	parentItemId: string | null;
	createdLocationId: string | null;
	createdProjectId: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface PaginatedItems {
	items: BulkImportItem[];
	total: number;
	page: number;
	size: number;
	pages: number;
}

export interface BulkImportFinalizeSummary {
	runId: string;
	locationsCreated: number;
	projectsCreated: number;
	rejected: number;
	invalid: number;
	duplicatesResolved: number;
}

export interface BulkImportFinalizeResponse {
	status: RunStatus;
	summary: BulkImportFinalizeSummary;
}

export interface BulkImportSummaryResponse {
	summary: BulkImportFinalizeSummary;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// API CLIENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const BASE = "/bulk-import";
export const BULK_IMPORT_PAGE_SIZE = 100;

export const bulkImportAPI = {
	/**
	 * Upload a file and create an import run.
	 */
	async upload(
		file: File,
		entrypointType: EntrypointType,
		entrypointId: string,
	): Promise<BulkImportUploadResponse> {
		return apiClient.uploadFile<BulkImportUploadResponse>(
			`${BASE}/upload`,
			file,
			{
				entrypoint_type: entrypointType,
				entrypoint_id: entrypointId,
			},
		);
	},

	/**
	 * Get run status (used for polling during processing).
	 */
	async getRun(runId: string): Promise<BulkImportRun> {
		return apiClient.get<BulkImportRun>(`${BASE}/runs/${runId}`);
	},

	/**
	 * List items for review (paginated, filterable by status).
	 */
	async listItems(
		runId: string,
		page = 1,
		size = BULK_IMPORT_PAGE_SIZE,
		status?: ItemStatus,
	): Promise<PaginatedItems> {
		const normalizedSize = Number.isFinite(size)
			? Math.trunc(size)
			: BULK_IMPORT_PAGE_SIZE;
		const safeSize = Math.max(
			1,
			Math.min(normalizedSize, BULK_IMPORT_PAGE_SIZE),
		);
		const params = new URLSearchParams({
			page: String(page),
			size: String(safeSize),
		});
		if (status) params.set("status", status);
		return apiClient.get<PaginatedItems>(
			`${BASE}/runs/${runId}/items?${params}`,
		);
	},

	/**
	 * Update an item's decision (accept, amend, reject, reset).
	 */
	async patchItem(
		itemId: string,
		action: ItemAction,
		options?: {
			normalizedData?: Record<string, unknown>;
			reviewNotes?: string;
			confirmCreateNew?: boolean;
		},
	): Promise<BulkImportItem> {
		return apiClient.patch<BulkImportItem>(`${BASE}/items/${itemId}`, {
			action,
			normalized_data: options?.normalizedData,
			review_notes: options?.reviewNotes,
			confirm_create_new: options?.confirmCreateNew,
		});
	},

	/**
	 * Finalize the import run — creates real entities.
	 */
	async finalize(runId: string): Promise<BulkImportFinalizeResponse> {
		return apiClient.post<BulkImportFinalizeResponse>(
			`${BASE}/runs/${runId}/finalize`,
		);
	},

	/**
	 * Get post-finalize summary.
	 */
	async getSummary(runId: string): Promise<BulkImportSummaryResponse> {
		return apiClient.get<BulkImportSummaryResponse>(
			`${BASE}/runs/${runId}/summary`,
		);
	},
};
