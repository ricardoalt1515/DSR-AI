import { enableMapSet } from "immer";
import { useMemo } from "react";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";
import type {
	AISuggestion,
	NotesSaveStatus,
	UnmappedNote,
} from "@/lib/types/intake";

enableMapSet();

export type ActiveFilter = "all" | "high" | "notes" | "files";

function getFieldKey(s: { sectionId: string; fieldId: string }): string {
	return `${s.sectionId}:${s.fieldId}`;
}

function buildFieldCounts(
	suggestions: Array<{ sectionId: string; fieldId: string }>,
): Map<string, number> {
	const counts = new Map<string, number>();
	for (const s of suggestions) {
		const key = getFieldKey(s);
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	return counts;
}

interface IntakePanelState {
	// Notes
	intakeNotes: string;
	notesSaveStatus: NotesSaveStatus;
	notesLastSavedISO: string | null;

	// Suggestions
	suggestions: AISuggestion[];
	unmappedNotes: UnmappedNote[];
	unmappedNotesCount: number;
	isLoadingSuggestions: boolean;
	isProcessingDocuments: boolean;
	processingDocumentsCount: number;

	// Single filter (simplified from 3 separate filters)
	activeFilter: ActiveFilter;

	// Basic setters
	setIntakeNotes: (notes: string) => void;
	setNotesSaveStatus: (status: NotesSaveStatus) => void;
	setNotesLastSavedISO: (isoString: string | null) => void;
	setSuggestions: (suggestions: AISuggestion[]) => void;
	setUnmappedNotes: (notes: UnmappedNote[]) => void;
	setUnmappedNotesCount: (count: number) => void;
	setIsLoadingSuggestions: (loading: boolean) => void;
	setIsProcessingDocuments: (processing: boolean, count?: number) => void;
	addSuggestion: (suggestion: AISuggestion) => void;
	removeUnmappedNote: (noteId: string) => void;
	resetConflict: (sectionId: string, fieldId: string) => void;
	rejectConflictSiblings: (
		sectionId: string,
		fieldId: string,
		selectedId: string,
	) => void;

	// Suggestion actions (optimistic updates)
	applySuggestion: (id: string) => void;
	rejectSuggestion: (id: string) => void;
	applySuggestions: (ids: string[]) => void;
	revertSuggestions: (ids: string[]) => void;
	revertSuggestion: (id: string) => void;
	resolveConflict: (
		sectionId: string,
		fieldId: string,
		selectedId: string,
	) => void;

	// Batch action - apply all high-confidence suggestions
	applyHighConfidenceSuggestions: (minConfidence?: number) => string[];

	// Filter action
	setActiveFilter: (filter: ActiveFilter) => void;

	// Unmapped notes actions
	dismissUnmappedNote: (noteId: string) => void;
	dismissUnmappedNotes: (noteIds: string[]) => void;

	// Reset
	reset: () => void;
}

const createInitialState = () => ({
	intakeNotes: "",
	notesSaveStatus: "idle" as NotesSaveStatus,
	notesLastSavedISO: null,
	suggestions: [],
	unmappedNotes: [],
	unmappedNotesCount: 0,
	isLoadingSuggestions: false,
	isProcessingDocuments: false,
	processingDocumentsCount: 0,
	activeFilter: "all" as ActiveFilter,
});

export const useIntakePanelStore = create<IntakePanelState>()(
	immer((set, _get) => ({
		...createInitialState(),

		setIntakeNotes: (notes) => {
			set((state) => {
				state.intakeNotes = notes;
			});
		},

		setNotesSaveStatus: (status) => {
			set((state) => {
				state.notesSaveStatus = status;
			});
		},

		setNotesLastSavedISO: (isoString) => {
			set((state) => {
				state.notesLastSavedISO = isoString;
			});
		},

		setSuggestions: (suggestions) => {
			set((state) => {
				state.suggestions = suggestions;
			});
		},

		setUnmappedNotes: (notes) => {
			set((state) => {
				state.unmappedNotes = notes;
			});
		},

		setUnmappedNotesCount: (count) => {
			set((state) => {
				state.unmappedNotesCount = count;
			});
		},

		setIsLoadingSuggestions: (loading) => {
			set((state) => {
				state.isLoadingSuggestions = loading;
			});
		},

		setIsProcessingDocuments: (processing, count = 0) => {
			set((state) => {
				state.isProcessingDocuments = processing;
				state.processingDocumentsCount = count;
			});
		},

		addSuggestion: (suggestion) => {
			set((state) => {
				state.suggestions.push(suggestion);
			});
		},

		removeUnmappedNote: (noteId) => {
			set((state) => {
				state.unmappedNotes = state.unmappedNotes.filter(
					(note) => note.id !== noteId,
				);
			});
		},

		resetConflict: (sectionId, fieldId) => {
			const conflictKey = getFieldKey({ sectionId, fieldId });
			set((state) => {
				for (const suggestion of state.suggestions) {
					if (
						getFieldKey(suggestion) === conflictKey &&
						suggestion.status !== "applied"
					) {
						suggestion.status = "pending";
					}
				}
			});
		},

		rejectConflictSiblings: (sectionId, fieldId, selectedId) => {
			const conflictKey = getFieldKey({ sectionId, fieldId });
			set((state) => {
				for (const suggestion of state.suggestions) {
					if (
						getFieldKey(suggestion) !== conflictKey ||
						suggestion.id === selectedId
					) {
						continue;
					}
					if (suggestion.status === "pending") {
						suggestion.status = "rejected";
					}
				}
			});
		},

		applySuggestion: (id) => {
			set((state) => {
				const suggestion = state.suggestions.find((s) => s.id === id);
				if (suggestion) {
					suggestion.status = "applied";
				}
			});
		},

		rejectSuggestion: (id) => {
			set((state) => {
				const suggestion = state.suggestions.find((s) => s.id === id);
				if (suggestion) {
					suggestion.status = "rejected";
				}
			});
		},

		applySuggestions: (ids) => {
			set((state) => {
				for (const id of ids) {
					const suggestion = state.suggestions.find((s) => s.id === id);
					if (suggestion && suggestion.status === "pending") {
						suggestion.status = "applied";
					}
				}
			});
		},

		revertSuggestions: (ids) => {
			set((state) => {
				for (const id of ids) {
					const suggestion = state.suggestions.find((s) => s.id === id);
					if (suggestion) {
						suggestion.status = "pending";
					}
				}
			});
		},

		revertSuggestion: (id) => {
			set((state) => {
				const suggestion = state.suggestions.find((s) => s.id === id);
				if (suggestion) {
					suggestion.status = "pending";
				}
			});
		},

		resolveConflict: (sectionId, fieldId, selectedId) => {
			set((state) => {
				const conflictKey = getFieldKey({ sectionId, fieldId });
				const conflictingSuggestions = state.suggestions.filter(
					(s) => getFieldKey(s) === conflictKey && s.status === "pending",
				);

				for (const suggestion of conflictingSuggestions) {
					if (suggestion.id === selectedId) {
						suggestion.status = "applied";
					} else {
						suggestion.status = "rejected";
					}
				}
			});
		},

		applyHighConfidenceSuggestions: (minConfidence = 85) => {
			const affectedIds: string[] = [];
			set((state) => {
				for (const suggestion of state.suggestions) {
					if (
						suggestion.status === "pending" &&
						suggestion.confidence >= minConfidence
					) {
						suggestion.status = "applied";
						affectedIds.push(suggestion.id);
					}
				}
			});
			return affectedIds;
		},

		setActiveFilter: (filter) => {
			set((state) => {
				state.activeFilter = filter;
			});
		},

		dismissUnmappedNote: (noteId) => {
			set((state) => {
				state.unmappedNotes = state.unmappedNotes.filter(
					(n) => n.id !== noteId,
				);
			});
		},

		dismissUnmappedNotes: (noteIds) => {
			const ids = new Set(noteIds);
			set((state) => {
				state.unmappedNotes = state.unmappedNotes.filter((n) => !ids.has(n.id));
			});
		},

		reset: () => {
			set(createInitialState());
		},
	})),
);

// Selectors (use useShallow for array/object returns to prevent infinite re-renders)
export const usePendingSuggestions = (): AISuggestion[] =>
	useIntakePanelStore(
		useShallow((state) =>
			state.suggestions.filter((s) => s.status === "pending"),
		),
	);

export const usePendingSuggestionsCount = () =>
	useIntakePanelStore((state) =>
		state.suggestions.reduce((n, s) => n + (s.status === "pending" ? 1 : 0), 0),
	);

export const useUnmappedNotesCount = () =>
	useIntakePanelStore((state) => state.unmappedNotesCount);

export const useConflictingSuggestions = (): AISuggestion[] =>
	useIntakePanelStore(
		useShallow((state) => {
			const pending = state.suggestions.filter((s) => s.status === "pending");
			const fieldCounts = buildFieldCounts(pending);
			const conflictFieldIds = new Set(
				[...fieldCounts.entries()]
					.filter(([, count]) => count > 1)
					.map(([fieldKey]) => fieldKey),
			);
			return pending.filter((s) => conflictFieldIds.has(getFieldKey(s)));
		}),
	);

// Filtered suggestions selector - sorts conflicts to top
// Uses useMemo for stable reference to prevent unnecessary re-renders
export const useFilteredPendingSuggestions = (): AISuggestion[] => {
	const { suggestions, activeFilter } = useIntakePanelStore(
		useShallow((state) => ({
			suggestions: state.suggestions,
			activeFilter: state.activeFilter,
		})),
	);

	return useMemo(() => {
		const pending = suggestions.filter((s) => s.status === "pending");
		const fieldCounts = buildFieldCounts(pending);
		const isConflicting = (s: AISuggestion) =>
			(fieldCounts.get(getFieldKey(s)) ?? 0) > 1;

		// Apply filter
		let filtered = pending;
		switch (activeFilter) {
			case "high":
				filtered = pending.filter((s) => s.confidence >= 85);
				break;
			case "notes":
				filtered = pending.filter((s) => !s.sourceFileId);
				break;
			case "files":
				filtered = pending.filter((s) => Boolean(s.sourceFileId));
				break;
		}

		// Sort: conflicts first, then by confidence desc
		return [...filtered].sort((a, b) => {
			const aConflict = isConflicting(a);
			const bConflict = isConflicting(b);
			if (aConflict && !bConflict) return -1;
			if (!aConflict && bConflict) return 1;
			return b.confidence - a.confidence;
		});
	}, [suggestions, activeFilter]);
};

// Get summary stats for the summary bar
export const useSuggestionStats = () =>
	useIntakePanelStore(
		useShallow((state) => {
			const pending = state.suggestions.filter((s) => s.status === "pending");
			const highConf = pending.filter((s) => s.confidence >= 85);
			const mediumConf = pending.filter(
				(s) => s.confidence >= 70 && s.confidence < 85,
			);

			// Count conflicts
			const fieldCounts = new Map<string, number>();
			for (const s of pending) {
				const key = `${s.sectionId}:${s.fieldId}`;
				fieldCounts.set(key, (fieldCounts.get(key) ?? 0) + 1);
			}
			const conflictCount = [...fieldCounts.values()].filter(
				(count) => count > 1,
			).length;

			return {
				pendingCount: pending.length,
				highConfCount: highConf.length,
				mediumConfCount: mediumConf.length,
				conflictCount,
			};
		}),
	);

// Check if all suggestions have been processed (for completion state)
export const useHasProcessedSuggestions = () =>
	useIntakePanelStore((state) => {
		const total = state.suggestions.length;
		const pending = state.suggestions.filter(
			(s) => s.status === "pending",
		).length;
		return total > 0 && pending === 0;
	});
