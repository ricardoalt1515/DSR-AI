"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, Keyboard, Sparkles, Upload } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
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
	useHasProcessedSuggestions,
	useIntakePanelStore,
	usePendingSuggestionsCount,
} from "@/lib/stores/intake-store";
import type { AISuggestion } from "@/lib/types/intake";
import { cn } from "@/lib/utils";
import { BatchActionToolbar } from "./batch-action-toolbar";
import { focusField } from "./focus-field";
import { IntakeSummaryBar } from "./intake-summary-bar";
import { KeyboardShortcutsDialog } from "./keyboard-shortcuts-dialog";
import { SuggestionFilters } from "./suggestion-filters";
import { SuggestionRow } from "./suggestion-row";
import { useIntakeKeyboardShortcuts } from "./use-intake-keyboard-shortcuts";

interface AISuggestionsSectionProps {
	projectId: string;
	disabled?: boolean | undefined;
	isLoading?: boolean | undefined;
	getFieldHasValue?:
		| ((sectionId: string, fieldId: string) => boolean)
		| undefined;
	onApplySuggestion: (suggestion: AISuggestion) => Promise<void>;
	onEditSuggestion?: ((suggestion: AISuggestion) => void) | undefined;
	onRejectSuggestion: (suggestion: AISuggestion) => Promise<void>;
	onBatchApply?:
		| ((ids: string[]) => Promise<AISuggestion | undefined>)
		| undefined;
	onBatchReject?: ((ids: string[]) => Promise<void>) | undefined;
	onOpenSection?: ((sectionId: string) => void) | undefined;
}

