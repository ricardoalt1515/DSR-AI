import { CalendarClock, FileText, Recycle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Proposal } from "../types";
import { AIConfidenceCard } from "./ai-confidence-card";
import { DecisionRecommendationCard } from "./decision-recommendation-card";
import { QuickActionsCard } from "./quick-actions-card";

interface DecisionSidebarProps {
	proposal: Proposal;
	confidenceLevel: "High" | "Medium" | "Low";
	confidenceProgress: number | undefined;
	onDownloadPDF: (() => void) | undefined;
	onStatusChange: ((newStatus: string) => void) | undefined;
}

/**
 * Decision sidebar for waste upcycling proposal page
 * Shows project status, AI confidence, and quick actions
 */
export function DecisionSidebar({
	proposal,
	confidenceLevel,
	confidenceProgress,
	onDownloadPDF,
	onStatusChange,
}: DecisionSidebarProps) {
	const report = proposal.aiMetadata.proposal as any;
	const businessOpp = report.businessOpportunity;
	const pathwaysCount = businessOpp?.circularEconomyOptions?.length || 0;

	// Extract environmental summary from LCA
	const envSummary =
		report.lca?.co2Reduction?.tons?.[0] ||
		report.lca?.environmentalNotes ||
		"Environmental assessment in progress";

	return (
		<div className="h-full space-y-4">
			{/* Decision Recommendation Card - Always show if businessOpportunity exists */}
			{businessOpp && (
				<DecisionRecommendationCard
					recommendation={businessOpp.overallRecommendation}
					rationale={businessOpp.decisionSummary}
					keyFinancials={
						businessOpp.potentialRevenue.annualPotential[0] ||
						"Revenue analysis pending"
					}
					keyEnvironmentalImpact={envSummary}
				/>
			)}

			<Card>
				<CardHeader className="space-y-3 pb-4">
					<CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
						Report status
					</CardTitle>
					<div className="space-y-1 text-sm">
						<div className="flex items-center gap-2">
							<CalendarClock className="h-4 w-4 text-muted-foreground" />
							<span>{formatDateTime(proposal.createdAt)}</span>
						</div>
						<div className="flex items-center gap-2">
							<FileText className="h-4 w-4 text-muted-foreground" />
							<span>Version {proposal.version}</span>
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-3 text-sm">
					<div className="flex items-center gap-2">
						<Recycle className="h-4 w-4 text-green-600" />
						<span>
							{pathwaysCount > 0
								? `${pathwaysCount} business idea${pathwaysCount > 1 ? "s" : ""} identified`
								: "No business ideas identified"}
						</span>
					</div>
				</CardContent>
			</Card>

			<AIConfidenceCard
				confidenceLevel={confidenceLevel}
				confidenceProgress={confidenceProgress}
			/>

			<QuickActionsCard
				proposal={proposal}
				onDownloadPDF={onDownloadPDF}
				onStatusChange={onStatusChange}
			/>
		</div>
	);
}

/**
 * Format date-time for display
 */
function formatDateTime(value: string): string {
	return new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}
