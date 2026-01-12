/**
 * Proposal Progress Toast - Persistent progress indicator for long-running operations
 * Uses sonner toast with custom content to show real-time progress
 */

import { Brain, ChevronDown, ChevronUp, Minimize2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProposalGenerationStore } from "@/lib/stores/proposal-generation-store";

// Constants to avoid magic numbers
const PROGRESS_STAGES = [
	{ min: 0, max: 25, label: "Analyzing data" },
	{ min: 25, max: 50, label: "Selecting technologies" },
	{ min: 50, max: 75, label: "Calculating costs" },
	{ min: 75, max: 100, label: "Finalizing proposal" },
] as const;

const MIN_PROGRESS_FOR_TIME_ESTIMATE = 10;
const MS_TO_MINUTES = 60000;

interface ProgressToastData {
	progress: number;
	currentStep: string;
	startTime: number;
	reasoning: string[];
	onCancel: () => void;
}

/**
 * Calculate estimated time remaining based on progress rate
 */
function calculateTimeEstimate(
	progress: number,
	startTime: number,
): string | null {
	if (progress < MIN_PROGRESS_FOR_TIME_ESTIMATE) return null;

	const elapsedMs = Date.now() - startTime;
	if (elapsedMs <= 0) return null;

	const progressRate = progress / elapsedMs;
	if (progressRate <= 0) return null;

	const remainingProgress = 100 - progress;
	const estimatedRemainingMs = remainingProgress / progressRate;
	const estimatedMinutes = Math.ceil(estimatedRemainingMs / MS_TO_MINUTES);

	return estimatedMinutes > 0 ? `~${estimatedMinutes} min` : "Almost done";
}

/**
 * Get current stage label based on progress
 */
function getStageLabel(progress: number): string {
	const stage = PROGRESS_STAGES.find(
		(s) => progress >= s.min && progress < s.max,
	);
	return stage?.label || "Processing...";
}

/**
 * Toast content component with expand/collapse functionality
 * Uses global store to persist expand state across updates
 */
function ProgressToastContent({
	toastId,
	progress,
	currentStep,
	stageLabel,
	timeEstimate,
	reasoning,
	onCancel,
}: {
	toastId: string | number;
	progress: number;
	currentStep: string;
	stageLabel: string;
	timeEstimate: string | null;
	reasoning: string[];
	onCancel: () => void;
}) {
	// Use global store for expand state (persists across toast updates)
	const { isToastExpanded, toggleToastExpanded } = useProposalGenerationStore();

	return (
		<div className="w-full bg-background border-2 border-primary rounded-lg shadow-lg p-4">
			<div className="flex items-start gap-3">
				<div className="flex-shrink-0">
					<Brain className="h-5 w-5 text-primary animate-pulse" />
				</div>
				<div className="flex-1 min-w-0">
					<div className="flex items-center justify-between mb-2">
						<h4 className="text-sm font-semibold">Generating AI Proposal</h4>
						<div className="flex items-center gap-1">
							{/* Expand/Collapse button */}
							<Button
								variant="ghost"
								size="sm"
								className="h-6 w-6 p-0"
								onClick={toggleToastExpanded}
								title={isToastExpanded ? "Collapse details" : "Expand details"}
							>
								{isToastExpanded ? (
									<ChevronUp className="h-3 w-3" />
								) : (
									<ChevronDown className="h-3 w-3" />
								)}
							</Button>
							{/* Minimize toast (keep generation running) */}
							<Button
								variant="ghost"
								size="sm"
								className="h-6 w-6 p-0"
								onClick={() => toast.dismiss(toastId)}
								title="Minimize (generation continues)"
							>
								<Minimize2 className="h-3 w-3" />
							</Button>
							{/* Cancel generation */}
							<Button
								variant="ghost"
								size="sm"
								className="h-6 w-6 p-0 text-destructive hover:text-destructive"
								onClick={onCancel}
								title="Cancel generation"
							>
								<X className="h-3 w-3" />
							</Button>
						</div>
					</div>
					<p className="text-xs text-muted-foreground mb-3">{currentStep}</p>
					<div className="space-y-2">
						<div className="flex items-center justify-between text-xs">
							<span className="font-medium text-primary">{stageLabel}</span>
							<div className="flex items-center gap-2">
								{timeEstimate && (
									<span className="text-muted-foreground">{timeEstimate}</span>
								)}
								<span className="font-semibold">{progress}%</span>
							</div>
						</div>
						<Progress
							value={progress}
							className="h-2 transition-all duration-500 ease-out"
						/>
					</div>

					{/* Expandable reasoning section */}
					{isToastExpanded && reasoning.length > 0 && (
						<div className="mt-4 pt-3 border-t border-border">
							<p className="text-xs font-medium text-muted-foreground mb-2">
								AI Agent Process:
							</p>
							<ScrollArea className="h-32">
								<div className="space-y-1 pr-3">
									{reasoning.map((line, i) => (
										<p
											key={`reasoning-${i}-${line.slice(0, 20)}`}
											className="text-xs text-muted-foreground leading-relaxed"
										>
											{line}
										</p>
									))}
								</div>
							</ScrollArea>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

/**
 * Create or update a persistent progress toast
 */
export function showProposalProgressToast(
	data: ProgressToastData,
): string | number {
	const { progress, currentStep, startTime, reasoning, onCancel } = data;
	const timeEstimate = calculateTimeEstimate(progress, startTime);
	const stageLabel = getStageLabel(progress);

	return toast.custom(
		(toastId) => (
			<ProgressToastContent
				toastId={toastId}
				progress={progress}
				currentStep={currentStep}
				stageLabel={stageLabel}
				timeEstimate={timeEstimate}
				reasoning={reasoning}
				onCancel={onCancel}
			/>
		),
		{
			duration: Number.POSITIVE_INFINITY, // Never auto-dismiss
			id: "proposal-generation-progress", // Reuse same toast
		},
	);
}

/**
 * Show success toast when proposal generation completes
 */
export function showProposalSuccessToast(
	_proposalId: string,
	onView: () => void,
) {
	// Dismiss progress toast
	toast.dismiss("proposal-generation-progress");

	// Show success with action button
	toast.success("Proposal generated successfully!", {
		description: "Your proposal is ready to review",
		duration: 8000,
		action: {
			label: "View Proposal",
			onClick: onView,
		},
	});
}

/**
 * Show error toast when proposal generation fails
 */
export function showProposalErrorToast(error: string, onRetry?: () => void) {
	// Dismiss progress toast
	toast.dismiss("proposal-generation-progress");

	// Show error with optional retry
	toast.error("Generation error", {
		description: error,
		duration: 10000,
		action: onRetry
			? {
					label: "Retry",
					onClick: onRetry,
				}
			: undefined,
	});
}
