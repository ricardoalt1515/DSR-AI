"use client";

import { useCallback, useMemo } from "react";
import {
	useConflictingSuggestions,
	useIntakePanelStore,
} from "@/lib/stores/intake-store";
import { useTechnicalDataActions } from "@/lib/stores/technical-data-store";
import type { AISuggestion } from "@/lib/types/intake";
import type { TableSection } from "@/lib/types/technical-data";
import { cn } from "@/lib/utils";
import { AISuggestionsSection } from "./ai-suggestions-section";
import { ConflictCard } from "./conflict-card";
import { IntakeNotesSection } from "./intake-notes-section";
import { QuickUploadSection } from "./quick-upload-section";
import { UnmappedNotesSection } from "./unmapped-notes-section";

interface IntakePanelContentProps {
	projectId: string;
	sections: TableSection[];
	disabled?: boolean;
	onUploadComplete?: () => void;
	className?: string;
}

export function IntakePanelContent({
	projectId,
	sections,
	disabled = false,
	onUploadComplete,
	className,
}: IntakePanelContentProps) {
	const unmappedNotes = useIntakePanelStore((state) => state.unmappedNotes);
	const isLoadingSuggestions = useIntakePanelStore(
		(state) => state.isLoadingSuggestions,
	);
	const isProcessingDocuments = useIntakePanelStore(
		(state) => state.isProcessingDocuments,
	);
	const processingDocumentsCount = useIntakePanelStore(
		(state) => state.processingDocumentsCount,
	);

	const applySuggestion = useIntakePanelStore((state) => state.applySuggestion);
	const rejectSuggestion = useIntakePanelStore(
		(state) => state.rejectSuggestion,
	);
	const resolveConflict = useIntakePanelStore((state) => state.resolveConflict);
	const mapNoteToField = useIntakePanelStore((state) => state.mapNoteToField);
	const dismissUnmappedNote = useIntakePanelStore(
		(state) => state.dismissUnmappedNote,
	);

	const { updateField } = useTechnicalDataActions();
	const conflictingSuggestions = useConflictingSuggestions();

	// Group conflicts by fieldId
	const conflictGroups = useMemo(() => {
		const groups = new Map<string, AISuggestion[]>();
		for (const suggestion of conflictingSuggestions) {
			const existing = groups.get(suggestion.fieldId) ?? [];
			groups.set(suggestion.fieldId, [...existing, suggestion]);
		}
		return Array.from(groups.entries());
	}, [conflictingSuggestions]);

	// Apply suggestion to technical data
	const handleApplySuggestion = useCallback(
		async (suggestion: AISuggestion) => {
			// Optimistic update in intake store
			applySuggestion(suggestion.id);

			// Update technical data store
			await updateField(projectId, {
				sectionId: suggestion.sectionId,
				fieldId: suggestion.fieldId,
				value:
					typeof suggestion.value === "number"
						? suggestion.value
						: String(suggestion.value),
				...(suggestion.unit ? { unit: suggestion.unit } : {}),
				source: "ai",
			});
		},
		[applySuggestion, projectId, updateField],
	);

	// Reject suggestion
	const handleRejectSuggestion = useCallback(
		async (suggestion: AISuggestion) => {
			rejectSuggestion(suggestion.id);
		},
		[rejectSuggestion],
	);

	// Resolve conflict - defer state read to callback execution (rerender-defer-reads)
	const handleResolveConflict = useCallback(
		async (fieldId: string, selectedId: string) => {
			// Access store directly to avoid subscription-based re-renders
			const { suggestions } = useIntakePanelStore.getState();
			const selected = suggestions.find(
				(s) => s.id === selectedId && s.status === "pending",
			);
			if (!selected) return;

			// Resolve in intake store
			resolveConflict(fieldId, selectedId);

			// Apply to technical data
			await updateField(projectId, {
				sectionId: selected.sectionId,
				fieldId: selected.fieldId,
				value:
					typeof selected.value === "number"
						? selected.value
						: String(selected.value),
				...(selected.unit ? { unit: selected.unit } : {}),
				source: "ai",
			});
		},
		[projectId, resolveConflict, updateField],
	);

	// Map unmapped note to field
	const handleMapNoteToField = useCallback(
		(
			noteId: string,
			fieldId: string,
			sectionId: string,
			fieldLabel: string,
			sectionTitle: string,
		) => {
			mapNoteToField(noteId, fieldId, sectionId, fieldLabel, sectionTitle);
		},
		[mapNoteToField],
	);

	// Handle file upload
	const handleUpload = useCallback(
		async (_file: File) => {
			// Upload logic will be handled by parent component
			// This is a placeholder for the actual upload implementation
			onUploadComplete?.();
		},
		[onUploadComplete],
	);

	return (
		<div className={cn("flex h-full flex-col gap-4", className)}>
			<IntakeNotesSection projectId={projectId} disabled={disabled} />

			<QuickUploadSection
				projectId={projectId}
				disabled={disabled}
				onUpload={handleUpload}
			/>

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

			<AISuggestionsSection
				projectId={projectId}
				disabled={disabled}
				isLoading={isLoadingSuggestions}
				isProcessing={isProcessingDocuments}
				processingCount={processingDocumentsCount}
				onApplySuggestion={handleApplySuggestion}
				onRejectSuggestion={handleRejectSuggestion}
			/>

			<UnmappedNotesSection
				notes={unmappedNotes}
				sections={sections}
				onMapToField={handleMapNoteToField}
				onDismiss={dismissUnmappedNote}
				disabled={disabled}
			/>
		</div>
	);
}
