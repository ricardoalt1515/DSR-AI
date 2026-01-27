import { enableMapSet } from "immer";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";
import type {
	AISuggestion,
	ConfidenceLevel,
	NotesSaveStatus,
	SuggestionStatus,
	UnmappedNote,
} from "@/lib/types/intake";
import { getConfidenceLevel } from "@/lib/types/intake";

enableMapSet();

export type ConfidenceFilter = "all" | ConfidenceLevel;

/**
 * Undo entry for batch operations.
 * Captures the previous state of affected suggestions so they can be reverted.
 */
export interface UndoEntry {
	type: "batch_apply" | "batch_reject";
	suggestionIds: string[];
	previousStates: Map<string, SuggestionStatus>;
	timestamp: number;
}

interface IntakePanelState {
	// Notes
	intakeNotes: string;
	notesSaveStatus: NotesSaveStatus;
	notesLastSaved: Date | null;

	// Suggestions
	suggestions: AISuggestion[];
	unmappedNotes: UnmappedNote[];
	unmappedNotesCount: number;
	isLoadingSuggestions: boolean;
	isProcessingDocuments: boolean;
	processingDocumentsCount: number;

	// Selection state (for batch operations)
	selectedSuggestionIds: Set<string>;
	lastSelectedId: string | null;

	// Filters
	confidenceFilter: ConfidenceFilter;
	sectionFilter: string | null;
	sourceFileFilter: string | null;

	// Basic setters
	setIntakeNotes: (notes: string) => void;
	setNotesSaveStatus: (status: NotesSaveStatus) => void;
	setNotesLastSaved: (date: Date | null) => void;
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
	rejectSuggestions: (ids: string[]) => void;
	revertSuggestions: (ids: string[]) => void;
	revertSuggestion: (id: string) => void;
	resolveConflict: (
		sectionId: string,
		fieldId: string,
		selectedId: string,
	) => void;

	// Selection actions
	toggleSuggestionSelection: (id: string) => void;
	toggleRangeSelection: (id: string, visibleIds: string[]) => void;
	selectAllVisible: (visibleIds: string[]) => void;
	clearSelection: () => void;

	// Batch actions (optimistic updates)
	applySelectedSuggestions: () => string[];
	rejectSelectedSuggestions: () => string[];
	applyHighConfidenceSuggestions: (minConfidence?: number) => string[];

	// Filter actions
	setConfidenceFilter: (filter: ConfidenceFilter) => void;
	setSectionFilter: (sectionId: string | null) => void;
	setSourceFileFilter: (fileId: string | null) => void;
	clearFilters: () => void;

	// Unmapped notes actions
	dismissUnmappedNote: (noteId: string) => void;
	dismissUnmappedNotes: (noteIds: string[]) => void;

	// Auto-resolve conflicts by picking highest confidence
	autoResolveAllConflicts: () => {
		resolvedCount: number;
		winnerIds: string[];
		loserIds: string[];
	};

	// Undo stack for batch operations
	undoStack: UndoEntry[];
	pushUndo: (entry: UndoEntry) => void;
	popUndo: () => UndoEntry | undefined;
	undoBatchOperation: () => string[];

	// Reset
	reset: () => void;
}

const initialState = {
	intakeNotes: "",
	notesSaveStatus: "idle" as NotesSaveStatus,
	notesLastSaved: null,
	suggestions: [],
	unmappedNotes: [],
	unmappedNotesCount: 0,
	isLoadingSuggestions: false,
	isProcessingDocuments: false,
	processingDocumentsCount: 0,
	selectedSuggestionIds: new Set<string>(),
	lastSelectedId: null,
	confidenceFilter: "all" as ConfidenceFilter,
	sectionFilter: null,
	sourceFileFilter: null,
	undoStack: [] as UndoEntry[],
};

