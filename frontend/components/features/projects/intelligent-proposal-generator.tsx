/**
 * IntelligentProposalGenerator Component
 * Real AI-powered proposal generation with live progress tracking
 *
 * Architecture:
 * - Uses useProposalGeneration hook for API communication
 * - Real-time progress updates from backend AI agent
 * - Automatic polling with exponential backoff
 * - Error handling with retry capability
 */

"use client";

import { AlertCircle, Brain, Loader2, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useProposalGeneration } from "@/lib/hooks/use-proposal-generation";
import type { ProjectDetail } from "@/lib/project-types";
import { useCurrentProject, useLoadProjectAction } from "@/lib/stores";
import { useProposalGenerationStore } from "@/lib/stores/proposal-generation-store";
import { useTechnicalSummaryData } from "@/lib/stores/technical-data-store";
import { logger } from "@/lib/utils/logger";
import {
	showProposalErrorToast,
	showProposalProgressToast,
	showProposalSuccessToast,
} from "@/lib/utils/proposal-progress-toast";

interface IntelligentProposalGeneratorProps {
	projectId: string;
	onProposalGenerated?: (proposalId: string) => void;
	onGenerationStart?: () => void;
	onGenerationEnd?: () => void;
}

export function IntelligentProposalGeneratorComponent({
	projectId,
	onProposalGenerated,
	onGenerationStart,
	onGenerationEnd,
}: IntelligentProposalGeneratorProps) {
	const router = useRouter();
	const storeProject = useCurrentProject();
	const loadProject = useLoadProjectAction();
	const { completion: completeness } = useTechnicalSummaryData(projectId);

	// Global generation state for navbar badge
	const { startGeneration, updateProgress, endGeneration } =
		useProposalGenerationStore();

	// Track start time for time estimation
	const startTimeRef = useRef<number>(Date.now());

	// Hardcode to Conceptual for waste reports
	const proposalType = "Conceptual" as const;

	// Project validation
	const project: ProjectDetail | null = useMemo(() => {
		return storeProject && storeProject.id === projectId
			? (storeProject as ProjectDetail)
			: null;
	}, [storeProject, projectId]);

	// Check if can generate (70% minimum)
	const canGenerate = completeness.percentage >= 70;

	// Use proposal generation hook
	const { generate, cancel, progress, isGenerating, reasoning } =
		useProposalGeneration({
			projectId,
			onReloadProject: () => loadProject(projectId),
			onComplete: async (proposalId) => {
				// Update global state
				endGeneration();

				// Show success toast with action
				showProposalSuccessToast(proposalId, () => {
					router.push(`/project/${projectId}/proposals/${proposalId}`);
				});

				onProposalGenerated?.(proposalId);
				onGenerationEnd?.();
			},
			onError: (errorMsg) => {
				// Update global state
				endGeneration();

				// Show error toast with retry option
				showProposalErrorToast(errorMsg, () => {
					generate({ proposalType });
				});

				onGenerationEnd?.();
			},
			onProgress: (progressValue, step) => {
				// Calculate time estimate for badge
				const elapsedMs = Date.now() - startTimeRef.current;
				const progressRate = progressValue / elapsedMs;
				const remainingProgress = 100 - progressValue;
				const estimatedRemainingMs = remainingProgress / progressRate;
				const estimatedMinutes = Math.ceil(estimatedRemainingMs / 60000);
				const timeEstimate =
					progressValue >= 10 && estimatedMinutes > 0
						? `~${estimatedMinutes} min`
						: null;

				// Update global state for navbar badge
				updateProgress(progressValue, step, timeEstimate);

				// Update persistent toast with reasoning
				showProposalProgressToast({
					progress: progressValue,
					currentStep: step,
					startTime: startTimeRef.current,
					reasoning,
					onCancel: handleCancel,
				});
			},
		});

	/**
	 * Handle start generation button click
	 */
	const handleStartGeneration = async () => {
		logger.debug("Proposal generation initiated", {
			projectId: project?.id,
			projectName: project?.name,
			canGenerate,
			completeness: completeness.percentage,
		});

		if (!project) {
			showProposalErrorToast("Could not load project. Please reload the page.");
			return;
		}

		if (!canGenerate) {
			showProposalErrorToast(
				`Complete at least 70% of technical data (currently: ${completeness.percentage}%)`,
			);
			return;
		}

		// Update global state
		startGeneration(projectId);
		startTimeRef.current = Date.now();

		onGenerationStart?.();

		try {
			logger.info("Starting proposal generation", {
				projectId,
				proposalType,
				completeness: completeness.percentage,
			});

			// Start generation
			await generate({
				proposalType,
				preferences: {
					focusAreas: ["cost-optimization", "sustainability"],
					constraints: {
						max_duration_months: 12,
					},
				},
			});

			logger.info("Proposal generation completed successfully", { projectId });
		} catch (error) {
			logger.error(
				"Error in proposal generation flow",
				error,
				"ProposalGenerator",
			);
			endGeneration();
			showProposalErrorToast(
				error instanceof Error ? error.message : "Unknown error",
			);
			onGenerationEnd?.();
		}
	};

	/**
	 * Handle cancel generation
	 */
	const handleCancel = () => {
		cancel();
		endGeneration();
		showProposalErrorToast("Generation cancelled by user");
		onGenerationEnd?.();
	};

	return (
		<>
			{/* Main Card */}
			<Card className="aqua-panel">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Brain className="h-5 w-5 text-primary" />
						Intelligent AI Generator
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Completeness Badge */}
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium">Technical Data Completeness</p>
							<p className="text-xs text-muted-foreground">
								Minimum 70% to generate proposal
							</p>
						</div>
						<Badge
							variant={canGenerate ? "default" : "secondary"}
							className={
								canGenerate ? "bg-success text-success-foreground" : ""
							}
						>
							{completeness.percentage}%
						</Badge>
					</div>

					<Progress value={completeness.percentage} className="h-2" />

					{/* Warning if insufficient data */}
					{!canGenerate && (
						<Alert className="border-warning/40 bg-warning/10">
							<AlertCircle className="h-4 w-4 text-warning" />
							<AlertDescription className="text-xs text-warning">
								! Complete more technical data to enable intelligent generation.
								Approximately{" "}
								{Math.ceil(
									((70 - completeness.percentage) * completeness.total) / 100,
								)}{" "}
								fields remaining.
							</AlertDescription>
						</Alert>
					)}

					{/* Generate Button */}
					<Button
						onClick={handleStartGeneration}
						disabled={isGenerating || !canGenerate}
						size="lg"
						className={
							canGenerate
								? "w-full bg-gradient-to-r from-success/85 via-success to-success text-success-foreground shadow-lg hover:shadow-xl transition-all duration-300 text-base font-semibold"
								: "w-full bg-muted text-muted-foreground cursor-not-allowed"
						}
					>
						{isGenerating ? (
							<>
								<Loader2 className="mr-2 h-5 w-5 animate-spin" />
								Generating... ({progress}%)
							</>
						) : (
							<>
								<Zap className="mr-2 h-5 w-5" />
								Generate Waste Assessment Report
							</>
						)}
					</Button>
				</CardContent>
			</Card>
		</>
	);
}
