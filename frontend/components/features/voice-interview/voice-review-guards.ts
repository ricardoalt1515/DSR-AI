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
