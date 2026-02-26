export type MapBlockedReason = "ambiguous" | "no_match";

export type FinalizeDisabledReason =
	| "finalizing"
	| "no_selection"
	| "no_importable_streams"
	| "no_actionable_streams"
	| "orphans_need_location"
	| null;

/**
 * Returns the reason the finalize button should be disabled, or null if enabled.
 * "no_importable_streams" catches the case where all selected groups contain
 * only rejected/invalid items — finalize would create 0 streams.
 * "orphans_need_location" catches the case where all groups are orphan-only —
 * user must assign locations via the orphan picker first.
 * "no_actionable_streams" catches the edge case where groups exist but contain
 * only location items (no project streams at all) — finalize would 422.
 */
export function getFinalizeDisabledReason(params: {
	groupsCount: number;
	selectedResolvedCount: number;
	importableStreamCount: number;
	finalizing: boolean;
	orphanCount?: number;
	/** Total groups from backend (including location-only / orphan-only) */
	totalBackendGroups?: number;
}): FinalizeDisabledReason {
	const {
		groupsCount,
		selectedResolvedCount,
		importableStreamCount,
		finalizing,
		orphanCount = 0,
		totalBackendGroups = groupsCount,
	} = params;
	if (finalizing) return "finalizing";
	if (groupsCount === 0 && orphanCount > 0) return "orphans_need_location";
	// Groups exist in backend but none are actionable (e.g. location-only groups)
	if (groupsCount === 0 && orphanCount === 0 && totalBackendGroups > 0)
		return "no_actionable_streams";
	if (groupsCount > 0 && selectedResolvedCount === 0) return "no_selection";
	if (groupsCount > 0 && importableStreamCount === 0)
		return "no_importable_streams";
	return null;
}

/** @deprecated Use getFinalizeDisabledReason for richer feedback */
export function shouldDisableFinalizeAction(params: {
	groupsCount: number;
	selectedResolvedCount: number;
	finalizing: boolean;
}): boolean {
	const { groupsCount, selectedResolvedCount, finalizing } = params;
	if (finalizing) {
		return true;
	}
	if (groupsCount === 0) {
		return false;
	}
	return selectedResolvedCount === 0;
}

/**
 * Determines whether the "map" (Use existing match) action should be blocked
 * for a group. Evaluates ALL items in the group, not just the location item.
 *
 * Returns `{ blocked: false }` only when every item with candidates has
 * exactly one (unambiguous) match.
 */
/* ── 409 conflict categorization ── */

/**
 * Categories derived from real backend `detail` strings.
 * Each maps to a user-facing message + description for actionable feedback.
 */
export type VoiceConflictCategory =
	| "run_locked"
	| "duplicate_conflict"
	| "interview_not_found"
	| "location_error"
	| "stale_data"
	| "unknown_conflict";

export interface VoiceConflict {
	category: VoiceConflictCategory;
	userMessage: string;
	description: string;
	/** Whether frontend should auto-refresh items after showing the error */
	shouldRefresh: boolean;
}

/**
 * Pattern table mapping backend 409 `detail` substrings to conflict categories.
 * Order matters: first match wins. Patterns are tested against lowercased detail.
 */
