export type MapBlockedReason = "ambiguous" | "no_match";

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
