"use client";

import {
	CheckCircle2,
	Circle,
	Loader2,
	RefreshCw,
	X,
	XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	type VoiceInterviewDetails,
	type VoiceInterviewStatus,
	voiceInterviewsApi,
} from "@/lib/api/voice-interviews";
import { cn } from "@/lib/utils";

interface VoiceProcessingProgressProps {
	voiceInterviewId: string;
	filename?: string | undefined;
	onReady: (payload: {
		voiceInterviewId: string;
		bulkImportRunId: string;
	}) => void;
	onDismiss: () => void;
}

const STAGES: { key: VoiceInterviewStatus[]; label: string }[] = [
	{ key: ["uploaded", "queued"], label: "Uploaded" },
	{ key: ["transcribing"], label: "Transcribing audio" },
	{ key: ["extracting"], label: "Extracting waste data" },
	{
		key: ["review_ready", "partial_finalized", "finalized"],
		label: "Ready for review",
	},
];

type StageState = "completed" | "active" | "pending" | "failed";

function getStageStates(
	status: VoiceInterviewStatus,
	failedStage: string | null,
): StageState[] {
	const TERMINAL_READY = ["review_ready", "partial_finalized", "finalized"];
	if (TERMINAL_READY.includes(status)) {
		return ["completed", "completed", "completed", "completed"];
	}

	if (status === "failed") {
		const stageIdx = failedStage === "extracting" ? 2 : 1;
		return STAGES.map((_, i) => {
			if (i < stageIdx) return "completed" as const;
			if (i === stageIdx) return "failed" as const;
			return "pending" as const;
		});
	}

	const statusToStageIdx: Record<string, number> = {
		uploaded: 0,
		queued: 0,
		transcribing: 1,
		extracting: 2,
	};
	const activeIdx = statusToStageIdx[status] ?? 0;
	return STAGES.map((_, i) => {
		if (i < activeIdx) return "completed" as const;
		if (i === activeIdx) return "active" as const;
		return "pending" as const;
	});
}

export function VoiceProcessingProgress({
	voiceInterviewId,
	filename,
	onReady,
	onDismiss,
}: VoiceProcessingProgressProps) {
	const [details, setDetails] = useState<VoiceInterviewDetails | null>(null);
	const [retrying, setRetrying] = useState(false);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const poll = useCallback(async () => {
		try {
			const d = await voiceInterviewsApi.get(voiceInterviewId);
			setDetails(d);
			const ready = ["review_ready", "partial_finalized", "finalized"];
			if (ready.includes(d.status)) {
				if (intervalRef.current) clearInterval(intervalRef.current);
				onReady({
					voiceInterviewId,
					bulkImportRunId: d.bulkImportRunId,
				});
			}
			if (d.status === "failed") {
				if (intervalRef.current) clearInterval(intervalRef.current);
			}
		} catch {
			// ignore transient errors, keep polling
		}
	}, [voiceInterviewId, onReady]);

	useEffect(() => {
		void poll();
		intervalRef.current = setInterval(() => void poll(), 3000);
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [poll]);

	const handleRetry = useCallback(async () => {
		setRetrying(true);
		try {
			const result = await voiceInterviewsApi.retry(
				voiceInterviewId,
				crypto.randomUUID(),
			);
			setDetails((prev) =>
				prev
					? {
							...prev,
							status: result.status,
							failedStage: result.failedStage,
							processingAttempts: result.processingAttempts,
						}
					: prev,
			);
			// restart polling
			if (intervalRef.current) clearInterval(intervalRef.current);
			intervalRef.current = setInterval(() => void poll(), 3000);
			toast.success("Retry started");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Retry failed");
		} finally {
			setRetrying(false);
		}
	}, [voiceInterviewId, poll]);

	const status = details?.status ?? "uploaded";
	const failedStage = details?.failedStage ?? null;
	const stageStates = getStageStates(status, failedStage);

	return (
		<div className="relative overflow-hidden rounded-xl glass-liquid-subtle px-5 py-4">
			{/* Header */}
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-2">
					<div className="flex items-center justify-center rounded-full bg-emerald-500/10 p-1.5">
						<Loader2
							className={cn(
								"h-3.5 w-3.5 text-emerald-400",
								status !== "failed" && "animate-spin",
							)}
						/>
					</div>
					<span className="text-sm font-medium text-foreground/80">
						{filename ?? "Voice interview"}
					</span>
				</div>
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7"
					onClick={onDismiss}
				>
					<X className="h-3.5 w-3.5" />
				</Button>
			</div>

			{/* Stepper */}
			<div className="space-y-0">
				{STAGES.map((stage, i) => {
					const state = stageStates[i] ?? ("pending" as const);
					const isLast = i === STAGES.length - 1;
					return (
						<div key={stage.label} className="flex gap-3">
							{/* Indicator column */}
							<div className="flex flex-col items-center">
								<StageIcon state={state} />
								{!isLast && (
									<div
										className={cn(
											"w-px h-5 my-0.5",
											state === "completed"
												? "bg-emerald-500/40"
												: "bg-muted-foreground/15",
										)}
									/>
								)}
							</div>
							{/* Label */}
							<div className="pb-2">
								<p
									className={cn(
										"text-sm leading-5",
										state === "completed" && "text-emerald-400/80",
										state === "active" && "text-foreground font-medium",
										state === "pending" && "text-muted-foreground/50",
										state === "failed" && "text-red-400",
									)}
								>
									{stage.label}
									{state === "active" && "…"}
								</p>
								{state === "failed" && (
									<div className="flex items-center gap-2 mt-1">
										<p className="text-xs text-red-400/70">
											{details?.errorCode ?? "Processing failed"}
										</p>
										<Button
											variant="outline"
											size="sm"
											className="h-6 text-xs px-2"
											disabled={retrying}
											onClick={() => void handleRetry()}
										>
											<RefreshCw
												className={cn(
													"h-3 w-3 mr-1",
													retrying && "animate-spin",
												)}
											/>
											Retry
										</Button>
									</div>
								)}
							</div>
						</div>
					);
				})}
			</div>

			{/* Shimmer bar */}
			{status !== "failed" && (
				<div
					aria-hidden="true"
					className="absolute inset-x-0 bottom-0 h-px animate-shimmer"
					style={{
						background:
							"linear-gradient(90deg, transparent 0%, color-mix(in srgb, #10b981 40%, transparent) 50%, transparent 100%)",
						backgroundSize: "200% 100%",
					}}
				/>
			)}
		</div>
	);
}

function StageIcon({ state }: { state: StageState }) {
	if (state === "completed") {
		return <CheckCircle2 className="h-4 w-4 text-emerald-500/80 shrink-0" />;
	}
	if (state === "active") {
		return (
			<Loader2 className="h-4 w-4 text-emerald-400 animate-spin shrink-0" />
		);
	}
	if (state === "failed") {
		return <XCircle className="h-4 w-4 text-red-400 shrink-0" />;
	}
	return <Circle className="h-4 w-4 text-muted-foreground/30 shrink-0" />;
}
