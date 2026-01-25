/**
 * IntelligentProposalGenerator Component
 * Real AI-powered proposal generation with live progress tracking
 *
 * Architecture:
 * - Starts proposal generation jobs via API
 * - Global polling handled by proposal generation manager
 * - Progress and status come from global store
 * - Error handling for start failures only
 */

"use client";

import { motion } from "framer-motion";
import {
	AlertCircle,
	Brain,
	CheckCircle2,
	Loader2,
	Sparkles,
	Zap,
} from "lucide-react";
import {
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { proposalsAPI } from "@/lib/api/proposals";
import type { ProjectDetail } from "@/lib/project-types";
import { useCurrentProject } from "@/lib/stores/project-store";
import { useProposalGenerationStore } from "@/lib/stores/proposal-generation-store";
import { useTechnicalSummaryData } from "@/lib/stores/technical-data-store";
import { PROPOSAL_READINESS_THRESHOLD } from "@/lib/technical-sheet-data";
import { logger } from "@/lib/utils/logger";
import { saveGenerationState } from "@/lib/utils/proposal-generation-persistence";
import { showProposalErrorToast } from "@/lib/utils/proposal-progress-toast";

/** Handle exposed to parent components via ref */
export interface ProposalGeneratorHandle {
	triggerGeneration: () => void;
}

interface IntelligentProposalGeneratorProps {
	projectId: string;
	onGenerationStart?: () => void;
	onGenerationEnd?: () => void;
	/** Ref to expose generation trigger to parent */
	triggerRef?: React.RefObject<ProposalGeneratorHandle | null>;
}

export function IntelligentProposalGeneratorComponent({
	projectId,
	onGenerationStart,
	onGenerationEnd,
	triggerRef,
}: IntelligentProposalGeneratorProps) {
	const storeProject = useCurrentProject();
	const { completion: completeness } = useTechnicalSummaryData(projectId);

	const {
		startGeneration,
		cancelGeneration,
		isGenerating,
		progress,
		currentStep,
		projectId: activeProjectId,
		startedAt,
	} = useProposalGenerationStore();

	const [isStarting, setIsStarting] = useState(false);
	const wasGeneratingRef = useRef(false);
	const isGeneratingForProject = isGenerating && activeProjectId === projectId;
	const generationStartTime = startedAt ?? Date.now();

	// Hardcode to Conceptual for waste reports
	const proposalType = "Conceptual" as const;

	// Project validation
	const project: ProjectDetail | null = useMemo(() => {
		return storeProject && storeProject.id === projectId
			? (storeProject as ProjectDetail)
			: null;
	}, [storeProject, projectId]);

	// Check if can generate
	const canGenerate = completeness.percentage >= PROPOSAL_READINESS_THRESHOLD;

	useEffect(() => {
		if (isGeneratingForProject) {
			wasGeneratingRef.current = true;
			return;
		}

		if (wasGeneratingRef.current) {
			wasGeneratingRef.current = false;
			onGenerationEnd?.();
		}
	}, [isGeneratingForProject, onGenerationEnd]);

	/**
	 * Handle start generation button click
	 */
	const handleStartGeneration = useCallback(async () => {
		if (isStarting || isGenerating) {
			return;
		}

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

		setIsStarting(true);

		try {
			logger.info("Starting proposal generation", {
				projectId,
				proposalType,
				completeness: completeness.percentage,
			});

			const initialStatus = await proposalsAPI.generateProposal({
				projectId,
				proposalType,
				preferences: {
					focusAreas: ["cost-optimization", "sustainability"],
					constraints: {
						max_duration_months: 12,
					},
				},
			});

			const startedAt = Date.now();
			startGeneration(projectId, initialStatus.jobId, startedAt);
			saveGenerationState({
				projectId,
				jobId: initialStatus.jobId,
				startTime: startedAt,
				lastProgress: 0,
				proposalType,
			});
			onGenerationStart?.();
		} catch (error) {
			logger.error(
				"Error in proposal generation flow",
				error,
				"ProposalGenerator",
			);
			showProposalErrorToast(
				error instanceof Error ? error.message : "Unknown error",
			);
			onGenerationEnd?.();
		} finally {
			setIsStarting(false);
		}
	}, [
		canGenerate,
		completeness.percentage,
		isGenerating,
		isStarting,
		onGenerationEnd,
		onGenerationStart,
		project,
		projectId,
		proposalType,
		startGeneration,
	]);

	// Expose trigger function to parent component via ref
	useImperativeHandle(
		triggerRef,
		() => ({
			triggerGeneration: handleStartGeneration,
		}),
		[handleStartGeneration],
	);

	// Render the Live Dashboard if generating
	if (isGeneratingForProject) {
		return (
			<GenerationDashboard
				progress={progress}
				currentStep={currentStep}
				onCancel={cancelGeneration}
				startTime={generationStartTime}
			/>
		);
	}

	return (
		<Card className="aqua-panel overflow-hidden relative group">
			<div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Brain className="h-5 w-5 text-primary" />
					Intelligent AI Generator
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4 relative z-10">
				{/* Completeness Badge */}
				<div className="flex items-center justify-between">
					<div>
						<p className="text-sm font-medium">Technical Data Completeness</p>
						<p className="text-xs text-muted-foreground">
							Minimum {PROPOSAL_READINESS_THRESHOLD}% to generate proposal
						</p>
					</div>
					<Badge
						variant={canGenerate ? "default" : "secondary"}
						className={canGenerate ? "bg-success text-success-foreground" : ""}
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
								((PROPOSAL_READINESS_THRESHOLD - completeness.percentage) *
									completeness.total) /
									100,
							)}{" "}
							fields remaining.
						</AlertDescription>
					</Alert>
				)}

				{/* Generate Button - Wrapped in Tooltip when disabled */}
				{canGenerate ? (
					<Button
						onClick={handleStartGeneration}
						disabled={isGenerating || isStarting}
						size="lg"
						className="w-full bg-gradient-to-r from-success/85 via-success to-success text-success-foreground shadow-lg hover:shadow-xl hover:scale-[1.01] transition-[box-shadow,transform] duration-300 text-base font-semibold"
					>
						<Zap className="mr-2 h-5 w-5" />
						Generate AI Report
					</Button>
				) : (
					<Tooltip>
						<TooltipTrigger asChild>
							<div className="w-full">
								<Button
									size="lg"
									disabled
									className="w-full bg-muted text-muted-foreground cursor-not-allowed pointer-events-none"
									aria-describedby="generate-disabled-reason"
								>
									<Zap className="mr-2 h-5 w-5" />
									Generate AI Report
								</Button>
							</div>
						</TooltipTrigger>
						<TooltipContent
							id="generate-disabled-reason"
							side="top"
							className="max-w-xs"
						>
							Complete at least {PROPOSAL_READINESS_THRESHOLD}% of the technical
							data to enable AI report generation. Currently at{" "}
							{completeness.percentage}%.
						</TooltipContent>
					</Tooltip>
				)}
			</CardContent>
		</Card>
	);
}

