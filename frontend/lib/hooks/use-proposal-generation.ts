/**
 * useProposalGeneration Hook
 * Manages AI proposal generation lifecycle with automatic polling
 *
 * Features:
 * - Automatic status polling with exponential backoff
 * - Progress tracking and state management
 * - Error handling and retry logic
 * - Cleanup on unmount
 *
 * @example
 * const { generate, status, progress, error, isGenerating } = useProposalGeneration({
 *   projectId: '123',
 *   onComplete: (proposalId) => navigate(`/proposals/${proposalId}`),
 *   onError: (error) => toast.error(error)
 * })
 *
 * return (
 *   <Button onClick={() => generate({ proposalType: 'Technical' })}>
 *     Generate {isGenerating && `(${progress}%)`}
 *   </Button>
 * )
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type {
	ProposalGenerationRequest,
	ProposalJobStatus,
} from "@/lib/api/proposals";
import { ProposalsAPI, pollProposalStatus } from "@/lib/api/proposals";
import { logger } from "@/lib/utils/logger";
import {
	clearGenerationState,
	saveGenerationState,
	updatePersistedProgress,
} from "@/lib/utils/proposal-generation-persistence";

export interface UseProposalGenerationOptions {
	/**
	 * Project ID for which to generate proposals
	 */
	projectId: string;

	/**
	 * Callback when generation completes successfully
	 */
	onComplete?: (
		proposalId: string,
		preview: ProposalJobStatus["result"],
	) => void;

	/**
	 * Callback when generation fails
	 */
	onError?: (error: string) => void;

	/**
	 * Callback for progress updates
	 */
	onProgress?: (progress: number, currentStep: string) => void;

	/**
	 * Function to reload project data after proposal generation
	 */
	onReloadProject?: () => Promise<void>;

	/**
	 * Auto-start generation on mount (default: false)
	 */
	autoGenerate?: boolean;

	/**
	 * Default proposal type if autoGenerate is true
	 */
	defaultProposalType?: "Conceptual" | "Technical" | "Detailed";
}

export interface UseProposalGenerationResult {
	/**
	 * Start proposal generation
	 */
	generate: (options: Partial<ProposalGenerationRequest>) => Promise<void>;

	/**
	 * Cancel ongoing generation
	 */
	cancel: () => void;

	/**
	 * Current job status
	 */
	status: ProposalJobStatus | null;

	/**
	 * Current progress (0-100)
	 */
	progress: number;

	/**
	 * Current step description
	 */
	currentStep: string;

	/**
	 * Whether generation is in progress
	 */
	isGenerating: boolean;

	/**
	 * Error message if generation failed
	 */
	error: string | null;

	/**
	 * Reasoning/logs from AI agent
	 */
	reasoning: string[];
}

