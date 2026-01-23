import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";
import type {
	AISuggestion,
	NotesSaveStatus,
	UnmappedNote,
} from "@/lib/types/intake";

interface IntakePanelState {
	// Notes
	intakeNotes: string;
	notesSaveStatus: NotesSaveStatus;
	notesLastSaved: Date | null;

	// Suggestions
	suggestions: AISuggestion[];
	unmappedNotes: UnmappedNote[];
	isLoadingSuggestions: boolean;
	isProcessingDocuments: boolean;
	processingDocumentsCount: number;

	// Actions
	setIntakeNotes: (notes: string) => void;
	setNotesSaveStatus: (status: NotesSaveStatus) => void;
	setNotesLastSaved: (date: Date | null) => void;
	setSuggestions: (suggestions: AISuggestion[]) => void;
	setUnmappedNotes: (notes: UnmappedNote[]) => void;
	setIsLoadingSuggestions: (loading: boolean) => void;
	setIsProcessingDocuments: (processing: boolean, count?: number) => void;

	// Suggestion actions (optimistic updates)
	applySuggestion: (id: string) => void;
	rejectSuggestion: (id: string) => void;
	revertSuggestion: (id: string) => void;
	resolveConflict: (fieldId: string, selectedId: string) => void;

	// Unmapped notes actions
	mapNoteToField: (
		noteId: string,
		fieldId: string,
		sectionId: string,
		fieldLabel: string,
		sectionTitle: string,
	) => void;
	dismissUnmappedNote: (noteId: string) => void;

	// Reset
	reset: () => void;
}

const initialState = {
	intakeNotes: "",
	notesSaveStatus: "idle" as NotesSaveStatus,
	notesLastSaved: null,
	suggestions: [],
	unmappedNotes: [],
	isLoadingSuggestions: false,
	isProcessingDocuments: false,
	processingDocumentsCount: 0,
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
			});
		},

		setUnmappedNotes: (notes) => {
			set((state) => {
				state.unmappedNotes = notes;
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

		revertSuggestion: (id) => {
			set((state) => {
				const suggestion = state.suggestions.find((s) => s.id === id);
				if (suggestion) {
					suggestion.status = "pending";
				}
			});
		},

		resolveConflict: (fieldId, selectedId) => {
			set((state) => {
				// Find all suggestions for this field
				const conflictingSuggestions = state.suggestions.filter(
					(s) => s.fieldId === fieldId && s.status === "pending",
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

		mapNoteToField: (noteId, fieldId, sectionId, fieldLabel, sectionTitle) => {
			set((state) => {
				const note = state.unmappedNotes.find((n) => n.id === noteId);
				if (!note) return;

				// Create suggestion inside immer draft to ensure immutability
				const newSuggestion: AISuggestion = {
					id: `mapped-${noteId}-${Date.now()}`,
					fieldId,
					fieldLabel,
					sectionId,
					sectionTitle,
					value: note.extractedText,
					confidence: note.confidence,
					status: "pending",
					evidence: {
						fileId: note.sourceFileId,
						filename: note.sourceFile,
						excerpt: note.extractedText,
					},
				};

				// Remove from unmapped notes
				state.unmappedNotes = state.unmappedNotes.filter(
					(n) => n.id !== noteId,
				);
				// Add to suggestions
				state.suggestions.push(newSuggestion);
			});
		},

		dismissUnmappedNote: (noteId) => {
			set((state) => {
				state.unmappedNotes = state.unmappedNotes.filter(
					(n) => n.id !== noteId,
				);
			});
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
	useIntakePanelStore((state) => state.unmappedNotes.length);

export const useConflictingSuggestions = (): AISuggestion[] =>
	useIntakePanelStore(
		useShallow((state) => {
			const pending = state.suggestions.filter((s) => s.status === "pending");
			const fieldCounts = new Map<string, number>();

			for (const s of pending) {
				fieldCounts.set(s.fieldId, (fieldCounts.get(s.fieldId) ?? 0) + 1);
			}

			const conflictFieldIds = new Set(
				[...fieldCounts.entries()]
					.filter(([, count]) => count > 1)
					.map(([fieldId]) => fieldId),
			);

			return pending.filter((s) => conflictFieldIds.has(s.fieldId));
		}),
	);
