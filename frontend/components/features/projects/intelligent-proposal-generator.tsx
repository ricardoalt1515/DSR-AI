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

import { AlertCircle, Brain, CheckCircle2, ChevronRight, Loader2, Sparkles, Terminal, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
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
	const { generate, cancel, progress, isGenerating, reasoning, currentStep } =
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
				
				// Smart Redirect: If user is still on this page, go there automatically
				router.push(`/project/${projectId}/proposals/${proposalId}`);
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

	// Render the Live Dashboard if generating
	if (isGenerating) {
		return (
			<GenerationDashboard 
				progress={progress} 
				currentStep={currentStep} 
				reasoning={reasoning} 
				onCancel={handleCancel}
			/>
		);
	}

	return (
		<>
			{/* Main Card */}
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
								? "w-full bg-gradient-to-r from-success/85 via-success to-success text-success-foreground shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all duration-300 text-base font-semibold"
								: "w-full bg-muted text-muted-foreground cursor-not-allowed"
						}
					>
						<Zap className="mr-2 h-5 w-5" />
						Generate Waste Assessment Report
					</Button>
				</CardContent>
			</Card>
		</>
	);
}

/**
 * Live Generation Dashboard Component
 * Displays real-time AI progress with animations
 */
function GenerationDashboard({ 
	progress, 
	currentStep, 
	reasoning, 
	onCancel 
}: { 
	progress: number; 
	currentStep: string; 
	reasoning: string[]; 
	onCancel: () => void; 
}) {
	const scrollRef = useRef<HTMLDivElement>(null);

	// Auto-scroll log
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [reasoning]);

	return (
		<Card className="border-primary/20 bg-gradient-to-b from-background to-primary/5 overflow-hidden shadow-2xl">
			<CardContent className="p-0">
				<div className="grid grid-cols-1 lg:grid-cols-12 min-h-[400px]">
					
					{/* Left Panel: Visualizer */}
					<div className="lg:col-span-5 p-8 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-border/50 bg-black/5 dark:bg-black/20 relative overflow-hidden">
						{/* Animated Background Grid */}
						<div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
						
						<div className="relative z-10 flex flex-col items-center">
							{/* Pulsing Core */}
							<div className="relative mb-8">
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
								<div className="h-24 w-24 rounded-full bg-background border-4 border-primary/20 flex items-center justify-center relative shadow-[0_0_30px_-5px_rgba(var(--primary),0.3)]">
									<Brain className="h-10 w-10 text-primary" />
									
									{/* Orbital Ring */}
									<motion.div
										animate={{ rotate: 360 }}
										transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
										className="absolute inset-[-8px] rounded-full border-t-2 border-r-2 border-primary/40"
									/>
								</div>
							</div>

							<h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60 mb-2 text-center">
								AI Agent Active
							</h3>
							<p className="text-sm text-muted-foreground text-center max-w-[200px]">
								Analyzing waste streams and calculating opportunities...
							</p>
						</div>
					</div>

					{/* Right Panel: Data Stream */}
					<div className="lg:col-span-7 p-6 flex flex-col">
						<div className="flex items-center justify-between mb-6">
							<div className="space-y-1">
								<h4 className="font-semibold flex items-center gap-2">
									<Terminal className="h-4 w-4 text-primary" />
									Live Reasoning Log
								</h4>
								<p className="text-xs text-muted-foreground">
									Real-time processing events
								</p>
							</div>
							<Badge variant="outline" className="animate-pulse border-primary/50 text-primary">
								Processing... {Math.round(progress)}%
							</Badge>
						</div>

						{/* Terminal Window */}
						<div className="flex-1 bg-black/90 rounded-lg border border-white/10 p-4 font-mono text-xs text-green-400 shadow-inner mb-6 overflow-hidden flex flex-col">
							<div 
								ref={scrollRef}
								className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-white/20"
							>
								<AnimatePresence initial={false}>
									{reasoning.map((log, i) => (
										<motion.div
											key={i}
											initial={{ opacity: 0, x: -10 }}
											animate={{ opacity: 1, x: 0 }}
											className="flex items-start gap-2"
										>
											<span className="text-white/30 shrink-0">{">"}</span>
											<span>{log}</span>
										</motion.div>
									))}
									{reasoning.length === 0 && (
										<span className="text-white/30 italic">Initializing agent connection...</span>
									)}
								</AnimatePresence>
								<motion.div
									animate={{ opacity: [0, 1, 0] }}
									transition={{ duration: 0.8, repeat: Infinity }}
									className="w-2 h-4 bg-green-400/50 inline-block align-middle ml-1"
								/>
							</div>
						</div>

						{/* Progress & Actions */}
						<div className="space-y-4">
							<div className="space-y-2">
								<div className="flex justify-between text-xs">
									<span className="text-muted-foreground">Current Step</span>
									<span className="font-medium text-primary">{currentStep}</span>
								</div>
								<Progress value={progress} className="h-1.5" />
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

