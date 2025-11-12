/**
 * Proposal Generation Persistence - Save/restore generation state
 * Allows recovery if user reloads page during generation
 */

// Constants
const STORAGE_KEY = "active-proposal-generation";
const MAX_RECOVERY_AGE_MS = 3600000; // 1 hour

interface PersistedGenerationState {
	projectId: string;
	jobId: string;
	startTime: number;
	lastProgress: number;
	proposalType: string;
}

/**
 * Save current generation state to localStorage
 */
export function saveGenerationState(state: PersistedGenerationState): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch (error) {
		// Fail silently - localStorage might be disabled
		console.warn("Failed to save generation state:", error);
	}
}

/**
 * Load saved generation state from localStorage
 * Returns null if no valid state exists or if too old
 */
export function loadGenerationState(): PersistedGenerationState | null {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (!saved) return null;

		const state = JSON.parse(saved) as PersistedGenerationState;

		// Check if state is too old (stale)
		const age = Date.now() - state.startTime;
		if (age > MAX_RECOVERY_AGE_MS) {
			clearGenerationState();
			return null;
		}

		return state;
	} catch (error) {
		console.warn("Failed to load generation state:", error);
		return null;
	}
}

/**
 * Clear saved generation state
 */
export function clearGenerationState(): void {
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch (error) {
		console.warn("Failed to clear generation state:", error);
	}
}

/**
 * Update progress in saved state
 */
export function updatePersistedProgress(progress: number): void {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (!saved) return;

		const state = JSON.parse(saved) as PersistedGenerationState;
		state.lastProgress = progress;
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch (error) {
		console.warn("Failed to update persisted progress:", error);
	}
}
