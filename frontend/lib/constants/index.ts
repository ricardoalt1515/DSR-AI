/**
 * Centralized constants export
 *
 * ✅ CONSOLIDATED: Main app constants now in /lib/constants/app.ts
 * ✅ SPECIALIZED: Timings and Units remain separate (domain-specific)
 *
 * For sector configuration, import from '@/lib/sectors-config'
 */

// Re-export from consolidated app constants
export * from "./app";

// Timing constants (specialized)
export {
	API_TIMEOUT,
	DEBOUNCE,
	FIELD_EDITOR_DEBOUNCE,
	PASSWORD_CHECK_DEBOUNCE,
	RETRY,
	TIME_MS,
	UI_DELAYS,
} from "./timings";

// Unit constants (specialized, domain knowledge)
export {
	ALL_COMMON_UNITS,
	COMMON_UNITS,
	getUnitsByCategory,
	searchUnits,
	type UnitCategory,
} from "./units";

// Organization route constants
export { isOrgExemptRoute, ORG_EXEMPT_ROUTES, type OrgExemptRoute } from "./org-routes";
