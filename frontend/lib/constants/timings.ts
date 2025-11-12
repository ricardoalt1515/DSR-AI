/**
 * Timing constants for consistent behavior across the application
 *
 * All values are in milliseconds unless otherwise specified.
 */

/**
 * Debounce timings for user input
 * Based on UX best practices and research
 */
export const DEBOUNCE = {
	/** Fast debounce for immediate feedback (e.g., field validation) */
	FAST: 100,

	/** Standard debounce for most text inputs */
	INPUT: 300,

	/** Search debounce to reduce API calls */
	SEARCH: 500,

	/** Auto-save debounce to batch updates */
	AUTO_SAVE: 1000,
} as const;

/**
 * API request timeouts
 * Based on backend SLA and network conditions
 */
export const API_TIMEOUT = {
	/** Standard API requests */
	DEFAULT: 30000, // 30 seconds

	/** File uploads and large operations */
	EXTENDED: 60000, // 60 seconds

	/** Quick health checks */
	QUICK: 5000, // 5 seconds
} as const;

/**
 * Retry configuration
 * Balances reliability with avoiding server hammering
 */
export const RETRY = {
	/** Maximum retry attempts for failed requests */
	MAX_ATTEMPTS: 2,

	/** Initial delay before first retry */
	INITIAL_DELAY: 1000,

	/** Maximum delay between retries */
	MAX_DELAY: 10000,

	/** Exponential backoff factor */
	BACKOFF_FACTOR: 2,
} as const;

/**
 * Password strength check timing
 * Balances responsiveness with computation cost
 */
export const PASSWORD_CHECK_DEBOUNCE = 100; // ms

/**
 * Field editor timing
 * For inline editing UI responsiveness
 */
export const FIELD_EDITOR_DEBOUNCE = 300; // ms

/**
 * UI delays for visual feedback
 */
export const UI_DELAYS = {
	/** Remove success indicators after upload */
	SUCCESS_INDICATOR: 2000,
	/** Toast auto-dismiss duration */
	TOAST: 2000,
	/** Animation transition delay */
	ANIMATION: 300,
} as const;

/**
 * Time conversion constants
 * Avoid magic numbers in date calculations
 */
export const TIME_MS = {
	SECOND: 1000,
	MINUTE: 60 * 1000,
	HOUR: 60 * 60 * 1000,
	DAY: 24 * 60 * 60 * 1000,
} as const;