export function AISuggestionsSection({
	projectId: _projectId,
	disabled = false,
	isLoading = false,
	getFieldHasValue,
	onApplySuggestion,
	onRejectSuggestion,
	onBatchApply,
	onBatchReject,
	onOpenSection,
}: AISuggestionsSectionProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const filteredSuggestions = useFilteredPendingSuggestions();
	const pendingCount = usePendingSuggestionsCount();
	const hasProcessedSuggestions = useHasProcessedSuggestions();
	const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

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

	const handleBatchApply = useCallback(
		async (ids: string[]) => {
			if (onBatchApply) {
				try {
					const firstApplied = await onBatchApply(ids);
					toast.success(`Applied ${ids.length} suggestions`, {
						action: firstApplied
							? {
									label: "Review",
									onClick: () => {
										void focusField({
											sectionId: firstApplied.sectionId,
											fieldId: firstApplied.fieldId,
											onOpenSection,
										});
									},
								}
							: undefined,
						duration: 15000,
					});
				} catch {
					toast.error("Failed to apply suggestions");
				}
			} else {
				for (const id of ids) {
					await handleApply(id);
				}
			}
		},
		[handleApply, onBatchApply, onOpenSection],
	);

	const handleBatchReject = useCallback(
		async (ids: string[]) => {
			if (onBatchReject) {
				try {
					await onBatchReject(ids);
					toast.success(`Rejected ${ids.length} suggestions`);
				} catch {
					toast.error("Failed to reject suggestions");
				}
			} else {
				for (const id of ids) {
					await handleReject(id);
				}
			}
		},
		[handleReject, onBatchReject],
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
		onShowHelp: () => setShowKeyboardHelp(true),
		disabled,
	});

	return (
		<Card
			ref={containerRef}
			className="flex flex-col min-w-0 overflow-hidden rounded-3xl backdrop-blur-sm bg-card/60 border border-white/10"
			tabIndex={0}
		>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between min-w-0 gap-2">
					<CardTitle className="flex items-center gap-2 text-base min-w-0">
						<Sparkles className="h-4 w-4 text-primary" />
						AI Suggestions
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<button
										type="button"
										className="inline-flex"
										aria-label="Confidence levels info"
									>
										<Info className="h-3 w-3 text-muted-foreground" />
									</button>
								</TooltipTrigger>
								<TooltipContent>
									<p className="text-xs">
										High: ≥85% • Medium: 70-85% • Low: &lt;70%
									</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<button
										type="button"
										onClick={() => setShowKeyboardHelp(true)}
										className="rounded p-0.5 hover:bg-muted/50 transition-colors"
										aria-label="Keyboard shortcuts"
									>
										<Keyboard className="h-3 w-3 text-muted-foreground" />
									</button>
								</TooltipTrigger>
								<TooltipContent>
									<p className="text-xs">Keyboard shortcuts (?)</p>
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

			<CardContent className="flex flex-col min-w-0 p-0">
				{/* Loading state */}
				{isLoading && (
					<div className="space-y-3 px-4 pb-4">
						<Skeleton className="h-12 w-full rounded-xl" />
						<Skeleton className="h-12 w-full rounded-xl" />
						<Skeleton className="h-12 w-full rounded-xl" />
					</div>
				)}

				{/* Empty state - show completion celebration or upload prompt */}
				<AnimatePresence mode="wait">
					{!isLoading && pendingCount === 0 && (
						<motion.div
							key={hasProcessedSuggestions ? "completion" : "empty"}
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.95 }}
							transition={{ duration: 0.2 }}
							className={cn(
								"flex flex-col items-center justify-center gap-3 mx-4 mb-4",
								"rounded-2xl border border-dashed p-6 text-center",
								hasProcessedSuggestions
									? "border-success/40 bg-success/5"
									: "border-muted/60 bg-muted/20",
							)}
						>
							{hasProcessedSuggestions ? (
								<>
									{/* Completion celebration */}
									<motion.div
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										transition={{
											type: "spring",
											stiffness: 260,
											damping: 20,
											delay: 0.1,
										}}
										className="rounded-full bg-success/20 p-3"
									>
										<CheckCircle2 className="h-6 w-6 text-success" />
									</motion.div>
									<motion.div
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: 0.2 }}
									>
										<p className="text-sm font-medium text-foreground">
											All suggestions reviewed!
										</p>
										<p className="text-xs text-muted-foreground mt-1">
											Upload more documents to continue
										</p>
									</motion.div>
								</>
							) : (
								<>
									{/* Upload prompt */}
									<div className="rounded-full bg-muted/50 p-3">
										<Upload className="h-5 w-5 text-muted-foreground" />
									</div>
									<p className="text-sm text-muted-foreground">
										Upload documents to see AI suggestions
									</p>
								</>
							)}
						</motion.div>
					)}
				</AnimatePresence>

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
						<div className="flex flex-col gap-2 px-2 pr-3">
							{filteredSuggestions.length === 0 ? (
								<div className="text-center py-8 text-sm text-muted-foreground">
									No suggestions match the current filters
								</div>
							) : (
								<AnimatePresence mode="popLayout">
									{filteredSuggestions.map((suggestion, index) => (
										<SuggestionRow
											key={suggestion.id}
											suggestion={suggestion}
											visibleIds={visibleIds}
											index={index}
											willReplace={
												getFieldHasValue?.(
													suggestion.sectionId,
													suggestion.fieldId,
												) ?? false
											}
											onApply={handleApply}
											onReject={handleReject}
											onOpenSection={onOpenSection}
											disabled={disabled}
										/>
									))}
								</AnimatePresence>
							)}
						</div>
					</>
				)}
			</CardContent>

			{/* Batch action toolbar - outside scroll area for reliable positioning */}
			{!isLoading && pendingCount > 0 && (
				<BatchActionToolbar
					onApplyBatch={handleBatchApply}
					onRejectBatch={handleBatchReject}
					disabled={disabled}
					className="flex-shrink-0"
				/>
			)}

			{/* Keyboard shortcuts help dialog */}
			<KeyboardShortcutsDialog
				open={showKeyboardHelp}
				onOpenChange={setShowKeyboardHelp}
			/>
		</Card>
	);
}
