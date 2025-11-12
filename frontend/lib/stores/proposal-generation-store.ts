/**
 * Proposal Generation Store - Global state for proposal generation progress
 * Allows UI components (navbar, toasts) to show progress anywhere in the app
 */

import { create } from "zustand";

interface ProposalGenerationState {
	isGenerating: boolean;
	progress: number;
	projectId: string | null;
	currentStep: string;
	estimatedTime: string | null;
	isToastExpanded: boolean;

	// Actions
	startGeneration: (projectId: string) => void;
	updateProgress: (
		progress: number,
		currentStep?: string,
		estimatedTime?: string | null,
	) => void;
	endGeneration: () => void;
	toggleToastExpanded: () => void;
}

export const useProposalGenerationStore = create<ProposalGenerationState>(
	(set) => ({
		isGenerating: false,
		progress: 0,
		projectId: null,
		currentStep: "",
		estimatedTime: null,
		isToastExpanded: false,

		startGeneration: (projectId: string) =>
			set({
				isGenerating: true,
				progress: 0,
				projectId,
				currentStep: "Starting...",
				estimatedTime: null,
				isToastExpanded: false,
			}),

		updateProgress: (
			progress: number,
			currentStep?: string,
			estimatedTime?: string | null,
		) =>
			set((state) => ({
				progress,
				currentStep: currentStep || state.currentStep,
				estimatedTime:
					estimatedTime !== undefined ? estimatedTime : state.estimatedTime,
			})),

		endGeneration: () =>
			set({
				isGenerating: false,
				progress: 0,
				projectId: null,
				currentStep: "",
				estimatedTime: null,
				isToastExpanded: false,
			}),

		toggleToastExpanded: () =>
			set((state) => ({
				isToastExpanded: !state.isToastExpanded,
			})),
	}),
);