/**
 * Fixed steps for proposal generation
 * Each step has a threshold - when progress reaches it, the step is marked complete
 */
const GENERATION_STEPS = [
	{ id: 1, label: "Connecting to AI agent", threshold: 5 },
	{ id: 2, label: "Analyzing technical data", threshold: 20 },
	{ id: 3, label: "Evaluating waste composition", threshold: 40 },
	{ id: 4, label: "Identifying upcycling opportunities", threshold: 60 },
	{ id: 5, label: "Calculating projections", threshold: 80 },
	{ id: 6, label: "Generating documentation", threshold: 95 },
] as const;

/**
 * Live Generation Dashboard Component
 * Displays real-time AI progress with fixed step checklist
 */
function GenerationDashboard({
	progress,
	currentStep,
	onCancel,
	startTime,
}: {
	progress: number;
	currentStep: string;
	onCancel: () => void;
	startTime: number;
}) {
	// Calculate estimated time remaining
	const getTimeEstimate = () => {
		if (progress < 10) return "Calculating...";
		const elapsedMs = Date.now() - startTime;
		const progressRate = progress / elapsedMs;
		const remainingProgress = 100 - progress;
		const estimatedRemainingMs = remainingProgress / progressRate;
		const estimatedSeconds = Math.ceil(estimatedRemainingMs / 1000);

		if (estimatedSeconds < 60) return `~${estimatedSeconds}s remaining`;
		const minutes = Math.ceil(estimatedSeconds / 60);
		return `~${minutes} min remaining`;
	};
	// Determine step states based on progress
	const getStepState = (threshold: number, index: number) => {
		if (progress >= threshold) return "complete";
		// Find the current active step (first incomplete one)
		const firstIncompleteIndex = GENERATION_STEPS.findIndex(
			(s) => progress < s.threshold,
		);
		if (index === firstIncompleteIndex) return "active";
		return "pending";
	};

	return (
		<Card className="border-primary/20 bg-gradient-to-b from-background to-primary/5 overflow-hidden shadow-2xl">
			<CardContent className="p-0">
				<div className="grid grid-cols-1 lg:grid-cols-12 min-h-[320px]">
					{/* Left Panel: Visualizer */}
					<div className="lg:col-span-5 p-8 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-border/50 bg-black/5 dark:bg-black/20 relative overflow-hidden">
						{/* Animated Background Grid */}
						<div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

						<div className="relative z-10 flex flex-col items-center">
							{/* Pulsing Core */}
							<div className="relative mb-6">
								<motion.div
									animate={{
										scale: [1, 1.2, 1],
										opacity: [0.5, 0.8, 0.5],
									}}
									transition={{
										duration: 2,
										repeat: Infinity,
										ease: "easeInOut",
									}}
									className="absolute inset-0 bg-primary/30 rounded-full blur-xl"
								/>
								<div className="h-20 w-20 rounded-full bg-background border-4 border-primary/20 flex items-center justify-center relative shadow-[0_0_30px_-5px_rgba(var(--primary),0.3)]">
									<Brain className="h-8 w-8 text-primary" />

									{/* Orbital Ring */}
									<motion.div
										animate={{ rotate: 360 }}
										transition={{
											duration: 8,
											repeat: Infinity,
											ease: "linear",
										}}
										className="absolute inset-[-8px] rounded-full border-t-2 border-r-2 border-primary/40"
									/>
								</div>
							</div>

							<h3 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60 mb-1 text-center">
								AI Agent Active
							</h3>
							<p className="text-xs text-muted-foreground text-center max-w-[180px]">
								Generating your AI report
							</p>
						</div>
					</div>

					{/* Right Panel: Fixed Step List */}
					<div className="lg:col-span-7 p-6 flex flex-col">
						<div className="flex items-center justify-between mb-4">
							<div className="space-y-0.5">
								<h4 className="font-semibold flex items-center gap-2">
									<Sparkles className="h-4 w-4 text-primary" />
									Generation Progress
								</h4>
								<p className="text-xs text-muted-foreground">
									AI analyzing your project data
								</p>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-xs text-muted-foreground">
									{getTimeEstimate()}
								</span>
								<Badge
									variant="outline"
									className="border-primary/50 text-primary font-semibold"
								>
									{Math.round(progress)}%
								</Badge>
							</div>
						</div>

						{/* Fixed Step Checklist */}
						<div className="flex-1 space-y-3 mb-4">
							{GENERATION_STEPS.map((step, index) => {
								const state = getStepState(step.threshold, index);
								let stepClassName = "text-sm text-muted-foreground/50";

								if (state === "complete") {
									stepClassName = "text-sm text-muted-foreground";
								} else if (state === "active") {
									stepClassName = "text-sm font-medium text-foreground";
								}

								return (
									<motion.div
										key={step.id}
										initial={{ opacity: 0, x: -10 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{ delay: index * 0.1 }}
										className="flex items-center gap-3"
									>
										{/* Step Indicator */}
										<div className="flex-shrink-0">
											{state === "complete" ? (
												<div className="h-6 w-6 rounded-full bg-success/20 flex items-center justify-center">
													<CheckCircle2 className="h-4 w-4 text-success" />
												</div>
											) : state === "active" ? (
												<div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
													<Loader2 className="h-4 w-4 text-primary animate-spin" />
												</div>
											) : (
												<div className="h-6 w-6 rounded-full bg-muted/50 flex items-center justify-center">
													<div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
												</div>
											)}
										</div>

										{/* Step Label */}
										<span className={stepClassName}>{step.label}</span>
									</motion.div>
								);
							})}
						</div>

						{/* Progress Bar & Actions */}
						<div className="space-y-3 pt-3 border-t border-border/50">
							<div className="space-y-1.5">
								<div className="flex justify-between text-xs">
									<span className="text-muted-foreground">
										Overall Progress
									</span>
									<span className="font-medium text-primary">
										{currentStep}
									</span>
								</div>
								<Progress value={progress} className="h-2" />
							</div>

							<Button
								variant="ghost"
								size="sm"
								onClick={onCancel}
								className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
							>
								Cancel Generation
							</Button>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
