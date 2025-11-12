/**
 * Utility functions for proposal components
 */

/**
 * Get criticality badge variant for equipment display
 * Used in proposal-technical.tsx
 */
export function getCriticalityBadgeVariant(
	criticality: "high" | "medium" | "low",
): "destructive" | "secondary" | "outline" {
	switch (criticality) {
		case "high":
			return "destructive";
		case "medium":
			return "secondary";
		case "low":
			return "outline";
	}
}
