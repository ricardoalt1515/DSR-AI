/**
 * Proposal Generation Store - Global state for proposal generation progress
 * Allows UI components (navbar, toasts) to show progress anywhere in the app
 */

import { create } from "zustand";

interface ProposalGenerationState {
	isGenerating: boolean;
	progress: number;
	projectId: string | null;
	jobId: string | null;
	startedAt: number | null;
	currentStep: string;
	estimatedTime: string | null;
	isToastExpanded: boolean;
	cancelHandler: (() => void) | null;

	// Actions
	startGeneration: (projectId: string, jobId: string, startedAt?: number) => void;
	updateProgress: (
		progress: number,
		currentStep?: string,
		estimatedTime?: string | null,
	) => void;
	endGeneration: () => void;
	setCancelHandler: (handler: (() => void) | null) => void;
	cancelGeneration: () => void;
	toggleToastExpanded: () => void;
}

export const useProposalGenerationStore = create<ProposalGenerationState>(
	(set, get) => ({
		isGenerating: false,
		progress: 0,
		projectId: null,
		jobId: null,
		startedAt: null,
		currentStep: "",
		estimatedTime: null,
		isToastExpanded: false,
		cancelHandler: null,

		startGeneration: (projectId: string, jobId: string, startedAt?: number) =>
			set({
				isGenerating: true,
				progress: 0,
				projectId,
				jobId,
				startedAt: startedAt ?? Date.now(),
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
				jobId: null,
				startedAt: null,
				currentStep: "",
				estimatedTime: null,
				isToastExpanded: false,
				cancelHandler: null,
			}),

		setCancelHandler: (handler: (() => void) | null) =>
			set({ cancelHandler: handler }),

		cancelGeneration: () => {
			const cancelHandler = get().cancelHandler;
			if (cancelHandler) {
				cancelHandler();
				return;
			}
			get().endGeneration();
		},

		toggleToastExpanded: () =>
			set((state) => ({
				isToastExpanded: !state.isToastExpanded,
			})),
	}),
);
