"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { ProposalGenerationRequest } from "@/lib/api/proposals";
import { pollProposalStatus, proposalsAPI } from "@/lib/api/proposals";
import { useProposalGenerationStore } from "@/lib/stores/proposal-generation-store";
import { logger } from "@/lib/utils/logger";
import {
	clearGenerationState,
	loadGenerationState,
	saveGenerationState,
	updatePersistedProgress,
} from "@/lib/utils/proposal-generation-persistence";
import {
	showProposalErrorToast,
	showProposalProgressToast,
	showProposalSuccessToast,
} from "@/lib/utils/proposal-progress-toast";

const MIN_PROGRESS_FOR_ESTIMATE = 10;
const MS_IN_MINUTE = 60000;
const PROPOSAL_TYPES = ["Conceptual", "Technical", "Detailed"] as const;

type ProposalType = (typeof PROPOSAL_TYPES)[number];

const isAbortError = (error: unknown): error is Error =>
	error instanceof Error && error.name === "AbortError";

const isProposalType = (value: string): value is ProposalType =>
	PROPOSAL_TYPES.includes(value as ProposalType);

const normalizeProposalType = (
	value: string | null | undefined,
): ProposalGenerationRequest["proposalType"] =>
	value && isProposalType(value) ? value : "Conceptual";

const estimateRemainingTime = (
	progress: number,
	startedAt: number | null,
): string | null => {
	if (!startedAt || progress < MIN_PROGRESS_FOR_ESTIMATE) return null;

	const elapsedMs = Date.now() - startedAt;
	if (elapsedMs <= 0) return null;

	const progressRate = progress / elapsedMs;
	if (progressRate <= 0) return null;

	const remainingProgress = 100 - progress;
	const estimatedRemainingMs = remainingProgress / progressRate;
	const estimatedMinutes = Math.ceil(estimatedRemainingMs / MS_IN_MINUTE);

	return estimatedMinutes > 0 ? `~${estimatedMinutes} min` : null;
};

export function ProposalGenerationManager() {
	const router = useRouter();
	const pathname = usePathname();
	const pathnameRef = useRef(pathname);
	const abortControllerRef = useRef<AbortController | null>(null);
	const activeJobIdRef = useRef<string | null>(null);
	const lastRequestRef = useRef<{
		projectId: string;
		proposalType: ProposalGenerationRequest["proposalType"];
	} | null>(null);

	const {
		isGenerating,
		progress,
		currentStep,
		projectId,
		jobId,
		startedAt,
		startGeneration,
		updateProgress,
		endGeneration,
		cancelGeneration,
		setCancelHandler,
	} = useProposalGenerationStore();

	useEffect(() => {
		pathnameRef.current = pathname;
	}, [pathname]);

	const abortPolling = useCallback(() => {
		abortControllerRef.current?.abort();
		abortControllerRef.current = null;
		activeJobIdRef.current = null;
	}, []);

	const resetGenerationState = useCallback(() => {
		abortPolling();
		endGeneration();
		clearGenerationState();
		setCancelHandler(null);
	}, [abortPolling, endGeneration, setCancelHandler]);

	const startNewGeneration = useCallback(
		async (request: ProposalGenerationRequest) => {
			const initialStatus = await proposalsAPI.generateProposal(request);
			const newStartedAt = Date.now();

			startGeneration(request.projectId, initialStatus.jobId, newStartedAt);
			saveGenerationState({
				projectId: request.projectId,
				jobId: initialStatus.jobId,
				startTime: newStartedAt,
				lastProgress: 0,
				proposalType: request.proposalType,
			});
			lastRequestRef.current = {
				projectId: request.projectId,
				proposalType: request.proposalType,
			};

			return initialStatus;
		},
		[startGeneration],
	);

	useEffect(() => {
		const persisted = loadGenerationState();
		if (!persisted) return;

		startGeneration(persisted.projectId, persisted.jobId, persisted.startTime);
		updateProgress(persisted.lastProgress, "Resuming generation...", null);
		const proposalType = normalizeProposalType(persisted.proposalType);
		lastRequestRef.current = {
			projectId: persisted.projectId,
			proposalType,
		};
	}, [startGeneration, updateProgress]);

	useEffect(() => {
		if (!jobId || !projectId) return;

		const persisted = loadGenerationState();
		if (persisted?.jobId === jobId) {
			const proposalType = normalizeProposalType(persisted.proposalType);
			lastRequestRef.current = {
				projectId: persisted.projectId,
				proposalType,
			};
			return;
		}

		lastRequestRef.current = {
			projectId,
			proposalType: "Conceptual",
		};
	}, [jobId, projectId]);

	useEffect(() => {
		if (!isGenerating || !projectId || startedAt === null) return;

		showProposalProgressToast({
			progress,
			currentStep: currentStep || "Starting...",
			startTime: startedAt,
			reasoning: [],
			onCancel: cancelGeneration,
		});
	}, [
		cancelGeneration,
		currentStep,
		isGenerating,
		progress,
		projectId,
		startedAt,
	]);

	useEffect(() => {
		if (!isGenerating || !jobId || !projectId) {
			abortPolling();
			setCancelHandler(null);
			return;
		}

		if (activeJobIdRef.current === jobId) {
			return;
		}

		abortPolling();

		const abortController = new AbortController();
		abortControllerRef.current = abortController;
		activeJobIdRef.current = jobId;

		const cancelHandler = () => {
			abortController.abort();
			resetGenerationState();
			toast.dismiss("proposal-generation-progress");
		};

		setCancelHandler(cancelHandler);

		pollProposalStatus(jobId, {
			signal: abortController.signal,
			onProgress: (status) => {
				const estimate = estimateRemainingTime(status.progress, startedAt);
				updateProgress(status.progress, status.currentStep, estimate);
				updatePersistedProgress(status.progress);
			},
			onComplete: (result) => {
				const proposalId = result?.proposalId;
				const activeProjectId = projectId;

				resetGenerationState();

				if (!proposalId) {
					showProposalErrorToast("Proposal generated without a proposal ID.");
					return;
				}

				const proposalPath = `/project/${activeProjectId}/proposals/${proposalId}`;
				showProposalSuccessToast(proposalId, () => {
					router.push(proposalPath);
				});

				if (pathnameRef.current?.startsWith(`/project/${activeProjectId}`)) {
					router.push(proposalPath);
				}
			},
			onError: (errorMsg) => {
				const retryRequest = lastRequestRef.current;

				resetGenerationState();

				const retry = retryRequest
					? () => {
							startNewGeneration({
								projectId: retryRequest.projectId,
								proposalType: retryRequest.proposalType,
							}).catch((error) => {
								logger.error(
									"Retry failed",
									error,
									"ProposalGenerationManager",
								);
								showProposalErrorToast(
									error instanceof Error ? error.message : "Retry failed",
								);
							});
						}
					: undefined;

				showProposalErrorToast(errorMsg, retry);
			},
		}).catch((error) => {
			if (isAbortError(error)) {
				return;
			}

			logger.error("Polling failed", error, "ProposalGenerationManager");
		});

		return () => {
			abortController.abort();
		};
	}, [
		abortPolling,
		isGenerating,
		jobId,
		projectId,
		resetGenerationState,
		router,
		setCancelHandler,
		startNewGeneration,
		startedAt,
		updateProgress,
	]);

	return null;
}
