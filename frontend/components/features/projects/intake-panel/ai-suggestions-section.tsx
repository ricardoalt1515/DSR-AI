"use client";

import { Info, Loader2, Sparkles, Upload } from "lucide-react";
import { useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	useFilteredPendingSuggestions,
	useIntakePanelStore,
	usePendingSuggestionsCount,
} from "@/lib/stores/intake-store";
import type { AISuggestion } from "@/lib/types/intake";
import { cn } from "@/lib/utils";
import { BatchActionToolbar } from "./batch-action-toolbar";
import { IntakeSummaryBar } from "./intake-summary-bar";
import { SuggestionFilters } from "./suggestion-filters";
import { SuggestionRow } from "./suggestion-row";
import { useIntakeKeyboardShortcuts } from "./use-intake-keyboard-shortcuts";

interface AISuggestionsSectionProps {
	projectId: string;
	disabled?: boolean;
	isLoading?: boolean;
	isProcessing?: boolean;
	processingCount?: number;
	getFieldHasValue?: (sectionId: string, fieldId: string) => boolean;
	onApplySuggestion: (suggestion: AISuggestion) => Promise<void>;
	onEditSuggestion?: (suggestion: AISuggestion) => void;
	onRejectSuggestion: (suggestion: AISuggestion) => Promise<void>;
	onBatchApply?: (ids: string[]) => Promise<void>;
	onBatchReject?: (ids: string[]) => Promise<void>;
	onHydrate?: () => Promise<void>;
}