export const useIntakePanelStore = create<IntakePanelState>()(
	immer((set, _get) => ({
		...initialState,

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

		setNotesLastSaved: (date) => {
			set((state) => {
				state.notesLastSaved = date;
			});
		},

		setSuggestions: (suggestions) => {
			set((state) => {
				state.suggestions = suggestions;
				// Clear selection when suggestions change (data refresh)
				state.selectedSuggestionIds = new Set();
				state.lastSelectedId = null;
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
			const conflictKey = `${sectionId}:${fieldId}`;
			set((state) => {
				for (const suggestion of state.suggestions) {
					const key = `${suggestion.sectionId}:${suggestion.fieldId}`;
					if (key === conflictKey && suggestion.status !== "applied") {
						suggestion.status = "pending";
					}
				}
			});
		},

		rejectConflictSiblings: (sectionId, fieldId, selectedId) => {
			const conflictKey = `${sectionId}:${fieldId}`;
			set((state) => {
				for (const suggestion of state.suggestions) {
					const key = `${suggestion.sectionId}:${suggestion.fieldId}`;
					if (key !== conflictKey || suggestion.id === selectedId) {
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
				// Remove from selection
				state.selectedSuggestionIds.delete(id);
			});
		},

		rejectSuggestion: (id) => {
			set((state) => {
				const suggestion = state.suggestions.find((s) => s.id === id);
				if (suggestion) {
					suggestion.status = "rejected";
				}
				// Remove from selection
				state.selectedSuggestionIds.delete(id);
			});
		},

		applySuggestions: (ids) => {
			const previousStates = new Map<string, SuggestionStatus>();
			const affectedIds: string[] = [];
			set((state) => {
				for (const id of ids) {
					const suggestion = state.suggestions.find((s) => s.id === id);
					if (suggestion && suggestion.status === "pending") {
						previousStates.set(id, suggestion.status);
						suggestion.status = "applied";
						affectedIds.push(id);
						state.selectedSuggestionIds.delete(id);
					}
				}
				if (affectedIds.length > 0) {
					state.undoStack.push({
						type: "batch_apply",
						suggestionIds: affectedIds,
						previousStates,
						timestamp: Date.now(),
					});
				}
			});
		},

		rejectSuggestions: (ids) => {
			const previousStates = new Map<string, SuggestionStatus>();
			const affectedIds: string[] = [];
			set((state) => {
				for (const id of ids) {
					const suggestion = state.suggestions.find((s) => s.id === id);
					if (suggestion && suggestion.status === "pending") {
						previousStates.set(id, suggestion.status);
						suggestion.status = "rejected";
						affectedIds.push(id);
						state.selectedSuggestionIds.delete(id);
					}
				}
				if (affectedIds.length > 0) {
					state.undoStack.push({
						type: "batch_reject",
						suggestionIds: affectedIds,
						previousStates,
						timestamp: Date.now(),
					});
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
				const conflictKey = `${sectionId}:${fieldId}`;
				const conflictingSuggestions = state.suggestions.filter(
					(s) =>
						`${s.sectionId}:${s.fieldId}` === conflictKey &&
						s.status === "pending",
				);

				for (const suggestion of conflictingSuggestions) {
					if (suggestion.id === selectedId) {
						suggestion.status = "applied";
					} else {
						suggestion.status = "rejected";
					}
					// Remove from selection
					state.selectedSuggestionIds.delete(suggestion.id);
				}
			});
		},

		// Selection actions
		toggleSuggestionSelection: (id) => {
			set((state) => {
				if (state.selectedSuggestionIds.has(id)) {
					state.selectedSuggestionIds.delete(id);
				} else {
					state.selectedSuggestionIds.add(id);
				}
				state.lastSelectedId = id;
			});
		},

		toggleRangeSelection: (id, visibleIds) => {
			set((state) => {
				if (!state.lastSelectedId) {
					// No previous selection, just toggle this one
					state.selectedSuggestionIds.add(id);
					state.lastSelectedId = id;
					return;
				}

				const lastIndex = visibleIds.indexOf(state.lastSelectedId);
				const currentIndex = visibleIds.indexOf(id);

				if (lastIndex === -1 || currentIndex === -1) {
					// One of the IDs is not in visible list, just toggle
					state.selectedSuggestionIds.add(id);
					state.lastSelectedId = id;
					return;
				}

				// Select range
				const start = Math.min(lastIndex, currentIndex);
				const end = Math.max(lastIndex, currentIndex);

				for (let i = start; i <= end; i++) {
					const id = visibleIds[i];
					if (id) state.selectedSuggestionIds.add(id);
				}
				state.lastSelectedId = id;
			});
		},

		selectAllVisible: (visibleIds) => {
			set((state) => {
				for (const id of visibleIds) {
					state.selectedSuggestionIds.add(id);
				}
			});
		},

		clearSelection: () => {
			set((state) => {
				state.selectedSuggestionIds = new Set();
				state.lastSelectedId = null;
			});
		},

		// Batch actions - return IDs that were affected for API calls
		// Also push undo entry for batch operations
		applySelectedSuggestions: () => {
			const affectedIds: string[] = [];
			const previousStates = new Map<string, SuggestionStatus>();
			set((state) => {
				for (const id of state.selectedSuggestionIds) {
					const suggestion = state.suggestions.find((s) => s.id === id);
					if (suggestion && suggestion.status === "pending") {
						previousStates.set(id, suggestion.status);
						suggestion.status = "applied";
						affectedIds.push(id);
					}
				}
				if (affectedIds.length > 0) {
					state.undoStack.push({
						type: "batch_apply",
						suggestionIds: affectedIds,
						previousStates,
						timestamp: Date.now(),
					});
				}
				state.selectedSuggestionIds = new Set();
				state.lastSelectedId = null;
			});
			return affectedIds;
		},

		rejectSelectedSuggestions: () => {
			const affectedIds: string[] = [];
			const previousStates = new Map<string, SuggestionStatus>();
			set((state) => {
				for (const id of state.selectedSuggestionIds) {
					const suggestion = state.suggestions.find((s) => s.id === id);
					if (suggestion && suggestion.status === "pending") {
						previousStates.set(id, suggestion.status);
						suggestion.status = "rejected";
						affectedIds.push(id);
					}
				}
				if (affectedIds.length > 0) {
					state.undoStack.push({
						type: "batch_reject",
						suggestionIds: affectedIds,
						previousStates,
						timestamp: Date.now(),
					});
				}
				state.selectedSuggestionIds = new Set();
				state.lastSelectedId = null;
			});
			return affectedIds;
		},

		applyHighConfidenceSuggestions: (minConfidence = 85) => {
			const affectedIds: string[] = [];
			const previousStates = new Map<string, SuggestionStatus>();
			set((state) => {
				for (const suggestion of state.suggestions) {
					if (
						suggestion.status === "pending" &&
						suggestion.confidence >= minConfidence
					) {
						previousStates.set(suggestion.id, suggestion.status);
						suggestion.status = "applied";
						affectedIds.push(suggestion.id);
					}
				}
				if (affectedIds.length > 0) {
					state.undoStack.push({
						type: "batch_apply",
						suggestionIds: affectedIds,
						previousStates,
						timestamp: Date.now(),
					});
				}
				state.selectedSuggestionIds = new Set();
				state.lastSelectedId = null;
			});
			return affectedIds;
		},

		// Filter actions
		setConfidenceFilter: (filter) => {
			set((state) => {
				state.confidenceFilter = filter;
			});
		},

		setSectionFilter: (sectionId) => {
			set((state) => {
				state.sectionFilter = sectionId;
			});
		},

		setSourceFileFilter: (fileId) => {
			set((state) => {
				state.sourceFileFilter = fileId;
			});
		},

		clearFilters: () => {
			set((state) => {
				state.confidenceFilter = "all";
				state.sectionFilter = null;
				state.sourceFileFilter = null;
			});
		},

		autoResolveAllConflicts: () => {
			const winnerIds: string[] = [];
			const loserIds: string[] = [];
			let resolvedCount = 0;
			const previousStates = new Map<string, SuggestionStatus>();

			set((state) => {
				// Find all pending suggestions
				const pending = state.suggestions.filter((s) => s.status === "pending");

				// Group by field key to find conflicts
				const fieldGroups = new Map<string, typeof pending>();
				for (const s of pending) {
					const key = `${s.sectionId}:${s.fieldId}`;
					const group = fieldGroups.get(key);
					if (group) {
						group.push(s);
					} else {
						fieldGroups.set(key, [s]);
					}
				}

				// For each conflict group (>1 suggestion), pick highest confidence
				for (const [_fieldKey, group] of fieldGroups) {
					if (group.length <= 1) continue;

					// Find highest confidence suggestion
					const winner = group.reduce((a, b) =>
						a.confidence > b.confidence ? a : b,
					);

					// Apply winner, reject others
					for (const suggestion of group) {
						const storeItem = state.suggestions.find(
							(s) => s.id === suggestion.id,
						);
						if (!storeItem) continue;

						previousStates.set(storeItem.id, storeItem.status);

						if (suggestion.id === winner.id) {
							storeItem.status = "applied";
							winnerIds.push(storeItem.id);
						} else {
							storeItem.status = "rejected";
							loserIds.push(storeItem.id);
						}
						state.selectedSuggestionIds.delete(storeItem.id);
					}
					resolvedCount++;
				}

				// Push undo entry if any conflicts were resolved
				if (winnerIds.length > 0) {
					state.undoStack.push({
						type: "batch_apply",
						suggestionIds: [...previousStates.keys()],
						previousStates,
						timestamp: Date.now(),
					});
				}
			});

			return { resolvedCount, winnerIds, loserIds };
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

		// Undo stack methods
		pushUndo: (entry) => {
			set((state) => {
				state.undoStack.push(entry);
			});
		},

		popUndo: () => {
			let entry: UndoEntry | undefined;
			set((state) => {
				entry = state.undoStack.pop();
			});
			return entry;
		},

		undoBatchOperation: () => {
			const revertedIds: string[] = [];
			set((state) => {
				const entry = state.undoStack.pop();
				if (!entry) return;

				// Check if undo is still valid (within 15 seconds)
				const elapsed = Date.now() - entry.timestamp;
				if (elapsed > 15000) return;

				// Revert each suggestion to its previous state
				for (const [id, previousStatus] of entry.previousStates) {
					const suggestion = state.suggestions.find((s) => s.id === id);
					if (suggestion) {
						suggestion.status = previousStatus;
						revertedIds.push(id);
					}
				}
			});
			return revertedIds;
		},

		reset: () => {
			set(initialState);
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
			const fieldCounts = new Map<string, number>();

			for (const s of pending) {
				const key = `${s.sectionId}:${s.fieldId}`;
				fieldCounts.set(key, (fieldCounts.get(key) ?? 0) + 1);
			}

			const conflictFieldIds = new Set(
				[...fieldCounts.entries()]
					.filter(([, count]) => count > 1)
					.map(([fieldKey]) => fieldKey),
			);

			return pending.filter((s) =>
				conflictFieldIds.has(`${s.sectionId}:${s.fieldId}`),
			);
		}),
	);

// Filtered suggestions selector
export const useFilteredPendingSuggestions = (): AISuggestion[] =>
	useIntakePanelStore(
		useShallow((state) => {
			let filtered = state.suggestions.filter((s) => s.status === "pending");

			// Apply confidence filter
			if (state.confidenceFilter !== "all") {
				filtered = filtered.filter(
					(s) => getConfidenceLevel(s.confidence) === state.confidenceFilter,
				);
			}

			// Apply section filter
			if (state.sectionFilter) {
				filtered = filtered.filter((s) => s.sectionId === state.sectionFilter);
			}

			// Apply source file filter
			if (state.sourceFileFilter) {
				filtered = filtered.filter(
					(s) => s.sourceFileId === state.sourceFileFilter,
				);
			}

			return filtered;
		}),
	);

// Selection count
export const useSelectedCount = () =>
	useIntakePanelStore((state) => state.selectedSuggestionIds.size);

// Check if a suggestion is selected
export const useIsSuggestionSelected = (id: string) =>
	useIntakePanelStore((state) => state.selectedSuggestionIds.has(id));

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

// Get unique sections for filter dropdown
export const useUniqueSections = () =>
	useIntakePanelStore(
		useShallow((state) => {
			const pending = state.suggestions.filter((s) => s.status === "pending");
			const sections = new Map<string, string>();
			for (const s of pending) {
				if (!sections.has(s.sectionId)) {
					sections.set(s.sectionId, s.sectionTitle);
				}
			}
			return Array.from(sections.entries()).map(([id, title]) => ({
				id,
				title,
			}));
		}),
	);

// Get unique source files for filter dropdown
export const useUniqueSourceFiles = () =>
	useIntakePanelStore(
		useShallow((state) => {
			const pending = state.suggestions.filter((s) => s.status === "pending");
			const files = new Map<string, string>();
			for (const s of pending) {
				if (s.sourceFileId && s.evidence?.filename) {
					files.set(s.sourceFileId, s.evidence.filename);
				}
			}
			return Array.from(files.entries()).map(([id, filename]) => ({
				id,
				filename,
			}));
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
