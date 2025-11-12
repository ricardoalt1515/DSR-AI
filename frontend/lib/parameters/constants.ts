/**
 * PARAMETER CONSTANTS
 *
 * Shared constants for the parameter system.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONSTANTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Core sections that are fixed and appear in all templates.
 * These sections cannot be removed or reordered.
 */
export const CORE_SECTIONS = [
	"project-context",
	"economics-scale",
	"project-constraints",
	"water-quality",
	"field-notes",
] as const;

/**
 * Check if a section is a fixed core section
 */
export function isFixedSection(sectionId: string): boolean {
	return CORE_SECTIONS.includes(sectionId as any);
}
