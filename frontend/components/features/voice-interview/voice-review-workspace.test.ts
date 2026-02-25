import { describe, expect, it } from "bun:test";
import type { BulkImportItem } from "@/lib/api/bulk-import";
import { getGroupBadgeLabel } from "./location-group-card";
import { formatConfidenceLabel } from "./stream-card";
import {
	getFinalizeDisabledReason,
	shouldDisableFinalizeAction,
} from "./voice-review-guards";
import {
	applyVoiceGroupResolution,
	getActiveOrphanItems,
	getMapBlockedToast,
	getVoiceConflictMessage,
	isVoiceRunEditable,
	VOICE_RUN_LOCKED_MESSAGE,
} from "./voice-review-workspace";

function buildItem(overrides: Partial<BulkImportItem>): BulkImportItem {
	return {
		id: overrides.id ?? "item-1",
		runId: overrides.runId ?? "run-1",
		itemType: overrides.itemType ?? "project",
		status: overrides.status ?? "pending_review",
		needsReview: overrides.needsReview ?? true,
		confidence: overrides.confidence ?? null,
		extractedData: overrides.extractedData ?? {},
		normalizedData: overrides.normalizedData ?? {},
		userAmendments: overrides.userAmendments ?? null,
		reviewNotes: overrides.reviewNotes ?? null,
		duplicateCandidates: overrides.duplicateCandidates ?? null,
		confirmCreateNew: overrides.confirmCreateNew ?? false,
		parentItemId: overrides.parentItemId ?? null,
		createdLocationId: overrides.createdLocationId ?? null,
		createdProjectId: overrides.createdProjectId ?? null,
		groupId: overrides.groupId ?? "grp-1",
		createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
		updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00.000Z",
	};
}

describe("shouldDisableFinalizeAction", () => {
	it("disables when groups exist and none selected", () => {
		expect(
			shouldDisableFinalizeAction({
				groupsCount: 2,
				selectedResolvedCount: 0,
				finalizing: false,
			}),
		).toBe(true);
	});

	it("allows empty extraction path when groups are zero", () => {
		expect(
			shouldDisableFinalizeAction({
				groupsCount: 0,
				selectedResolvedCount: 0,
				finalizing: false,
			}),
		).toBe(false);
	});
});

describe("getFinalizeDisabledReason", () => {
	it("returns orphans_need_location when no actionable groups but orphans exist", () => {
		expect(
			getFinalizeDisabledReason({
				groupsCount: 0,
				selectedResolvedCount: 0,
				importableStreamCount: 0,
				finalizing: false,
				orphanCount: 3,
			}),
		).toBe("orphans_need_location");
	});

	it("returns null (allows finalize) for empty extraction with no orphans", () => {
		expect(
			getFinalizeDisabledReason({
				groupsCount: 0,
				selectedResolvedCount: 0,
				importableStreamCount: 0,
				finalizing: false,
				orphanCount: 0,
			}),
		).toBeNull();
	});

	it("returns no_importable_streams when groups exist but all items skipped", () => {
		expect(
			getFinalizeDisabledReason({
				groupsCount: 2,
				selectedResolvedCount: 2,
				importableStreamCount: 0,
				finalizing: false,
				orphanCount: 0,
			}),
		).toBe("no_importable_streams");
	});

	it("prioritizes finalizing over orphans_need_location", () => {
		expect(
			getFinalizeDisabledReason({
				groupsCount: 0,
				selectedResolvedCount: 0,
				importableStreamCount: 0,
				finalizing: true,
				orphanCount: 5,
			}),
		).toBe("finalizing");
	});

	it("returns null when groups selected and streams importable", () => {
		expect(
			getFinalizeDisabledReason({
				groupsCount: 2,
				selectedResolvedCount: 1,
				importableStreamCount: 3,
				finalizing: false,
				orphanCount: 2,
			}),
		).toBeNull();
	});

	it("returns no_actionable_streams for location-only groups", () => {
		expect(
			getFinalizeDisabledReason({
				groupsCount: 0,
				selectedResolvedCount: 0,
				importableStreamCount: 0,
				finalizing: false,
				orphanCount: 0,
				totalBackendGroups: 2,
			}),
		).toBe("no_actionable_streams");
	});
});

