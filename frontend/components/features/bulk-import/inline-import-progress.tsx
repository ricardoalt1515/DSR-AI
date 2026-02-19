"use client";

/**
 * Inline import progress — slim card that shows AI processing status
 * directly on the Company page (no sidebar needed for drag & drop).
 *
 * Polls backend for run status and auto-calls onComplete when done.
 */

import { AlertTriangle, Loader2, Sparkles, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { BulkImportRun, RunStatus } from "@/lib/api/bulk-import";
import { bulkImportAPI } from "@/lib/api/bulk-import";

interface InlineImportProgressProps {
	runId: string;
	filename: string;
	onComplete: (run: BulkImportRun) => void;
	onFailed: (error: string) => void;
	onNoData: () => void;
	onDismiss: () => void;
}

const PHASES: Record<string, { label: string; progress: number }> = {
	reading_file: { label: "Reading file…", progress: 20 },
	identifying_locations: { label: "Finding locations…", progress: 45 },
	extracting_streams: { label: "Extracting waste streams…", progress: 70 },
	categorizing: { label: "Organizing data…", progress: 90 },
};

export function InlineImportProgress({
	runId,
	filename,
	onComplete,
	onFailed,
	onNoData,
	onDismiss,
}: InlineImportProgressProps) {
	const [status, setStatus] = useState<RunStatus>("processing");
	const [progressStep, setProgressStep] = useState<string | null>(null);
	const [itemCount, setItemCount] = useState(0);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const pollCountRef = useRef(0);

	const poll = useCallback(async () => {
		try {
			const data = await bulkImportAPI.getRun(runId);
			setStatus(data.status);
			setProgressStep(data.progressStep);
			if (data.totalItems > 0) setItemCount(data.totalItems);

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

	const phase = progressStep ? PHASES[progressStep] : null;
	const progress = phase?.progress ?? 10;
	const phaseLabel = phase?.label ?? "Starting…";

	// Error state
	if (status === "failed") {
		return (
			<Card className="border-destructive/30 bg-destructive/[0.03] animate-in slide-in-from-top-2 fade-in duration-300">
				<CardContent className="py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<AlertTriangle className="h-4 w-4 text-destructive" />
							<span className="text-sm font-medium">Import failed</span>
							<span className="text-xs text-muted-foreground">
								{errorMessage}
							</span>
						</div>
						<Button variant="ghost" size="sm" onClick={onDismiss}>
							Dismiss
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	// No data state
	if (status === "no_data") {
		return (
			<Card className="border-amber-300/30 bg-amber-50/30 dark:border-amber-800/30 dark:bg-amber-950/10 animate-in slide-in-from-top-2 fade-in duration-300">
				<CardContent className="py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<AlertTriangle className="h-4 w-4 text-amber-600" />
							<span className="text-sm font-medium">
								No data found in your file
							</span>
						</div>
						<Button variant="ghost" size="sm" onClick={onDismiss}>
							<Upload className="h-3.5 w-3.5 mr-1.5" />
							Try Again
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	// Processing state
	return (
		<Card className="border-primary/20 bg-primary/[0.02] animate-in slide-in-from-top-2 fade-in duration-300">
			<CardContent className="py-4 space-y-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2.5">
						<div className="relative flex items-center justify-center">
							<Sparkles className="h-4 w-4 text-primary" />
							<div className="absolute inset-0 animate-ping opacity-20">
								<Sparkles className="h-4 w-4 text-primary" />
							</div>
						</div>
						<span className="text-sm font-medium">
							Analyzing &ldquo;{filename}&rdquo;
						</span>
					</div>
					<div className="flex items-center gap-3">
						<span className="text-xs font-mono text-muted-foreground tabular-nums">
							{progress}%
						</span>
						<Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
					</div>
				</div>
				<Progress value={progress} className="h-1.5" />
				<p className="text-xs text-muted-foreground">
					{itemCount > 0 && (
						<>
							Found <strong className="text-foreground">{itemCount}</strong>{" "}
							{itemCount === 1 ? "item" : "items"} &middot;{" "}
						</>
					)}
					{phaseLabel}
				</p>
			</CardContent>
		</Card>
	);
}
