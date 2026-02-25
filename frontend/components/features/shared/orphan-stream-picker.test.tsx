import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { BulkImportItem } from "@/lib/api/bulk-import";
import { OrphanStreamPicker } from "./orphan-stream-picker";

function buildItem(overrides: Partial<BulkImportItem>): BulkImportItem {
	return {
		id: overrides.id ?? "item-1",
		runId: overrides.runId ?? "run-1",
		itemType: overrides.itemType ?? "project",
		status: overrides.status ?? "invalid",
		needsReview: overrides.needsReview ?? false,
		confidence: overrides.confidence ?? null,
		extractedData: overrides.extractedData ?? {},
		normalizedData: overrides.normalizedData ?? {
			name: "Stream A",
			category: "paper",
		},
		userAmendments: overrides.userAmendments ?? null,
		reviewNotes:
			overrides.reviewNotes ?? "Project row missing location context: row 1",
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

describe("OrphanStreamPicker markup", () => {
	it("does not render nested button elements in stream rows", () => {
		const html = renderToStaticMarkup(
			<OrphanStreamPicker
				orphanItems={[buildItem({ id: "orphan-1" })]}
				sourceLabel="Voice interview"
				locations={[{ id: "loc-1", name: "Plant" }]}
				initialSelectedLocationId="loc-1"
				onAssign={async () => {}}
			/>,
		);

		expect(html.includes("<button")).toBe(true);
		expect(html.includes("<button><button")).toBe(false);
		expect(html.includes('<button type="button" class="flex w-full')).toBe(
			false,
		);
	});
});
