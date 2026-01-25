"use client";

import { memo, useCallback, useMemo, useState } from "react";
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
import { IntakeNotesSection } from "./intake-notes-section";
import { QuickUploadSection } from "./quick-upload-section";
import { UnmappedNotesSection } from "./unmapped-notes-section";
import { formatSuggestionValue } from "./format-suggestion-value";

interface IntakePanelContentProps {
	projectId: string;
	sections: TableSection[];
	disabled?: boolean;
	onUploadComplete?: () => void;
	onHydrate: () => Promise<void>;
	className?: string;
}

function isConflictError(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	if (!("code" in error)) return false;
	return (error as { code?: string }).code === "HTTP_409";
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
	const setNotesLastSaved = useIntakePanelStore(
		(state) => state.setNotesLastSaved,
	);
	const hydrateIntake = onHydrate;

	const { loadTechnicalData } = useTechnicalDataActions();
	const conflictingSuggestions = useConflictingSuggestions();
	const [confirmSingle, setConfirmSingle] = useState<{
		suggestion: AISuggestion;
		fieldLabel: string;
		sectionTitle: string;
		currentValue: string;
		newValue: string;
	} | null>(null);
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
			// Optimistic update in intake store
			applySuggestion(suggestion.id);
			rejectConflictSiblings(
				suggestion.sectionId,
				suggestion.fieldId,
				suggestion.id,
			);

			try {
				await intakeAPI.updateSuggestionStatus(
					projectId,
					suggestion.id,
					"applied",
				);
				await loadTechnicalData(projectId, true);
				toast.success("Suggestion applied");
			} catch (_error) {
				if (isConflictError(_error)) {
					await hydrateIntake();
					return;
				}
				revertSuggestion(suggestion.id);
				resetConflict(suggestion.sectionId, suggestion.fieldId);
				throw _error;
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
					newValue: formatSuggestionValue(
						suggestion.value,
						suggestion.unit,
					),
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
					return;
				}
				revertSuggestion(selected.id);
				resetConflict(selected.sectionId, selected.fieldId);
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
			const response = await intakeAPI.saveNotes(projectId, notes);
			setNotesLastSaved(new Date(response.updatedAt));
		},
		[projectId, setNotesLastSaved],
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
			await projectsAPI.uploadFile(projectId, file, {
				category,
				process_with_ai: processWithAi,
			});
			onUploadComplete?.();
		},
		[onUploadComplete, projectId],
	);

	// Batch apply suggestions via API
	const performBatchApply = useCallback(
		async (ids: string[]) => {
			applySuggestions(ids);
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
		} catch (_error) {
			if (isConflictError(_error)) {
				await hydrateIntake();
					return;
				}
				revertSuggestions(ids);
				throw _error;
			}
		},
		[
			applySuggestions,
			hydrateIntake,
			loadTechnicalData,
			projectId,
			revertSuggestions,
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
						newValue: formatSuggestionValue(
							suggestion.value,
							suggestion.unit,
						),
					};
				})
				.filter(
					(item): item is NonNullable<typeof item> => item !== null,
				);

			if (replaceItems.length > 0) {
				setConfirmBatch({ ids, items: replaceItems });
				return;
			}

			await performBatchApply(ids);
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
			<div className={cn("flex h-full flex-col gap-4", className)}>
				<SectionErrorBoundary sectionName="Intake Notes">
					<IntakeNotesSection
						projectId={projectId}
						disabled={disabled}
						onSave={handleSaveNotes}
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
						isProcessing={isProcessingDocuments}
						processingCount={processingDocumentsCount}
						getFieldHasValue={(sectionId, fieldId) => {
							const fieldState = getFieldState(sectionId, fieldId);
							return fieldState ? hasExistingValue(fieldState.value) : false;
						}}
						onApplySuggestion={handleApplySuggestion}
						onRejectSuggestion={handleRejectSuggestion}
						onBatchApply={handleBatchApply}
						onBatchReject={handleBatchReject}
						onHydrate={hydrateIntake}
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