const CONFLICT_PATTERNS: ReadonlyArray<{
	pattern: string;
	category: VoiceConflictCategory;
	userMessage: string;
	description: string;
	shouldRefresh: boolean;
}> = [
	// Run lifecycle locks
	{
		pattern: "run already finalizing",
		category: "run_locked",
		userMessage: "Run is being finalized",
		description: "Another import is in progress. Wait a moment and refresh.",
		shouldRefresh: true,
	},
	{
		pattern: "run is not ready for finalize",
		category: "run_locked",
		userMessage: "Run is no longer editable",
		description: "This run's status changed. Refresh to see current state.",
		shouldRefresh: true,
	},
	{
		pattern: "voice run is not ready for finalize",
		category: "run_locked",
		userMessage: "Run is no longer editable",
		description: "This run's status changed. Refresh to see current state.",
		shouldRefresh: true,
	},
	{
		pattern: "run must be in review_ready status",
		category: "run_locked",
		userMessage: "Run is no longer editable",
		description: "This run's status changed. Refresh to see current state.",
		shouldRefresh: true,
	},
	// Duplicate conflicts (finalize + orphan import)
	{
		pattern: "duplicate detected before finalize",
		category: "duplicate_conflict",
		userMessage: "Duplicate conflict",
		description:
			"A stream or location was already imported. Review has been refreshed.",
		shouldRefresh: true,
	},
	{
		pattern: "already exists in this location",
		category: "duplicate_conflict",
		userMessage: "Duplicate stream",
		description:
			"A stream with this name already exists at the target location. Uncheck it or choose a different location.",
		shouldRefresh: true,
	},
	// Voice interview missing
	{
		pattern: "voice interview not found",
		category: "interview_not_found",
		userMessage: "Interview not found",
		description: "This voice interview may have been deleted. Close and retry.",
		shouldRefresh: false,
	},
	// Location / company errors
	{
		pattern: "location does not belong to the run",
		category: "location_error",
		userMessage: "Location mismatch",
		description:
			"The selected location doesn't belong to this company. Choose a different one.",
		shouldRefresh: false,
	},
	{
		pattern: "target location has no company",
		category: "location_error",
		userMessage: "Location error",
		description:
			"The target location is no longer linked to a company. Choose a different location.",
		shouldRefresh: false,
	},
	{
		pattern: "company not found",
		category: "location_error",
		userMessage: "Company not found",
		description:
			"The associated company no longer exists. Close and contact support.",
		shouldRefresh: false,
	},
	{
		pattern: "location items are not allowed",
		category: "location_error",
		userMessage: "Location error",
		description:
			"Location items can't be created for this run type. Contact support.",
		shouldRefresh: false,
	},
	// Stale data (group/item state changed between client view and server)
	{
		pattern: "unknown group ids",
		category: "stale_data",
		userMessage: "Data out of sync",
		description:
			"Some groups were modified or removed. Review has been refreshed.",
		shouldRefresh: true,
	},
	{
		pattern: "requested groups are unresolved",
		category: "stale_data",
		userMessage: "Groups not ready",
		description:
			"Some groups still have pending items. Review has been refreshed.",
		shouldRefresh: true,
	},
	{
		pattern: "is not a project",
		category: "stale_data",
		userMessage: "Data out of sync",
		description:
			"An item's type changed unexpectedly. Review has been refreshed.",
		shouldRefresh: true,
	},
	{
		pattern: "is not an orphan",
		category: "stale_data",
		userMessage: "Data out of sync",
		description:
			"An item's status changed since you loaded it. Review has been refreshed.",
		shouldRefresh: true,
	},
	{
		pattern: "idempotency key payload mismatch",
		category: "stale_data",
		userMessage: "Request conflict",
		description: "A conflicting import request was detected. Retry the action.",
		shouldRefresh: true,
	},
];

/**
 * Extracts the `detail` string from a backend 409 error.
 * Backend may send `detail` as a string or as `{ message: string, ... }`.
 */
function _extract409Detail(error: unknown): string | null {
	if (typeof error !== "object" || error === null) return null;

	const code =
		"code" in error && typeof (error as { code?: unknown }).code === "string"
			? (error as { code: string }).code
			: null;
	if (code !== "HTTP_409") return null;

	const message =
		error instanceof Error
			? error.message
			: "message" in error &&
					typeof (error as { message?: unknown }).message === "string"
				? (error as { message: string }).message
				: null;
	return message ?? null;
}

/**
 * Categorizes a 409 error into an actionable user-facing conflict.
 * Returns null for non-409 errors.
 */
export function categorizeVoiceConflict(error: unknown): VoiceConflict | null {
	const detail = _extract409Detail(error);
	if (detail === null) return null;

	const lower = detail.toLowerCase();
	for (const entry of CONFLICT_PATTERNS) {
		if (lower.includes(entry.pattern)) {
			return {
				category: entry.category,
				userMessage: entry.userMessage,
				description: entry.description,
				shouldRefresh: entry.shouldRefresh,
			};
		}
	}

	// Fallback: unrecognized 409
	return {
		category: "unknown_conflict",
		userMessage: "Import conflict",
		description: detail,
		shouldRefresh: true,
	};
}

export function shouldBlockMapAction(
	items: Array<{
		duplicateCandidates?: { id: string; name: string }[] | null;
	}>,
): { blocked: boolean; reason: MapBlockedReason | null } {
	const hasAmbiguous = items.some(
		(item) => (item.duplicateCandidates?.length ?? 0) > 1,
	);
	if (hasAmbiguous) {
		return { blocked: true, reason: "ambiguous" };
	}

	const hasAnyCandidate = items.some(
		(item) => (item.duplicateCandidates?.length ?? 0) >= 1,
	);
	if (!hasAnyCandidate) {
		return { blocked: true, reason: "no_match" };
	}

	return { blocked: false, reason: null };
}
