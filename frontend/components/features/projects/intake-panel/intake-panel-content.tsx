"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { SectionErrorBoundary } from "@/components/features/proposals/overview/section-error-boundary";
import { intakeAPI } from "@/lib/api/intake";
import { projectsAPI } from "@/lib/api/projects";
import {
	useConflictingSuggestions,
	useIntakePanelStore,
} from "@/lib/stores/intake-store";
import { useTechnicalDataActions } from "@/lib/stores/technical-data-store";
import type { AISuggestion } from "@/lib/types/intake";
import type { TableSection } from "@/lib/types/technical-data";
import { cn } from "@/lib/utils";
import { AISuggestionsSection } from "./ai-suggestions-section";
import { ConfirmBatchReplaceDialog } from "./confirm-batch-replace-dialog";
import { ConfirmReplaceDialog } from "./confirm-replace-dialog";
import { ConflictCard } from "./conflict-card";
import { formatSuggestionValue } from "./format-suggestion-value";
import { IntakeNotesSection } from "./intake-notes-section";
import { QuickUploadSection } from "./quick-upload-section";
import { UnmappedNotesSection } from "./unmapped-notes-section";

interface IntakePanelContentProps {
	projectId: string;
	sections: TableSection[];
	disabled?: boolean | undefined;
	onOpenSection?: ((sectionId: string) => void) | undefined;
	onUploadComplete?: (() => void) | undefined;
	onHydrate: () => Promise<boolean>;
	className?: string | undefined;
}

function isConflictError(error: unknown): boolean {
	if (typeof error !== "object" || error === null) return false;
	if (!("code" in error)) return false;
	const code = error.code;
	return typeof code === "string" && code === "HTTP_409";
}

function hasExistingValue(value: unknown): boolean {
	if (value === null || value === undefined) return false;
	if (Array.isArray(value)) return value.length > 0;
	if (typeof value === "string") return value.trim().length > 0;
	return true;
}

function formatFieldValue(value: unknown): string {
	if (value === null || value === undefined) return "—";
	if (Array.isArray(value)) return value.join(", ") || "—";
	if (typeof value === "string") return value.trim() || "—";
	if (typeof value === "number") return `${value}`;
	return String(value);
}