describe("applyVoiceGroupResolution", () => {
	it("blocks map and skips patchItem when guard returns ambiguous", async () => {
		const calls: string[] = [];
		const toastMessages: string[] = [];

		await applyVoiceGroupResolution({
			items: [
				buildItem({
					id: "loc",
					itemType: "location",
					duplicateCandidates: [
						{ id: "loc-1", name: "Plant A", reason: "name_match" },
						{ id: "loc-2", name: "Plant B", reason: "name_match" },
					],
				}),
			],
			mode: "map",
			patchItem: async (item, action, options) => {
				calls.push(`${item.id}:${action}:${String(options?.confirmCreateNew)}`);
			},
			onMapBlocked: (reason) => {
				toastMessages.push(getMapBlockedToast(reason));
			},
		});

		expect(calls).toHaveLength(0);
		expect(toastMessages).toEqual([
			"Multiple matches found. Choose Create new or resolve manually.",
		]);
	});

	it("allows map and sends accept with confirmCreateNew false", async () => {
		const calls: string[] = [];
		const blockedReasons: string[] = [];

		await applyVoiceGroupResolution({
			items: [
				buildItem({
					id: "loc",
					itemType: "location",
					duplicateCandidates: [
						{ id: "loc-1", name: "Plant A", reason: "name_match" },
					],
				}),
				buildItem({
					id: "proj",
					duplicateCandidates: [
						{ id: "proj-1", name: "Stream A", reason: "name_match" },
					],
				}),
			],
			mode: "map",
			patchItem: async (item, action, options) => {
				calls.push(`${item.id}:${action}:${String(options?.confirmCreateNew)}`);
			},
			onMapBlocked: (reason) => {
				blockedReasons.push(reason);
			},
		});

		expect(blockedReasons).toHaveLength(0);
		expect(calls).toEqual(["loc:accept:false", "proj:accept:false"]);
	});
});

describe("voice run editability guards", () => {
	it("treats review_ready as editable", () => {
		expect(isVoiceRunEditable("review_ready")).toBe(true);
	});

	it("treats completed as non-editable", () => {
		expect(isVoiceRunEditable("completed")).toBe(false);
	});
});

describe("getActiveOrphanItems", () => {
	it("excludes already imported orphan rows", () => {
		const items = [
			buildItem({
				id: "active",
				status: "invalid",
				reviewNotes: "Project row missing location context: row 1",
				createdProjectId: null,
			}),
			buildItem({
				id: "imported",
				status: "invalid",
				reviewNotes: "Project row missing location context: row 2",
				createdProjectId: "project-1",
			}),
		];

		const result = getActiveOrphanItems(items);
		expect(result.map((item) => item.id)).toEqual(["active"]);
	});
});

describe("getVoiceConflictMessage", () => {
	it("maps known 409 run-lock error to human message", () => {
		const error = {
			code: "HTTP_409",
			message: "Run must be in review_ready status",
		};
		expect(getVoiceConflictMessage(error)).toBe(VOICE_RUN_LOCKED_MESSAGE);
	});

	it("returns null for non-conflict errors", () => {
		const error = { code: "HTTP_500", message: "Internal error" };
		expect(getVoiceConflictMessage(error)).toBeNull();
	});
});

describe("getGroupBadgeLabel", () => {
	it("returns 'Review needed' for unresolved group", () => {
		expect(getGroupBadgeLabel(false, false)).toBe("Review needed");
	});

	it("returns 'Ready to import' for resolved non-empty group", () => {
		expect(getGroupBadgeLabel(true, false)).toBe("Ready to import");
	});

	it("returns 'Empty — all skipped' for resolved empty group", () => {
		expect(getGroupBadgeLabel(true, true)).toBe("Empty — all skipped");
	});

	it("returns 'Review needed' even when empty=true but not resolved", () => {
		// edge case: empty flag only meaningful when resolved
		expect(getGroupBadgeLabel(false, true)).toBe("Review needed");
	});
});

