/**
 * Proposal Feature Components - Simplified and Consolidated
 *
 * Clean, focused components that display data from the backend.
 * No business logic, just presentation.
 */

// Dual report components
export { ExternalReportView } from "./external-report-view";
// Modular section components
export { ProposalAISection } from "./proposal-ai-section";
export { ProposalAssumptions } from "./proposal-assumptions";
export { ProposalEconomics } from "./proposal-economics";
export { ProposalOverview } from "./proposal-overview";
// Main proposal page component
export { ProposalPage, ProposalPage as ProposalDetail } from "./proposal-page";
export { ProposalTechnical } from "./proposal-technical";
export {
	type ReportAudience,
	ReportAudienceToggle,
} from "./report-audience-toggle";

// Types
export type * from "./types";
