import type { WasteUpcyclingReport } from "@/lib/types/proposal";

export type ConfidenceLevel = WasteUpcyclingReport["confidence"];

export const CONFIDENCE_PERCENT_BY_LEVEL: Record<ConfidenceLevel, number> = {
	High: 90,
	Medium: 65,
	Low: 35,
};

export function getConfidenceScore(level?: ConfidenceLevel | null): number {
	if (!level) {
		return CONFIDENCE_PERCENT_BY_LEVEL.Medium;
	}

	return CONFIDENCE_PERCENT_BY_LEVEL[level];
}
