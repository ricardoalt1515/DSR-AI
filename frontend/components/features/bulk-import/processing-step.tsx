"use client";

/**
 * Processing step — shows AI extraction progress with animated phases.
 */

import {
	AlertTriangle,
	Bot,
	ChevronRight,
	FileSearch,
	Loader2,
	MapPin,
	Sparkles,
	Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { BulkImportRun, RunStatus } from "@/lib/api/bulk-import";
import { bulkImportAPI } from "@/lib/api/bulk-import";

interface ProcessingStepProps {
	runId: string;
	onReviewReady: () => void;
	onNoData: () => void;
	onFailed: (error: string) => void;
	onUploadAnother: () => void;
}

const PROCESSING_PHASES = [
	{
		key: "reading_file",
		label: "Reading file",
		description: "Extracting content from your document...",
		icon: FileSearch,
		progress: 20,
	},
	{
		key: "identifying_locations",
		label: "Identifying locations",
		description: "Finding locations and addresses...",
		icon: MapPin,
		progress: 45,
	},
	{
		key: "extracting_streams",
		label: "Extracting waste streams",
		description: "Identifying waste stream data...",
		icon: Bot,
		progress: 70,
	},
	{
		key: "categorizing",
		label: "Categorizing",
		description: "Classifying each waste stream...",
		icon: Sparkles,
		progress: 90,
	},
];

export function ProcessingStep({
	runId,
	onReviewReady,
	onNoData,
	onFailed,
	onUploadAnother,
}: ProcessingStepProps) {
	const [run, setRun] = useState<BulkImportRun | null>(null);
	const [status, setStatus] = useState<RunStatus>("uploaded");
	const [progressStep, setProgressStep] = useState<string | null>(null);
	const [processingWithoutStepSince, setProcessingWithoutStepSince] = useState<
		number | null
	>(null);
	const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const pollCountRef = useRef(0);

	const poll = useCallback(async () => {
		try {
			const data = await bulkImportAPI.getRun(runId);
			setRun(data);
			setStatus(data.status);
			setProgressStep(data.progressStep);
			if (data.status === "processing" && !data.progressStep) {
				setProcessingWithoutStepSince((previous) => previous ?? Date.now());
			} else {
				setProcessingWithoutStepSince(null);
			}

			if (data.status === "review_ready") {
				onReviewReady();
				return;
			}
			if (data.status === "no_data") {
				onNoData();
				return;
			}
			if (data.status === "failed") {
				onFailed(data.processingError || "Processing failed");
				return;
			}

			// Continue polling with backoff
			pollCountRef.current += 1;
			const delay = pollCountRef.current < 5 ? 2000 : 5000;
			pollRef.current = setTimeout(() => void poll(), delay);
		} catch {
			// Retry on network errors
			pollRef.current = setTimeout(() => void poll(), 5000);
		}
	}, [runId, onReviewReady, onNoData, onFailed]);

	useEffect(() => {
		void poll();
		return () => {
			if (pollRef.current) clearTimeout(pollRef.current);
		};
	}, [poll]);

	const currentPhaseIndex = PROCESSING_PHASES.findIndex(
		(p) => p.key === progressStep,
	);
	const isQueued = status === "uploaded";
	const showStillProcessing =
		status === "processing" &&
		!progressStep &&
		processingWithoutStepSince !== null &&
		Date.now() - processingWithoutStepSince >= 15000;
	const activePhase =
		currentPhaseIndex >= 0
			? PROCESSING_PHASES[currentPhaseIndex]
			: PROCESSING_PHASES[0];
	const progress = isQueued ? 5 : (activePhase?.progress ?? 10);

	if (status === "no_data") {
		return (
			<div className="flex flex-col items-center gap-6 py-12">
				<div className="p-4 rounded-full bg-amber-100 dark:bg-amber-950">
					<AlertTriangle className="h-10 w-10 text-amber-600" />
				</div>
				<div className="text-center space-y-2">
					<h3 className="text-xl font-semibold">No data found</h3>
					<p className="text-muted-foreground max-w-md">
						We couldn't find any locations or waste streams in your file. Please
						check the file content and try again with a different file.
					</p>
				</div>
				<Button onClick={onUploadAnother} variant="outline">
					<Upload className="h-4 w-4 mr-2" />
					Upload Another File
				</Button>
			</div>
		);
	}

	if (status === "failed") {
		return (
			<div className="flex flex-col items-center gap-6 py-12">
				<div className="p-4 rounded-full bg-destructive/10">
					<AlertTriangle className="h-10 w-10 text-destructive" />
				</div>
				<div className="text-center space-y-2">
					<h3 className="text-xl font-semibold">Processing failed</h3>
					<p className="text-muted-foreground max-w-md">
						{run?.processingError ||
							"An unexpected error occurred while processing your file."}
					</p>
				</div>
				<Button onClick={onUploadAnother} variant="outline">
					<Upload className="h-4 w-4 mr-2" />
					Try Another File
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Progress bar */}
			<div className="space-y-3">
				<div className="flex items-center justify-between text-sm">
					<span className="text-muted-foreground">Processing your file...</span>
					<span className="font-medium">{progress}%</span>
				</div>
				<Progress value={progress} className="h-2" />
			</div>

			{/* Phase list */}
			<div className="space-y-3">
				{PROCESSING_PHASES.map((phase, index) => {
					const isActive =
						!isQueued &&
						(phase.key === progressStep || (index === 0 && !progressStep));
					const isComplete =
						currentPhaseIndex > index ||
						(currentPhaseIndex === -1 &&
							index > 0 &&
							status === "review_ready");
					const isPending = !isActive && !isComplete;
					const Icon = phase.icon;

					return (
						<div
							key={phase.key}
							className={`
								flex items-center gap-4 p-4 rounded-lg border transition-all duration-300
								${isActive ? "border-primary/50 bg-primary/5 shadow-sm" : ""}
								${isComplete ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30" : ""}
								${isPending ? "border-transparent bg-muted/30 opacity-50" : ""}
							`}
						>
							<div
								className={`
								p-2 rounded-lg transition-colors
								${isActive ? "bg-primary/10 text-primary" : ""}
								${isComplete ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400" : ""}
								${isPending ? "bg-muted text-muted-foreground" : ""}
							`}
							>
								{isActive ? (
									<Loader2 className="h-5 w-5 animate-spin" />
								) : isComplete ? (
									<Icon className="h-5 w-5" />
								) : (
									<Icon className="h-5 w-5" />
								)}
							</div>
							<div className="flex-1">
								<p
									className={`text-sm font-medium ${isActive ? "text-primary" : ""}`}
								>
									{phase.label}
								</p>
								{isActive && (
									<p className="text-xs text-muted-foreground mt-0.5 animate-in fade-in slide-in-from-left-1 duration-300">
										{phase.description}
									</p>
								)}
							</div>
							{isComplete && (
								<ChevronRight className="h-4 w-4 text-emerald-500" />
							)}
						</div>
					);
				})}
			</div>

			{/* Tip */}
			<Alert className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30">
				<Bot className="h-4 w-4 text-blue-600" />
				<AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
					{isQueued
						? "Queued, waiting for worker to start processing your file."
						: "Our AI is analyzing your file to extract locations and waste streams. This usually takes 15-30 seconds."}
				</AlertDescription>
			</Alert>

			{showStillProcessing && (
				<Alert>
					<Loader2 className="h-4 w-4 animate-spin" />
					<AlertDescription className="text-sm">
						Still processing. This can take longer for larger files.
					</AlertDescription>
				</Alert>
			)}
		</div>
	);
}
