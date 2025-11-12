/**
 * ProposalProgressBadge - Interactive badge showing proposal generation progress
 * Shows popover with details on hover/click
 */

"use client";

import { Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";

// Constants
const PROGRESS_STAGES = [
	{ min: 0, max: 25, label: "Analyzing data" },
	{ min: 25, max: 50, label: "Selecting technologies" },
	{ min: 50, max: 75, label: "Calculating costs" },
	{ min: 75, max: 100, label: "Finalizing proposal" },
] as const;

interface ProposalProgressBadgeProps {
	progress: number;
	isVisible: boolean;
	currentStep?: string;
	estimatedTime?: string | null;
	onViewDetails?: () => void;
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

export function ProposalProgressBadge({
	progress,
	isVisible,
	currentStep,
	estimatedTime,
	onViewDetails,
}: ProposalProgressBadgeProps) {
	if (!isVisible) return null;

	const stageLabel = getStageLabel(progress);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Badge
					variant="default"
					className="flex items-center gap-1.5 bg-primary/90 text-primary-foreground animate-pulse cursor-pointer hover:bg-primary transition-colors"
					role="button"
					aria-label={`Generation in progress: ${progress}%`}
				>
					<Brain className="h-3 w-3" />
					<span className="text-xs font-semibold">{progress}%</span>
				</Badge>
			</PopoverTrigger>
			<PopoverContent className="w-72" align="end">
				<div className="space-y-3">
					<div>
						<h4 className="text-sm font-semibold mb-1">
							Generating AI Proposal
						</h4>
						<p className="text-xs text-muted-foreground">
							{currentStep || stageLabel}
						</p>
					</div>

					<div className="space-y-2">
						<div className="flex items-center justify-between text-xs">
							<span className="font-medium text-primary">{stageLabel}</span>
							<div className="flex items-center gap-2">
								{estimatedTime && (
									<span className="text-muted-foreground">{estimatedTime}</span>
								)}
								<span className="font-semibold">{progress}%</span>
							</div>
						</div>
						<Progress value={progress} className="h-2" />
					</div>

					{onViewDetails && (
						<Button
							size="sm"
							variant="outline"
							className="w-full"
							onClick={onViewDetails}
						>
							View Full Details
						</Button>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
