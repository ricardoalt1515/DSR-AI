/**
 * Proposals API Service
 * Handles AI-powered proposal generation with polling support
 *
 * Best practices:
 * - Type-safe API calls
 * - Automatic retry logic for resilience
 * - Proper error handling and logging
 */
import type { AIMetadata } from "@/lib/types/proposal";
import type { ProposalDTO } from "@/lib/types/proposal-dto";
import { API_TIMEOUT } from "@/lib/constants/timings";
import { logger } from "@/lib/utils/logger";
import { apiClient } from "./client";

// Re-export types for convenience
export type { AIMetadata };

// ============================================================================
// Types & Schemas
// ============================================================================

export interface ProposalGenerationRequest {
	projectId: string;
	proposalType: "Conceptual" | "Technical" | "Detailed";
	parameters?: Record<string, unknown>;
	preferences?: {
		focusAreas?: string[];
		constraints?: Record<string, unknown>;
	};
}

export interface ProposalJobStatus {
	jobId: string;
	status: "queued" | "processing" | "completed" | "failed";
	progress: number; // 0-100
	currentStep: string;
	result?: {
		proposalId: string;
		preview: {
			executiveSummary: string;
			capex: number;
			opex: number;
			keyTechnologies: string[];
		};
	};
	error?: string;
}

export type ProposalResponse = ProposalDTO;

// ============================================================================
// API Methods
// ============================================================================

export class ProposalsAPI {
	/**
	 * Start AI proposal generation (async operation)
	 * Returns immediately with a job ID for polling
	 *
	 * @example
	 * const status = await ProposalsAPI.generateProposal({
	 *   projectId: '123',
	 *   proposalType: 'Technical'
	 * })
	 * // Poll with: await ProposalsAPI.getJobStatus(status.jobId)
	 */
	static async generateProposal(
		request: ProposalGenerationRequest,
	): Promise<ProposalJobStatus> {
		return apiClient.post<ProposalJobStatus>("/ai/proposals/generate", {
			project_id: request.projectId,
			proposal_type: request.proposalType,
			parameters: request.parameters,
			preferences: request.preferences,
		});
	}

	/**
	 * Get proposal generation job status (for polling)
	 *
	 * Polling strategy:
	 * - Poll every 2-3 seconds while status is 'queued' or 'processing'
	 * - Stop when status is 'completed' or 'failed'
	 * - Max polling duration: 10 minutes (AI generation can take 5-7 minutes)
	 *
	 * @example
	 * const status = await ProposalsAPI.getJobStatus(jobId)
	 * if (status.status === 'completed') {
	 *   const proposalId = status.result.proposalId
	 *   // Navigate to proposal
	 * }
	 */
	static async getJobStatus(jobId: string): Promise<ProposalJobStatus> {
		return apiClient.get<ProposalJobStatus>(`/ai/proposals/jobs/${jobId}`);
	}

	/**
	 * List all proposals for a project
	 */
	static async listProposals(projectId: string): Promise<ProposalResponse[]> {
		return apiClient.get<ProposalResponse[]>(
			`/ai/proposals/${projectId}/proposals`,
		);
	}

	/**
	 * Get detailed proposal information
	 */
	static async getProposal(
		projectId: string,
		proposalId: string,
	): Promise<ProposalResponse> {
		return apiClient.get<ProposalResponse>(
			`/ai/proposals/${projectId}/proposals/${proposalId}`,
		);
	}

	/**
	 * Get proposal PDF download URL
	 *
	 * The backend generates a professional PDF on-demand using WeasyPrint.
	 * First request may take 1-3 seconds. Subsequent requests are cached.
	 * Returns a presigned URL that can be opened directly with window.open().
	 *
	 * @param regenerate - Force regeneration even if cached PDF exists
	 * @param audience - "internal" or "external" report type (default: internal)
	 * @returns Presigned URL for the PDF file
	 *
	 * @example
	 * const url = await ProposalsAPI.getProposalPDFUrl(projectId, proposalId)
	 * window.open(url, '_blank')
	 */
	static async getProposalPDFUrl(
		projectId: string,
		proposalId: string,
		regenerate = false,
		audience: "internal" | "external" = "internal",
	): Promise<string> {
		const endpointBase = `/ai/proposals/${projectId}/proposals/${proposalId}/pdf`;
		const params = new URLSearchParams();
		if (regenerate) {
			params.set("regenerate", "true");
		}
		params.set("audience", audience);
		const endpoint = `${endpointBase}?${params.toString()}`;

		logger.debug("PDF URL Request", {
			endpoint,
			audience,
		});

		const response = await apiClient.request<{ url: string }>(endpoint, {
			method: "GET",
			timeout: API_TIMEOUT.EXTENDED,
		});
		return response.url;
	}

