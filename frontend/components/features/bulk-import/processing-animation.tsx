"use client";

/**
 * Reusable AI processing animation with phased steps, progress bar,
 * and live preview of discovered items (#3).
 * Polls the backend for run status and calls callbacks on completion.
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

interface ProcessingAnimationProps {
	runId: string;
	onComplete: (run: BulkImportRun) => void;
	onNoData: () => void;
	onFailed: (error: string) => void;
	onUploadAnother: () => void;
}

const PHASES = [
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
		label: "Organizing data",
		description: "Classifying each item...",
		icon: Sparkles,
		progress: 90,
	},
];

export function ProcessingAnimation({
	runId,
	onComplete,
	onNoData,
	onFailed,
	onUploadAnother,
}: ProcessingAnimationProps) {
	const [status, setStatus] = useState<RunStatus>("processing");
	const [progressStep, setProgressStep] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	// Live preview (#3): track item count and filename
	const [itemCount, setItemCount] = useState(0);
	const [filename, setFilename] = useState<string | null>(null);
	const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const pollCountRef = useRef(0);

	const poll = useCallback(async () => {
		try {
			const data = await bulkImportAPI.getRun(runId);
			setStatus(data.status);
			setProgressStep(data.progressStep);
			// (#3) Update live preview info from run data
			if (data.totalItems > 0) {
				setItemCount(data.totalItems);
			}
			if (data.sourceFilename) {
				setFilename(data.sourceFilename);
			}

			if (data.status === "review_ready") {
				onComplete(data);
				return;
			}
			if (data.status === "no_data") {
				onNoData();
				return;
			}
			if (data.status === "failed") {
				setErrorMessage(data.processingError || "Processing failed");
				onFailed(data.processingError || "Processing failed");
				return;
			}

			pollCountRef.current += 1;
			const delay = pollCountRef.current < 5 ? 2000 : 5000;
			pollRef.current = setTimeout(() => void poll(), delay);
		} catch {
			pollRef.current = setTimeout(() => void poll(), 5000);
		}
	}, [runId, onComplete, onNoData, onFailed]);

	useEffect(() => {
		void poll();
		return () => {
			if (pollRef.current) clearTimeout(pollRef.current);
		};
	}, [poll]);

	const currentPhaseIndex = PHASES.findIndex((p) => p.key === progressStep);
	const activePhase =
		currentPhaseIndex >= 0 ? PHASES[currentPhaseIndex] : PHASES[0];
	const progress = activePhase?.progress ?? 10;

	// Error state
	if (status === "failed") {
		return (
			<div className="flex flex-col items-center gap-4 py-8">
				<div className="p-3 rounded-full bg-destructive/10">
					<AlertTriangle className="h-8 w-8 text-destructive" />
				</div>
				<div className="text-center space-y-1">
					<h3 className="text-lg font-semibold">Processing failed</h3>
					<p className="text-sm text-muted-foreground max-w-sm">
						{errorMessage || "An unexpected error occurred."}
					</p>
				</div>
				<Button onClick={onUploadAnother} variant="outline" size="sm">
					<Upload className="h-4 w-4 mr-2" />
					Try Another File
				</Button>
			</div>
		);
	}

	// No data state
	if (status === "no_data") {
		return (
			<div className="flex flex-col items-center gap-4 py-8">
				<div className="p-3 rounded-full bg-amber-100 dark:bg-amber-950">
					<AlertTriangle className="h-8 w-8 text-amber-600" />
				</div>
				<div className="text-center space-y-1">
					<h3 className="text-lg font-semibold">No data found</h3>
					<p className="text-sm text-muted-foreground max-w-sm">
						We couldn&apos;t find any locations or waste streams in your file.
					</p>
				</div>
				<Button onClick={onUploadAnother} variant="outline" size="sm">
					<Upload className="h-4 w-4 mr-2" />
					Try Another File
				</Button>
			</div>
		);
	}

	// Processing state
	return (
		<div className="space-y-5">
			{/* Progress bar */}
			<div className="space-y-2">
				<div className="flex items-center justify-between text-sm">
					<span className="text-muted-foreground">Processing your file...</span>
					<span className="font-medium">{progress}%</span>
				</div>
				<Progress value={progress} className="h-2" />
			</div>

			{/* Phase list */}
			<div className="space-y-2">
				{PHASES.map((phase, index) => {
					const isActive =
						phase.key === progressStep || (index === 0 && !progressStep);
					const isComplete = currentPhaseIndex > index;
					const isPending = !isActive && !isComplete;
					const Icon = phase.icon;

					return (
						<div
							key={phase.key}
							className={`
								flex items-center gap-3 p-3 rounded-lg border transition-all duration-300
								${isActive ? "border-primary/50 bg-primary/5 shadow-sm" : ""}
								${isComplete ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30" : ""}
								${isPending ? "border-transparent bg-muted/30 opacity-50" : ""}
							`}
						>
							<div
								className={`
									p-1.5 rounded-lg transition-colors
									${isActive ? "bg-primary/10 text-primary" : ""}
									${isComplete ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400" : ""}
									${isPending ? "bg-muted text-muted-foreground" : ""}
								`}
							>
								{isActive ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<Icon className="h-4 w-4" />
								)}
							</div>
							<div className="flex-1">
								<p
									className={`text-sm font-medium ${isActive ? "text-primary" : ""}`}
								>
									{phase.label}
								</p>
								{isActive && (
									<p className="text-xs text-muted-foreground mt-0.5 animate-in fade-in duration-300">
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

			{/* (#3) Live preview — items found so far */}
			{(itemCount > 0 || filename) && (
				<div className="rounded-lg border border-primary/20 bg-primary/[0.02] p-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
					<div className="flex items-center gap-2 text-sm">
						<Sparkles className="h-3.5 w-3.5 text-primary flex-shrink-0" />
						<span className="text-muted-foreground">
							{itemCount > 0 ? (
								<>
									Found <strong className="text-foreground">{itemCount}</strong>{" "}
									{itemCount === 1 ? "item" : "items"} so far
									{filename && (
										<>
											{" "}
											in{" "}
											<strong className="text-foreground">
												&ldquo;{filename}&rdquo;
											</strong>
										</>
									)}
								</>
							) : (
								<>
									Analyzing{" "}
									<strong className="text-foreground">
										&ldquo;{filename}&rdquo;
									</strong>
									...
								</>
							)}
						</span>
					</div>
				</div>
			)}

			{/* Tip */}
			<Alert className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30">
				<Bot className="h-4 w-4 text-blue-600" />
				<AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
					Our AI is analyzing your file. This usually takes 15-30 seconds.
				</AlertDescription>
			</Alert>
		</div>
	);
}
