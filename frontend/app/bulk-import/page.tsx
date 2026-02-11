"use client";

/**
 * Bulk Import Wizard — 4-step flow for importing waste streams from files.
 * URL params: entrypoint (company|location), id (UUID), run_id (UUID), step (1-4)
 */

import {
	ArrowLeft,
	Check,
	FileUp,
	Loader2,
	Search,
	Sparkles,
	Upload,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ProcessingStep } from "@/components/features/bulk-import/processing-step";
import { ReviewStep } from "@/components/features/bulk-import/review-step";
import { SummaryStep } from "@/components/features/bulk-import/summary-step";
import { UploadStep } from "@/components/features/bulk-import/upload-step";
import { Breadcrumb } from "@/components/shared/navigation/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BulkImportRun, EntrypointType } from "@/lib/api/bulk-import";
import { bulkImportAPI } from "@/lib/api/bulk-import";

const STEPS = [
	{ number: 1, label: "Upload", icon: Upload },
	{ number: 2, label: "Processing", icon: Search },
	{ number: 3, label: "Review", icon: Sparkles },
	{ number: 4, label: "Summary", icon: Check },
];

function BulkImportContent() {
	const router = useRouter();
	const searchParams = useSearchParams();

	// Read URL params
	const entrypointParam = searchParams.get("entrypoint");
	const entrypointType: EntrypointType =
		entrypointParam === "location" ? "location" : "company";
	const entrypointId = searchParams.get("id") || "";
	const urlRunId = searchParams.get("run_id") || "";
	const urlStep = Number(searchParams.get("step") || "1");

	const [currentStep, setCurrentStep] = useState(urlStep);
	const [runId, setRunId] = useState(urlRunId);
	const [run, setRun] = useState<BulkImportRun | null>(null);
	const [uploading, setUploading] = useState(false);

	// Update URL when step or run change
	const updateURL = useCallback(
		(step: number, newRunId?: string) => {
			const params = new URLSearchParams();
			params.set("entrypoint", entrypointType);
			params.set("id", entrypointId);
			if (newRunId || runId) params.set("run_id", newRunId || runId);
			params.set("step", String(step));
			router.replace(`/bulk-import?${params}`, { scroll: false });
		},
		[entrypointType, entrypointId, runId, router],
	);

	// Rehydrate from URL
	useEffect(() => {
		if (!urlRunId || urlStep <= 1) {
			return;
		}

		let cancelled = false;
		setRunId(urlRunId);
		setCurrentStep(urlStep);

		if (urlStep >= 3) {
			void bulkImportAPI
				.getRun(urlRunId)
				.then((nextRun) => {
					if (cancelled) {
						return;
					}
					setRun(nextRun);
				})
				.catch(() => {
					if (cancelled) {
						return;
					}
					setRun(null);
					setRunId("");
					setCurrentStep(1);
					const params = new URLSearchParams();
					params.set("entrypoint", entrypointType);
					params.set("id", entrypointId);
					params.set("step", "1");
					router.replace(`/bulk-import?${params}`, { scroll: false });
				});
		}

		return () => {
			cancelled = true;
		};
	}, [entrypointId, entrypointType, router, urlRunId, urlStep]);

	const goToStep = useCallback(
		(step: number, newRunId?: string) => {
			setCurrentStep(step);
			updateURL(step, newRunId);
		},
		[updateURL],
	);

	// Handle file upload
	const handleFileSelected = useCallback(
		async (file: File) => {
			if (!entrypointId) {
				toast.error("Invalid entry point", {
					description: "Missing company or location ID.",
				});
				return;
			}

			setUploading(true);
			try {
				const result = await bulkImportAPI.upload(
					file,
					entrypointType,
					entrypointId,
				);
				const newRunId = result.runId;
				setRunId(newRunId);
				goToStep(2, newRunId);
				toast.success("File uploaded", {
					description: "AI is processing your file...",
				});
			} catch (error) {
				toast.error(error instanceof Error ? error.message : "Upload failed");
			} finally {
				setUploading(false);
			}
		},
		[entrypointType, entrypointId, goToStep],
	);

	// Reset to upload another file
	const handleUploadAnother = useCallback(() => {
		setRunId("");
		setRun(null);
		goToStep(1);
	}, [goToStep]);

	// Breadcrumb
	const breadcrumbItems = useMemo(() => {
		const items: {
			label: string;
			href?: string;
			icon?: React.ComponentType<{ className?: string }>;
		}[] = [{ label: "Companies", href: "/companies" }];
		if (entrypointType === "company" && entrypointId) {
			items.push({ label: "Company", href: `/companies/${entrypointId}` });
		}
		items.push({ label: "Bulk Import", icon: FileUp });
		return items;
	}, [entrypointType, entrypointId]);

	return (
		<div className="container mx-auto py-8 max-w-4xl space-y-6">
			{/* Navigation */}
			<div className="flex items-center gap-4">
				<Button
					variant="ghost"
					size="icon"
					aria-label="Go back"
					onClick={() => router.back()}
				>
					<ArrowLeft className="h-5 w-5" />
				</Button>
				<Breadcrumb items={breadcrumbItems} />
			</div>

			{/* Page title */}
			<div>
				<h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
					<FileUp className="h-8 w-8" />
					Bulk Import
				</h1>
				<p className="text-muted-foreground mt-1">
					Import locations and waste streams from a file
				</p>
			</div>

			{/* Step indicator */}
			<StepIndicator currentStep={currentStep} />

			{/* Step content */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">
						{STEPS[currentStep - 1]?.label ?? "Import"}
					</CardTitle>
				</CardHeader>
				<CardContent>
					{currentStep === 1 && (
						<UploadStep
							onFileSelected={handleFileSelected}
							uploading={uploading}
						/>
					)}
					{currentStep === 2 && runId && (
						<ProcessingStep
							runId={runId}
							onReviewReady={() => {
								void bulkImportAPI
									.getRun(runId)
									.then((r) => {
										setRun(r);
										goToStep(3);
									})
									.catch(() => {
										toast.error("Ready, but failed loading review", {
											description: "Please retry in a moment.",
										});
										goToStep(2, runId);
									});
							}}
							onNoData={() => {}}
							onFailed={() => {}}
							onUploadAnother={handleUploadAnother}
						/>
					)}
					{currentStep === 3 && runId && run && (
						<ReviewStep
							runId={runId}
							run={run}
							onFinalize={() => goToStep(4)}
							onRunUpdated={setRun}
						/>
					)}
					{currentStep === 4 && runId && (
						<SummaryStep
							runId={runId}
							entrypointType={entrypointType}
							entrypointId={entrypointId}
							onNewImport={handleUploadAnother}
							onNavigate={(path) => router.push(path)}
						/>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function StepIndicator({ currentStep }: { currentStep: number }) {
	return (
		<div className="flex items-center justify-between">
			{STEPS.map((step, index) => {
				const isActive = step.number === currentStep;
				const isComplete = step.number < currentStep;
				const Icon = step.icon;

				return (
					<div
						key={step.number}
						className="flex items-center flex-1 last:flex-initial"
					>
						{/* Step circle */}
						<div className="flex flex-col items-center gap-1.5">
							<div
								className={`
									flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300
									${
										isActive
											? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
											: isComplete
												? "border-emerald-500 bg-emerald-500 text-white"
												: "border-muted-foreground/30 bg-background text-muted-foreground"
									}
								`}
							>
								{isComplete ? (
									<Check className="h-4 w-4" />
								) : (
									<Icon className="h-4 w-4" />
								)}
							</div>
							<span
								className={`text-xs font-medium ${
									isActive
										? "text-primary"
										: isComplete
											? "text-emerald-600"
											: "text-muted-foreground"
								}`}
							>
								{step.label}
							</span>
						</div>

						{/* Connector line */}
						{index < STEPS.length - 1 && (
							<div
								className={`flex-1 h-0.5 mx-4 mt-[-20px] rounded-full transition-colors duration-300 ${
									step.number < currentStep
										? "bg-emerald-500"
										: "bg-muted-foreground/20"
								}`}
							/>
						)}
					</div>
				);
			})}
		</div>
	);
}

// Wrap in Suspense for useSearchParams
export default function BulkImportPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-[400px]">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			}
		>
			<BulkImportContent />
		</Suspense>
	);
}
