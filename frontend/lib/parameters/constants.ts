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

/** Core section ID type */
export type CoreSectionId = (typeof CORE_SECTIONS)[number];

/**
 * Check if a section is a fixed core section
 */
export function isFixedSection(sectionId: string): sectionId is CoreSectionId {
	return (CORE_SECTIONS as readonly string[]).includes(sectionId);
}