	/**
	 * Delete a proposal permanently
	 *
	 * @param projectId - Project UUID
	 * @param proposalId - Proposal UUID
	 * @returns Promise that resolves when deletion is complete
	 * @throws Error if deletion fails
	 *
	 * @example
	 * await ProposalsAPI.deleteProposal(projectId, proposalId)
	 */
	static async deleteProposal(
		projectId: string,
		proposalId: string,
	): Promise<void> {
		await apiClient.delete(
			`/ai/proposals/${projectId}/proposals/${proposalId}`,
		);
	}

	/**
	 * Get AI metadata (transparency data)
	 *
	 * Exposes the AI's reasoning process including:
	 * - Proven cases consulted from the database
	 * - Assumptions made during design
	 * - Alternative technologies considered but rejected
	 * - Technology justifications for each stage
	 * - Confidence level of the AI's recommendations
	 *
	 * This enables engineers to validate and trust the AI's decisions.
	 *
	 * @example
	 * const metadata = await ProposalsAPI.getAIMetadata(projectId, proposalId)
	 * console.log(`AI consulted ${metadata.proven_cases.length} similar cases`)
	 * console.log(`Confidence: ${metadata.confidence_level}`)
	 */
	static async getAIMetadata(
		projectId: string,
		proposalId: string,
	): Promise<AIMetadata> {
		return apiClient.get<AIMetadata>(
			`/ai/proposals/${projectId}/proposals/${proposalId}/ai-metadata`,
		);
	}
}

// ============================================================================
// Polling Utilities
// ============================================================================

export interface PollingOptions {
	/**
	 * Interval between polls in milliseconds
	 * @default 2500 (2.5 seconds)
	 */
	intervalMs?: number;

	/**
	 * Maximum polling duration in milliseconds
	 * @default 600000 (10 minutes)
	 */
	maxDurationMs?: number;

	/**
	 * AbortSignal to cancel polling
	 * Allows external cancellation of long-running operations
	 */
	signal?: AbortSignal;

	/**
	 * Callback for each status update
	 */
	onProgress?: (status: ProposalJobStatus) => void;

	/**
	 * Callback when polling completes
	 */
	onComplete?: (result: ProposalJobStatus["result"]) => void;

	/**
	 * Callback when polling fails
	 */
	onError?: (error: string) => void;
}

/**
 * Poll for proposal generation status until completion or failure
 *
 * Implements exponential backoff for resilience:
 * - Starts at intervalMs (default 2.5s)
 * - Increases by 1.2x on each poll
 * - Maxes out at 10s
 *
 * @example
 * await pollProposalStatus(jobId, {
 *   onProgress: (status) => setProgress(status.progress),
 *   onComplete: (result) => navigate(`/proposals/${result.proposalId}`),
 *   onError: (error) => showError(error)
 * })
 */
export async function pollProposalStatus(
	jobId: string,
	options: PollingOptions = {},
): Promise<ProposalJobStatus> {
	const {
		intervalMs = 2500,
		maxDurationMs = 900000, // 15 minutes (AI generation can take 6-8 min with new prompt)
		signal,
		onProgress,
		onComplete,
		onError,
	} = options;

	logger.info("Starting proposal generation polling", { jobId });

	const startTime = Date.now();
	let currentInterval = intervalMs;

	while (true) {
		try {
			// ✅ Check if cancelled via AbortSignal
			if (signal?.aborted) {
				logger.info("Polling cancelled by user", { jobId });
				throw new Error("Polling cancelled by user");
			}

			// Check if we've exceeded max duration
			if (Date.now() - startTime > maxDurationMs) {
				const elapsedMinutes = Math.round((Date.now() - startTime) / 60000);
				const timeoutError = `Proposal generation timed out after ${elapsedMinutes} minutes`;
				logger.error("Polling timeout", { jobId, elapsedMinutes });
				onError?.(timeoutError);
				throw new Error(timeoutError);
			}

			// Poll for status
			logger.debug("Polling proposal status", { jobId });
			const status = await ProposalsAPI.getJobStatus(jobId);
			logger.debug("Proposal status received", {
				jobId,
				status: status.status,
				progress: status.progress,
			});

			// Notify progress
			onProgress?.(status);

			// Check terminal states
			if (status.status === "completed") {
				onComplete?.(status.result);
				return status;
			}

			if (status.status === "failed") {
				const errorMsg = status.error || "Proposal generation failed";
				onError?.(errorMsg);
				throw new Error(errorMsg);
			}

			// Wait before next poll (with exponential backoff)
			await new Promise((resolve) => setTimeout(resolve, currentInterval));

			// Increase interval (max 10s)
			currentInterval = Math.min(currentInterval * 1.2, 10000);
		} catch (error) {
			// Network error or other exception
			const errorMsg = error instanceof Error ? error.message : "Unknown error";
			onError?.(errorMsg);
			throw error;
		}
	}
}

export const proposalsAPI = ProposalsAPI;