describe("formatConfidenceLabel", () => {
	it("includes AI-suggested suffix for high confidence", () => {
		expect(formatConfidenceLabel(0.95)).toBe("95% match · AI-suggested");
	});

	it("includes AI-suggested suffix for low confidence", () => {
		expect(formatConfidenceLabel(0.3)).toBe("30% match · AI-suggested");
	});

	it("rounds to nearest integer", () => {
		expect(formatConfidenceLabel(0.876)).toBe("88% match · AI-suggested");
	});
});

describe("mixed group orphan partitioning", () => {
	/**
	 * Regression: orphan items in mixed groups must appear ONLY in the orphan
	 * picker, not in LocationGroupCard. This test replicates the component's
	 * derivation logic to verify no item appears in both sets.
	 */
	it("orphan items in a mixed group are excluded from card render set", () => {
		const REVIEW_NOTE = "Project row missing location context";
		const items: BulkImportItem[] = [
			buildItem({
				id: "loc-1",
				groupId: "grp-mixed",
				itemType: "location",
				status: "accepted",
			}),
			buildItem({
				id: "valid-proj",
				groupId: "grp-mixed",
				itemType: "project",
				status: "accepted",
			}),
			buildItem({
				id: "orphan-proj",
				groupId: "grp-mixed",
				itemType: "project",
				status: "invalid",
				reviewNotes: `${REVIEW_NOTE}: row 1`,
				createdProjectId: null,
			}),
		];

		// Step 1: derive orphan items (same as component)
		const orphanItems = getActiveOrphanItems(items);
		const orphanItemIds = new Set(orphanItems.map((i) => i.id));

		// Step 2: derive card items for the group (same filter as component render)
		const groupItems = items.filter((i) => i.groupId === "grp-mixed");
		const cardItems = groupItems.filter(
			(i) => i.itemType !== "location" && !orphanItemIds.has(i.id),
		);

		// Verify: sets are disjoint
		expect(orphanItems.map((i) => i.id)).toEqual(["orphan-proj"]);
		expect(cardItems.map((i) => i.id)).toEqual(["valid-proj"]);

		// No item appears in both
		const cardIds = new Set(cardItems.map((i) => i.id));
		for (const orphan of orphanItems) {
			expect(cardIds.has(orphan.id)).toBe(false);
		}
	});

	it("orphan-only group produces zero card items", () => {
		const REVIEW_NOTE = "Project row missing location context";
		const items: BulkImportItem[] = [
			buildItem({
				id: "loc-1",
				groupId: "grp-orphan-only",
				itemType: "location",
				status: "invalid",
			}),
			buildItem({
				id: "orphan-1",
				groupId: "grp-orphan-only",
				itemType: "project",
				status: "invalid",
				reviewNotes: `${REVIEW_NOTE}: row 1`,
				createdProjectId: null,
			}),
			buildItem({
				id: "orphan-2",
				groupId: "grp-orphan-only",
				itemType: "project",
				status: "invalid",
				reviewNotes: `${REVIEW_NOTE}: row 2`,
				createdProjectId: null,
			}),
		];

		const orphanItems = getActiveOrphanItems(items);
		const orphanItemIds = new Set(orphanItems.map((i) => i.id));

		const groupItems = items.filter((i) => i.groupId === "grp-orphan-only");
		const cardItems = groupItems.filter(
			(i) => i.itemType !== "location" && !orphanItemIds.has(i.id),
		);

		// Orphan-only: no items for card, group should be filtered from actionableGroups
		expect(cardItems).toHaveLength(0);
		expect(orphanItems).toHaveLength(2);

		// actionableGroups filter: group has no non-location non-orphan items → excluded
		const hasActionableItem = groupItems.some(
			(i) => i.itemType !== "location" && !orphanItemIds.has(i.id),
		);
		expect(hasActionableItem).toBe(false);
	});
});