export const IntakePanelContent = memo(function IntakePanelContent({
	projectId,
	sections,
	disabled = false,
	onOpenSection,
	onUploadComplete,
	onHydrate,
	className,
}: IntakePanelContentProps) {
	// Combine state selectors with useShallow to prevent unnecessary re-renders
	const {
		unmappedNotes,
		unmappedNotesCount,
		isLoadingSuggestions,
		isProcessingDocuments,
		processingDocumentsCount,
	} = useIntakePanelStore(
		useShallow((state) => ({
			unmappedNotes: state.unmappedNotes,
			unmappedNotesCount: state.unmappedNotesCount,
			isLoadingSuggestions: state.isLoadingSuggestions,
			isProcessingDocuments: state.isProcessingDocuments,
			processingDocumentsCount: state.processingDocumentsCount,
		})),
	);

	// Actions stay separate (stable references, no re-render trigger)
	const applySuggestion = useIntakePanelStore((state) => state.applySuggestion);
	const applySuggestions = useIntakePanelStore(
		(state) => state.applySuggestions,
	);
	const rejectSuggestion = useIntakePanelStore(
		(state) => state.rejectSuggestion,
	);
	const rejectSuggestions = useIntakePanelStore(
		(state) => state.rejectSuggestions,
	);
	const revertSuggestion = useIntakePanelStore(
		(state) => state.revertSuggestion,
	);
	const revertSuggestions = useIntakePanelStore(
		(state) => state.revertSuggestions,
	);
	const resolveConflict = useIntakePanelStore((state) => state.resolveConflict);
	const addSuggestion = useIntakePanelStore((state) => state.addSuggestion);
	const removeUnmappedNote = useIntakePanelStore(
		(state) => state.removeUnmappedNote,
	);
	const resetConflict = useIntakePanelStore((state) => state.resetConflict);
	const rejectConflictSiblings = useIntakePanelStore(
		(state) => state.rejectConflictSiblings,
	);
	const dismissUnmappedNote = useIntakePanelStore(
		(state) => state.dismissUnmappedNote,
	);
	const dismissUnmappedNotes = useIntakePanelStore(
		(state) => state.dismissUnmappedNotes,
	);
	const setNotesLastSavedISO = useIntakePanelStore(
		(state) => state.setNotesLastSavedISO,
	);
	const hydrateIntake = onHydrate;

	const { loadTechnicalData, updateFieldOptimistic } =
		useTechnicalDataActions();
	const conflictingSuggestions = useConflictingSuggestions();
	const animatingIds = useRef(new Set<string>());
	const [confirmSingle, setConfirmSingle] = useState<{
		suggestion: AISuggestion;
		fieldLabel: string;
		sectionTitle: string;
		currentValue: string;
		newValue: string;
	} | null>(null);
	const analyzeAbortRef = useRef<AbortController | null>(null);
	const saveSeqRef = useRef(0);
	const activeProjectIdRef = useRef(projectId);

	useEffect(() => {
		return () => analyzeAbortRef.current?.abort();
	}, []);

	useEffect(() => {
		activeProjectIdRef.current = projectId;
		saveSeqRef.current = 0;
	}, [projectId]);
	const [confirmBatch, setConfirmBatch] = useState<{
		ids: string[];
		items: {
			id: string;
			fieldLabel: string;
			sectionTitle: string;
			currentValue: string;
			newValue: string;
		}[];
	} | null>(null);

	// Group conflicts by fieldId
	const conflictGroups = useMemo(() => {
		const groups = new Map<string, AISuggestion[]>();
		for (const suggestion of conflictingSuggestions) {
			const key = `${suggestion.sectionId}:${suggestion.fieldId}`;
			const existing = groups.get(key);
			if (existing) {
				existing.push(suggestion);
			} else {
				groups.set(key, [suggestion]);
			}
		}
		return Array.from(groups.entries());
	}, [conflictingSuggestions]);

	const fieldStateByKey = useMemo(() => {
		const map = new Map<
			string,
			{ value: unknown; label: string; sectionTitle: string }
		>();
		for (const section of sections) {
			for (const field of section.fields) {
				map.set(`${section.id}:${field.id}`, {
					value: field.value,
					label: field.label,
					sectionTitle: section.title,
				});
			}
		}
		return map;
	}, [sections]);

	const getFieldState = useCallback(
		(sectionId: string, fieldId: string) =>
			fieldStateByKey.get(`${sectionId}:${fieldId}`),
		[fieldStateByKey],
	);

	// Apply suggestion to technical data
	const performApplySuggestion = useCallback(
		async (suggestion: AISuggestion) => {
			// Debounce rapid clicks - prevent duplicate animations
			if (animatingIds.current.has(suggestion.id)) return;
			animatingIds.current.add(suggestion.id);

			// Optimistic update in intake store
			applySuggestion(suggestion.id);
			rejectConflictSiblings(
				suggestion.sectionId,
				suggestion.fieldId,
				suggestion.id,
			);

			// Optimistic update in technical data store (value visible immediately)
			updateFieldOptimistic(
				projectId,
				suggestion.sectionId,
				suggestion.fieldId,
				suggestion.value,
				suggestion.unit,
			);

			try {
				await intakeAPI.updateSuggestionStatus(
					projectId,
					suggestion.id,
					"applied",
				);
				// Silent refresh - no skeleton because data already exists
				await loadTechnicalData(projectId, true);
				toast.success("Suggestion applied");
			} catch (_error) {
				if (isConflictError(_error)) {
					await hydrateIntake();
					await loadTechnicalData(projectId, true);
					return;
				}
				revertSuggestion(suggestion.id);
				resetConflict(suggestion.sectionId, suggestion.fieldId);
				await loadTechnicalData(projectId, true);
				throw _error;
			} finally {
				animatingIds.current.delete(suggestion.id);
			}
		},
		[
			applySuggestion,
			hydrateIntake,
			loadTechnicalData,
			projectId,
			rejectConflictSiblings,
			resetConflict,
			revertSuggestion,
			updateFieldOptimistic,
		],
	);

	const handleApplySuggestion = useCallback(
		async (suggestion: AISuggestion) => {
			const fieldState = getFieldState(
				suggestion.sectionId,
				suggestion.fieldId,
			);
			if (fieldState && hasExistingValue(fieldState.value)) {
				setConfirmSingle({
					suggestion,
					fieldLabel: fieldState.label,
					sectionTitle: fieldState.sectionTitle,
					currentValue: formatFieldValue(fieldState.value),
					newValue: formatSuggestionValue(suggestion.value, suggestion.unit),
				});
				return;
			}
			await performApplySuggestion(suggestion);
		},
		[getFieldState, performApplySuggestion],
	);

	// Reject suggestion
	const handleRejectSuggestion = useCallback(
		async (suggestion: AISuggestion) => {
			rejectSuggestion(suggestion.id);
			try {
				await intakeAPI.updateSuggestionStatus(
					projectId,
					suggestion.id,
					"rejected",
				);
			} catch (_error) {
				if (isConflictError(_error)) {
					await hydrateIntake();
					return;
				}
				revertSuggestion(suggestion.id);
				throw _error;
			}
		},
		[hydrateIntake, projectId, rejectSuggestion, revertSuggestion],
	);

	// Resolve conflict - defer state read to callback execution (rerender-defer-reads)
	const handleResolveConflict = useCallback(
		async (_fieldKey: string, selectedId: string) => {
			// Access store directly to avoid subscription-based re-renders
			const { suggestions } = useIntakePanelStore.getState();
			const selected = suggestions.find(
				(s) => s.id === selectedId && s.status === "pending",
			);
			if (!selected) return;

			resolveConflict(selected.sectionId, selected.fieldId, selectedId);

			try {
				await intakeAPI.updateSuggestionStatus(
					projectId,
					selected.id,
					"applied",
				);
				await loadTechnicalData(projectId, true);
			} catch (_error) {
				if (isConflictError(_error)) {
					await hydrateIntake();
					await loadTechnicalData(projectId, true);
					return;
				}
				revertSuggestion(selected.id);
				resetConflict(selected.sectionId, selected.fieldId);
				await loadTechnicalData(projectId, true);
				throw _error;
			}
		},
		[
			hydrateIntake,
			loadTechnicalData,
			projectId,
			resetConflict,
			resolveConflict,
			revertSuggestion,
		],
	);

	// Map unmapped note to field
	const handleMapNoteToField = useCallback(
		async (
			noteId: string,
			fieldId: string,
			sectionId: string,
			fieldLabel: string,
			sectionTitle: string,
		) => {
			try {
				const response = await intakeAPI.mapUnmappedNote(projectId, noteId, {
					fieldId,
					sectionId,
					fieldLabel,
					sectionTitle,
				});
				removeUnmappedNote(noteId);
				addSuggestion(response.suggestion);
			} catch (_error) {
				toast.error("Failed to map note. Please try again.");
				await hydrateIntake();
				return;
			}
		},
		[addSuggestion, hydrateIntake, projectId, removeUnmappedNote],
	);

	const handleDismissNote = useCallback(
		async (noteId: string) => {
			try {
				await intakeAPI.dismissUnmappedNote(projectId, noteId);
				dismissUnmappedNote(noteId);
			} catch (_error) {
				toast.error("Failed to dismiss note. Please try again.");
				await hydrateIntake();
				return;
			}
		},
		[dismissUnmappedNote, hydrateIntake, projectId],
	);

	const handleDismissBulk = useCallback(
		async (
			scope: "all" | "low_confidence" | "file",
			sourceFileId?: string | null,
		) => {
			try {
				let payload: {
					scope: "all" | "low_confidence" | "file";
					max_confidence?: number;
					source_file_id?: string | null;
				};
				if (scope === "file") {
					payload = { scope, source_file_id: sourceFileId ?? null };
				} else if (scope === "low_confidence") {
					payload = { scope, max_confidence: 70 };
				} else {
					payload = { scope };
				}
				const response = await intakeAPI.dismissUnmappedNotesBulk(
					projectId,
					payload,
				);
				if (scope === "file") {
					const ids = unmappedNotes
						.filter((note) => note.sourceFileId === (sourceFileId ?? null))
						.map((note) => note.id);
					dismissUnmappedNotes(ids);
				} else if (scope === "low_confidence") {
					const ids = unmappedNotes
						.filter((note) => note.confidence < 70)
						.map((note) => note.id);
					dismissUnmappedNotes(ids);
				} else {
					dismissUnmappedNotes(unmappedNotes.map((note) => note.id));
				}
				toast.success(`Dismissed ${response.dismissedCount} notes`);
				await hydrateIntake();
			} catch (_error) {
				toast.error("Failed to dismiss notes. Please try again.");
				await hydrateIntake();
			}
		},
		[dismissUnmappedNotes, hydrateIntake, projectId, unmappedNotes],
	);

	const handleSaveNotes = useCallback(
		async (notes: string) => {
			const requestProjectId = projectId;
			const seq = saveSeqRef.current + 1;
			saveSeqRef.current = seq;
			const response = await intakeAPI.saveNotes(projectId, notes);
			if (saveSeqRef.current !== seq) return;
			if (activeProjectIdRef.current !== requestProjectId) return;
			if (typeof response.updatedAt !== "string" || response.updatedAt.length === 0) {
				throw new Error("Missing updatedAt from saveNotes");
			}
			setNotesLastSavedISO(response.updatedAt);
		},
		[projectId, setNotesLastSavedISO],
	);

	const handleAnalyzeNotes = useCallback(
		async () => {
			const { notesLastSavedISO: latestSavedISO } =
				useIntakePanelStore.getState();
			if (typeof latestSavedISO !== "string" || latestSavedISO.length === 0) {
				toast.error("Save notes before analysis");
				return;
			}

			analyzeAbortRef.current?.abort();
			analyzeAbortRef.current = new AbortController();
			const signal = analyzeAbortRef.current.signal;

			try {
				const result = await intakeAPI.analyzeNotes(
					projectId,
					latestSavedISO,
					signal,
				);

				if (signal.aborted) return;
				if (result.staleIgnored) {
					toast.warning("Notes changed during analysis. Try again.");
					return;
				}

				const hydratedOk = await hydrateIntake();
				if (signal.aborted) return;

				if (hydratedOk) {
					toast.success(
						`Analysis complete: ${result.suggestionsCount} suggestions`,
					);
				} else {
					toast.error("Failed to refresh suggestions");
				}
			} catch (_error) {
				if (signal.aborted) return;
				toast.error("Failed to analyze notes");
			}
		},
		[hydrateIntake, projectId],
	);

	// Handle file upload
	const handleUpload = useCallback(
		async (file: File, category: string) => {
			const isPdf =
				file.type === "application/pdf" || file.name.endsWith(".pdf");
			const isImage = file.type.startsWith("image/");
			if (category === "photos" && !isImage) {
				throw new Error("Photo tag requires an image file.");
			}
			const processWithAi = isPdf || isImage;
			const response = await projectsAPI.uploadFile(projectId, file, {
				category,
				process_with_ai: processWithAi,
			});
			onUploadComplete?.();
			return response;
		},
		[onUploadComplete, projectId],
	);

	const performBatchApply = useCallback(
		async (ids: string[]) => {
			const { suggestions } = useIntakePanelStore.getState();
			const toApply = suggestions.filter(
				(s) => ids.includes(s.id) && s.status === "pending",
			);

			applySuggestions(ids);
			for (const s of toApply) {
				rejectConflictSiblings(s.sectionId, s.fieldId, s.id);
				updateFieldOptimistic(
					projectId,
					s.sectionId,
					s.fieldId,
					s.value,
					s.unit,
				);
			}

			try {
				const response = await intakeAPI.batchUpdateSuggestions(
					projectId,
					ids,
					"applied",
				);
				if (response.errorCount > 0) {
					toast.warning(
						`Applied ${response.appliedCount}, ${response.errorCount} failed`,
					);
					await hydrateIntake();
				}
				await loadTechnicalData(projectId, true);
				return toApply[0];
			} catch (_error) {
				if (isConflictError(_error)) {
					await hydrateIntake();
					await loadTechnicalData(projectId, true);
					return undefined;
				}
				revertSuggestions(ids);
				await loadTechnicalData(projectId, true);
				throw _error;
			}
		},
		[
			applySuggestions,
			hydrateIntake,
			loadTechnicalData,
			projectId,
			rejectConflictSiblings,
			revertSuggestions,
			updateFieldOptimistic,
		],
	);

	const handleBatchApply = useCallback(
		async (ids: string[]) => {
			const { suggestions } = useIntakePanelStore.getState();
			const pendingSuggestions = suggestions.filter(
				(s) => ids.includes(s.id) && s.status === "pending",
			);
			const fieldKeys = pendingSuggestions.map(
				(suggestion) => `${suggestion.sectionId}:${suggestion.fieldId}`,
			);
			const uniqueKeys = new Set(fieldKeys);
			if (fieldKeys.length !== uniqueKeys.size) {
				toast.error(
					"Cannot apply multiple suggestions to the same field. Resolve conflicts first.",
				);
				return;
			}
			const replaceItems = pendingSuggestions
				.map((suggestion) => {
					const fieldState = getFieldState(
						suggestion.sectionId,
						suggestion.fieldId,
					);
					if (!fieldState || !hasExistingValue(fieldState.value)) {
						return null;
					}
					return {
						id: suggestion.id,
						fieldLabel: fieldState.label,
						sectionTitle: fieldState.sectionTitle,
						currentValue: formatFieldValue(fieldState.value),
						newValue: formatSuggestionValue(suggestion.value, suggestion.unit),
					};
				})
				.filter((item): item is NonNullable<typeof item> => item !== null);

			if (replaceItems.length > 0) {
				setConfirmBatch({ ids, items: replaceItems });
				return undefined;
			}

			return performBatchApply(ids);
		},
		[getFieldState, performBatchApply],
	);

	// Batch reject suggestions via API
	const handleBatchReject = useCallback(
		async (ids: string[]) => {
			rejectSuggestions(ids);
			try {
				const response = await intakeAPI.batchUpdateSuggestions(
					projectId,
					ids,
					"rejected",
				);
				if (response.errorCount > 0) {
					toast.warning(
						`Rejected ${response.rejectedCount}, ${response.errorCount} failed`,
					);
					await hydrateIntake();
				}
			} catch (_error) {
				if (isConflictError(_error)) {
					await hydrateIntake();
					return;
				}
				revertSuggestions(ids);
				throw _error;
			}
		},
		[hydrateIntake, projectId, rejectSuggestions, revertSuggestions],
	);

	return (
		<SectionErrorBoundary sectionName="Intake Panel">
			<div className={cn("flex h-full flex-col gap-4 min-w-0", className)}>
				{/* Sticky processing banner - prominently visible during document analysis */}
				<AnimatePresence>
					{isProcessingDocuments && (
						<motion.div
							initial={{ opacity: 0, y: -20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
							className="sticky top-0 z-20 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 backdrop-blur-sm p-4"
							role="status"
							aria-live="polite"
						>
							<Loader2 className="h-5 w-5 animate-spin text-primary" />
							<div className="flex-1 flex flex-col gap-2">
								<p className="text-sm font-medium text-foreground">
									Analyzing {processingDocumentsCount}{" "}
									{processingDocumentsCount === 1 ? "document" : "documents"}...
								</p>
								<div className="h-1 w-full bg-primary/20 rounded-full overflow-hidden">
									<motion.div
										className="h-full bg-primary rounded-full"
										initial={{ x: "-100%" }}
										animate={{ x: "100%" }}
										transition={{
											repeat: Number.POSITIVE_INFINITY,
											duration: 1.5,
											ease: "easeInOut",
										}}
									/>
								</div>
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				<SectionErrorBoundary sectionName="Intake Notes">
					<IntakeNotesSection
						projectId={projectId}
						disabled={disabled}
						onSave={handleSaveNotes}
						onAnalyze={handleAnalyzeNotes}
					/>
				</SectionErrorBoundary>

				<SectionErrorBoundary sectionName="Quick Upload">
					<QuickUploadSection
						projectId={projectId}
						disabled={disabled}
						onUpload={handleUpload}
					/>
				</SectionErrorBoundary>

				{/* Conflict cards */}
				{conflictGroups.map(([fieldId, suggestions]) => (
					<ConflictCard
						key={fieldId}
						fieldLabel={suggestions[0]?.fieldLabel ?? "Unknown field"}
						suggestions={suggestions}
						onResolve={handleResolveConflict}
						disabled={disabled}
					/>
				))}

				<SectionErrorBoundary sectionName="AI Suggestions">
					<AISuggestionsSection
						projectId={projectId}
						disabled={disabled}
						isLoading={isLoadingSuggestions}
						getFieldHasValue={(sectionId, fieldId) => {
							const fieldState = getFieldState(sectionId, fieldId);
							return fieldState ? hasExistingValue(fieldState.value) : false;
						}}
						onApplySuggestion={handleApplySuggestion}
						onRejectSuggestion={handleRejectSuggestion}
						onBatchApply={handleBatchApply}
						onBatchReject={handleBatchReject}
						onOpenSection={onOpenSection}
					/>
				</SectionErrorBoundary>

				<SectionErrorBoundary sectionName="Unmapped Notes">
					<UnmappedNotesSection
						notes={unmappedNotes}
						totalCount={unmappedNotesCount}
						sections={sections}
						onMapToField={handleMapNoteToField}
						onDismiss={handleDismissNote}
						onDismissAll={() => handleDismissBulk("all")}
						onDismissLowConfidence={() => handleDismissBulk("low_confidence")}
						onDismissByFile={(sourceFileId) =>
							handleDismissBulk("file", sourceFileId)
						}
						disabled={disabled}
					/>
				</SectionErrorBoundary>
			</div>
			{confirmSingle && (
				<ConfirmReplaceDialog
					open={Boolean(confirmSingle)}
					onOpenChange={(open) => {
						if (!open) setConfirmSingle(null);
					}}
					fieldLabel={confirmSingle.fieldLabel}
					sectionTitle={confirmSingle.sectionTitle}
					currentValue={confirmSingle.currentValue}
					newValue={confirmSingle.newValue}
					onConfirm={async () => {
						const pending = confirmSingle;
						setConfirmSingle(null);
						try {
							await performApplySuggestion(pending.suggestion);
						} catch (error) {
							if (isConflictError(error)) {
								await hydrateIntake();
								return;
							}
							toast.error("Failed to apply suggestion");
						}
					}}
				/>
			)}
			{confirmBatch && (
				<ConfirmBatchReplaceDialog
					open={Boolean(confirmBatch)}
					onOpenChange={(open) => {
						if (!open) setConfirmBatch(null);
					}}
					items={confirmBatch.items}
					totalCount={confirmBatch.ids.length}
					onConfirm={async () => {
						const pending = confirmBatch;
						setConfirmBatch(null);
						try {
							await performBatchApply(pending.ids);
						} catch (error) {
							if (isConflictError(error)) {
								await hydrateIntake();
								return;
							}
							toast.error("Failed to apply suggestions");
						}
					}}
				/>
			)}
		</SectionErrorBoundary>
	);
});
