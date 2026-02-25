import { describe, expect, it } from "bun:test";
import { shouldBlockMapAction } from "./voice-review-guards";

describe("shouldBlockMapAction", () => {
	it("blocks ambiguous location candidates", () => {
		const result = shouldBlockMapAction([
			{
				duplicateCandidates: [
					{ id: "a", name: "A" },
					{ id: "b", name: "B" },
				],
			},
		]);

		expect(result).toEqual({ blocked: true, reason: "ambiguous" });
	});

	it("blocks ambiguous project candidates", () => {
		const result = shouldBlockMapAction([
			{ duplicateCandidates: [{ id: "loc", name: "Plant" }] },
			{
				duplicateCandidates: [
					{ id: "p1", name: "Stream A" },
					{ id: "p2", name: "Stream B" },
				],
			},
		]);

		expect(result).toEqual({ blocked: true, reason: "ambiguous" });
	});

	it("blocks when no item has candidates", () => {
		const result = shouldBlockMapAction([
			{ duplicateCandidates: null },
			{ duplicateCandidates: [] },
		]);

		expect(result).toEqual({ blocked: true, reason: "no_match" });
	});

	it("allows map when at least one unique candidate exists and none ambiguous", () => {
		const result = shouldBlockMapAction([
			{ duplicateCandidates: [{ id: "loc", name: "Plant" }] },
			{ duplicateCandidates: null },
		]);

		expect(result).toEqual({ blocked: false, reason: null });
	});
});
