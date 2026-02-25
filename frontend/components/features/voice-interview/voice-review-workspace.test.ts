import { describe, expect, it } from "bun:test";
import type { BulkImportItem } from "@/lib/api/bulk-import";
import { shouldDisableFinalizeAction } from "./voice-review-guards";
import {
	applyVoiceGroupResolution,
	getMapBlockedToast,
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