export function useProposalGeneration(
	options: UseProposalGenerationOptions,
): UseProposalGenerationResult {
	const {
		projectId,
		onComplete,
		onError,
		onProgress,
		onReloadProject,
		autoGenerate = false,
		defaultProposalType = "Conceptual",
	} = options;

	// State
	const [status, setStatus] = useState<ProposalJobStatus | null>(null);
	const [progress, setProgress] = useState(0);
	const [currentStep, setCurrentStep] = useState("");
	const [isGenerating, setIsGenerating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [reasoning, setReasoning] = useState<string[]>([]);

	// Refs for cleanup
	const abortControllerRef = useRef<AbortController | null>(null);
	const isActiveRef = useRef(true);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			isActiveRef.current = false;
			abortControllerRef.current?.abort();
		};
	}, []);

	/**
	 * Generate proposal with automatic polling
	 */
	const generate = useCallback(
		async (generateOptions: Partial<ProposalGenerationRequest>) => {
			logger.debug(
				"Proposal generation hook called",
				{ options: generateOptions },
				"useProposalGeneration",
			);
			try {
				// Reset state
				setError(null);
				setProgress(0);
				setCurrentStep("Initializing...");
				setIsGenerating(true);
				setReasoning([]);

				// Build request (avoid passing undefined to optional fields with exactOptionalPropertyTypes)
				const request: ProposalGenerationRequest = {
					projectId,
					proposalType: generateOptions.proposalType || "Conceptual",
					...(generateOptions.parameters
						? { parameters: generateOptions.parameters }
						: {}),
					...(generateOptions.preferences
						? { preferences: generateOptions.preferences }
						: {}),
				};

				// Start generation
				logger.info(
					"Calling proposal generation API",
					{ request },
					"useProposalGeneration",
				);
				const initialStatus = await ProposalsAPI.generateProposal(request);
				logger.debug(
					"Initial proposal status received",
					{ jobId: initialStatus.jobId, status: initialStatus.status },
					"useProposalGeneration",
				);

				// Save to localStorage for recovery
				saveGenerationState({
					projectId,
					jobId: initialStatus.jobId,
					startTime: Date.now(),
					lastProgress: 0,
					proposalType: request.proposalType,
				});

				// Update state even if component unmounted (polling will continue in background)
				setStatus(initialStatus);
				setCurrentStep(initialStatus.currentStep);

				// Add initial reasoning
				setReasoning((prev) => [
					...prev,
					`🚀 Started ${request.proposalType} proposal generation`,
					`📊 Project: ${projectId}`,
				]);

				// Poll for status
				logger.info(
					"Starting status polling",
					{ jobId: initialStatus.jobId },
					"useProposalGeneration",
				);
				await pollProposalStatus(initialStatus.jobId, {
					intervalMs: 2500,
					maxDurationMs: 900000, // 15 minutes (AI generation can take 6-8 min with new prompt)

					onProgress: (jobStatus) => {
						// Continue updating state even if component unmounted
						// This allows polling to complete in background
						setStatus(jobStatus);
						setProgress(jobStatus.progress);
						setCurrentStep(jobStatus.currentStep);

						// Update persisted progress
						updatePersistedProgress(jobStatus.progress);

						// Add reasoning based on progress
						if (jobStatus.progress >= 20 && jobStatus.progress < 40) {
							setReasoning((prev) => [
								...prev,
								"🔍 Analyzing technical data...",
								"♻️ Evaluating waste composition",
							]);
						} else if (jobStatus.progress >= 40 && jobStatus.progress < 60) {
							setReasoning((prev) => [
								...prev,
								"🎯 Identifying upcycling opportunities",
								"📊 Calculating volume projections",
							]);
						} else if (jobStatus.progress >= 60 && jobStatus.progress < 80) {
							setReasoning((prev) => [
								...prev,
								"💰 Estimating revenue potential",
								"🌱 Evaluating environmental impact",
							]);
						} else if (jobStatus.progress >= 80) {
							setReasoning((prev) => [
								...prev,
								"📝 Generating technical documentation",
								"✅ Finalizing report",
							]);
						}

						// Notify parent
						onProgress?.(jobStatus.progress, jobStatus.currentStep);
					},

					onComplete: async (result) => {
						// Complete even if component unmounted
						setIsGenerating(false);
						setProgress(100);
						setCurrentStep("Completed!");
						setReasoning((prev) => [
							...prev,
							"✅ Proposal generated successfully!",
						]);

						// Clear persisted state on success
						clearGenerationState();

						// Reload project data to show new proposal
						if (onReloadProject) {
							try {
								await onReloadProject();
							} catch (error) {
								logger.error(
									"Failed to reload project after proposal generation",
									error,
								);
							}
						}

						// Notify parent
						if (result) {
							onComplete?.(result.proposalId, result);
						}
					},

					onError: (errorMsg) => {
						// Handle error even if component unmounted
						setIsGenerating(false);
						setError(errorMsg);
						setReasoning((prev) => [
							...prev,
							`❌ Generation failed: ${errorMsg}`,
						]);

						// Clear persisted state on error
						clearGenerationState();

						// Notify parent
						onError?.(errorMsg);
					},
				});
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Unknown error occurred";
				logger.error(
					"Error in proposal generation",
					err,
					"useProposalGeneration",
				);
				setError(errorMessage);
				setIsGenerating(false);

				// Clear persisted state on exception
				clearGenerationState();

				onError?.(errorMessage);
			}
		},
		[projectId, onComplete, onError, onProgress, onReloadProject],
	);

	/**
	 * Cancel ongoing generation
	 */
	const cancel = useCallback(() => {
		abortControllerRef.current?.abort();
		setIsGenerating(false);
		setCurrentStep("Cancelled by user");
		setReasoning((prev) => [...prev, "🛑 Generation cancelled"]);

		// Clear persisted state on cancel
		clearGenerationState();
	}, []);

	// Auto-generate on mount if enabled
	useEffect(() => {
		if (autoGenerate && !isGenerating && !status) {
			generate({ proposalType: defaultProposalType });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [autoGenerate, defaultProposalType, generate, isGenerating, status]); // Only run once on mount

	return {
		generate,
		cancel,
		status,
		progress,
		currentStep,
		isGenerating,
		error,
		reasoning,
	};
}