export function AISuggestionsSection({
	projectId: _projectId,
	disabled = false,
	isLoading = false,
	isProcessing = false,
	processingCount = 0,
	getFieldHasValue,
	onApplySuggestion,
	onRejectSuggestion,
	onBatchApply,
	onBatchReject,
	onHydrate,
}: AISuggestionsSectionProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const filteredSuggestions = useFilteredPendingSuggestions();
	const pendingCount = usePendingSuggestionsCount();

	const undoBatch = useIntakePanelStore((s) => s.undoBatchOperation);

	// Get visible IDs for range selection
	const visibleIds = useMemo(
		() => filteredSuggestions.map((s) => s.id),
		[filteredSuggestions],
	);

	// Single apply/reject (from row actions)
	const handleApply = useCallback(
		async (id: string) => {
			const { suggestions } = useIntakePanelStore.getState();
			const suggestion = suggestions.find(
				(s) => s.id === id && s.status === "pending",
			);
			if (!suggestion) return;

			try {
				await onApplySuggestion(suggestion);
			} catch {
				toast.error(`Failed to apply ${suggestion.fieldLabel}`);
			}
		},
		[onApplySuggestion],
	);

	const handleReject = useCallback(
		async (id: string) => {
			const { suggestions } = useIntakePanelStore.getState();
			const suggestion = suggestions.find(
				(s) => s.id === id && s.status === "pending",
			);
			if (!suggestion) return;

			try {
				await onRejectSuggestion(suggestion);
			} catch {
				toast.error(`Failed to reject ${suggestion.fieldLabel}`);
			}
		},
		[onRejectSuggestion],
	);

	// Handle undo action - sync with backend truth via hydrate
	const handleUndo = useCallback(async () => {
		undoBatch(); // Clear local undo stack
		if (onHydrate) {
			await onHydrate();
			toast.info("Synced with server");
		} else {
			toast.error("Could not sync with server");
		}
	}, [undoBatch, onHydrate]);

	// Batch apply (from toolbar or summary bar)
	const handleBatchApply = useCallback(
		async (ids: string[]) => {
			if (onBatchApply) {
				try {
					await onBatchApply(ids);
					toast.success(`Applied ${ids.length} suggestions`, {
						action: {
							label: "Undo",
							onClick: handleUndo,
						},
						duration: 15000,
					});
				} catch {
					toast.error("Failed to apply suggestions");
				}
			} else {
				// Fallback to individual calls
				for (const id of ids) {
					await handleApply(id);
				}
			}
		},
		[handleApply, handleUndo, onBatchApply],
	);

	// Batch reject (from toolbar)
	const handleBatchReject = useCallback(
		async (ids: string[]) => {
			if (onBatchReject) {
				try {
					await onBatchReject(ids);
					toast.success(`Rejected ${ids.length} suggestions`, {
						action: {
							label: "Undo",
							onClick: handleUndo,
						},
						duration: 15000,
					});
				} catch {
					toast.error("Failed to reject suggestions");
				}
			} else {
				// Fallback to individual calls
				for (const id of ids) {
					await handleReject(id);
				}
			}
		},
		[handleReject, handleUndo, onBatchReject],
	);

	// Apply all high-confidence (from summary bar)
	const handleApplyHighConfidence = useCallback(
		async (ids: string[]) => {
			await handleBatchApply(ids);
		},
		[handleBatchApply],
	);

	// Auto-resolve all conflicts (from summary bar)
	const handleAutoResolveConflicts = useCallback(
		async (result: { winnerIds: string[]; loserIds: string[] }) => {
			// Apply the winners via batch API
			if (result.winnerIds.length > 0) {
				await handleBatchApply(result.winnerIds);
			}
			// Reject the losers via batch API
			if (result.loserIds.length > 0) {
				await handleBatchReject(result.loserIds);
			}
		},
		[handleBatchApply, handleBatchReject],
	);

	// Selected actions (for toolbar)
	const handleApplySelected = useCallback(async () => {
		const { selectedSuggestionIds } = useIntakePanelStore.getState();
		const ids = Array.from(selectedSuggestionIds);
		if (ids.length > 0) {
			await handleBatchApply(ids);
		}
	}, [handleBatchApply]);

	const handleRejectSelected = useCallback(async () => {
		const { selectedSuggestionIds } = useIntakePanelStore.getState();
		const ids = Array.from(selectedSuggestionIds);
		if (ids.length > 0) {
			await handleBatchReject(ids);
		}
	}, [handleBatchReject]);

	// Keyboard shortcuts
	useIntakeKeyboardShortcuts({
		containerRef,
		visibleIds,
		onApplySelected: handleApplySelected,
		onRejectSelected: handleRejectSelected,
		disabled,
	});

	return (
		<Card
			ref={containerRef}
			className="flex flex-col overflow-hidden rounded-3xl border-none bg-card/80"
			tabIndex={0}
		>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2 text-base">
						<Sparkles className="h-4 w-4 text-primary" />
						AI Suggestions
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger>
									<Info className="h-3 w-3 text-muted-foreground" />
								</TooltipTrigger>
								<TooltipContent>
									<p className="text-xs">
										High: ≥85% • Medium: 70-85% • Low: &lt;70%
									</p>
									<p className="text-xs mt-1 text-muted-foreground">
										Shortcuts: a=apply, r=reject, Esc=clear
									</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</CardTitle>
					{pendingCount > 0 && (
						<span className="text-xs text-muted-foreground">
							{pendingCount} pending
						</span>
					)}
				</div>
				<CardDescription>Extracted values from documents.</CardDescription>
			</CardHeader>

			<CardContent className="flex flex-col flex-1 overflow-hidden p-0">
				{/* Loading state */}
				{isLoading && (
					<div className="space-y-3 px-4 pb-4">
						<Skeleton className="h-12 w-full rounded-xl" />
						<Skeleton className="h-12 w-full rounded-xl" />
						<Skeleton className="h-12 w-full rounded-xl" />
					</div>
				)}

				{/* Processing state */}
				{isProcessing && (
					<div
						className="flex items-center gap-3 mx-4 mb-3 rounded-xl bg-primary/10 p-3"
						aria-live="polite"
					>
						<Loader2 className="h-4 w-4 animate-spin text-primary" />
						<p className="text-sm text-foreground">
							Analyzing {processingCount}{" "}
							{processingCount === 1 ? "document" : "documents"}...
						</p>
					</div>
				)}

				{/* Empty state */}
				{!isLoading && !isProcessing && pendingCount === 0 && (
					<div
						className={cn(
							"flex flex-col items-center justify-center gap-3 mx-4 mb-4",
							"rounded-2xl border border-dashed border-muted/60 bg-muted/20 p-6 text-center",
						)}
					>
						<div className="rounded-full bg-muted/50 p-3">
							<Upload className="h-5 w-5 text-muted-foreground" />
						</div>
						<p className="text-sm text-muted-foreground">
							Upload documents to see AI suggestions
						</p>
					</div>
				)}

				{/* Suggestions list with batch controls */}
				{!isLoading && pendingCount > 0 && (
					<>
						{/* Summary bar */}
						<div className="px-4 mb-3">
							<IntakeSummaryBar
								onApplyHighConfidence={handleApplyHighConfidence}
								onAutoResolveConflicts={handleAutoResolveConflicts}
								disabled={disabled}
							/>
						</div>

						{/* Filters */}
						<div className="px-4 mb-3">
							<SuggestionFilters />
						</div>

						{/* Suggestion rows */}
						<div className="flex-1 overflow-y-auto px-2 max-h-[calc(100vh-500px)]">
							{filteredSuggestions.length === 0 ? (
								<div className="text-center py-8 text-sm text-muted-foreground">
									No suggestions match the current filters
								</div>
							) : (
								filteredSuggestions.map((suggestion) => (
									<SuggestionRow
										key={suggestion.id}
										suggestion={suggestion}
										visibleIds={visibleIds}
										willReplace={
											getFieldHasValue?.(
												suggestion.sectionId,
												suggestion.fieldId,
											) ?? false
										}
										onApply={handleApply}
										onReject={handleReject}
										disabled={disabled}
									/>
								))
							)}
						</div>

						{/* Batch action toolbar (sticky at bottom when items selected) */}
						<BatchActionToolbar
							onApplyBatch={handleBatchApply}
							onRejectBatch={handleBatchReject}
							disabled={disabled}
						/>
					</>
				)}
			</CardContent>
		</Card>
	);
}
