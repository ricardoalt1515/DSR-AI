import { create } from "zustand";

interface FlyingValueState {
	activeId: string | null;
	targetFieldId: string | null;
	targetSectionId: string | null;
	value: string | null;

	startFlight: (
		suggestionId: string,
		sectionId: string,
		fieldId: string,
		value: string,
	) => void;
	completeFlight: () => void;
}

export const useFlyingValueStore = create<FlyingValueState>((set) => ({
	activeId: null,
	targetFieldId: null,
	targetSectionId: null,
	value: null,

	startFlight: (suggestionId, sectionId, fieldId, value) =>
		set({
			activeId: suggestionId,
			targetSectionId: sectionId,
			targetFieldId: fieldId,
			value,
		}),

	completeFlight: () =>
		set({
			activeId: null,
			targetFieldId: null,
			targetSectionId: null,
			value: null,
		}),
}));
