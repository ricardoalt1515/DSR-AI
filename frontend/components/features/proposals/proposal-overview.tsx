"use client";

import { MapPin } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { AIBadge } from "./overview/ai-badge";
import { HeroDecisionBanner } from "./overview/hero-decision-banner";
import { PathwayCards } from "./overview/pathway-cards";
import { TopResources, type ResourceInsight } from "./overview/top-resources";
import { FinancialsSnapshot } from "./overview/financials-snapshot";
import { SafetyAlert } from "./overview/safety-alert";
import { ActionPlaybook } from "./overview/action-playbook";
import { QuickActions } from "./overview/quick-actions";
import { SectionErrorBoundary } from "./overview/section-error-boundary";
import type { Proposal } from "./types";

interface ProposalOverviewProps {
	proposal: Proposal;
}

export function ProposalOverview({ proposal }: ProposalOverviewProps) {
	const report = proposal.aiMetadata.proposal;

	// Extract photo insights from metadata with fileId for real images
	const resourceInsights: ResourceInsight[] = [];
	const clientMetadata = proposal.aiMetadata.transparency.clientMetadata;

	if (clientMetadata && typeof clientMetadata === "object") {
		const attachmentsSummary = (clientMetadata as Record<string, unknown>)
			.attachmentsSummary as { photoInsights?: unknown[] } | undefined;
		const photoInsights = attachmentsSummary?.photoInsights;

		if (Array.isArray(photoInsights)) {
			for (const item of photoInsights.slice(0, 6)) {
				if (!item || typeof item !== "object") continue;
				const typedItem = item as {
					fileId?: string;
					filename?: string;
					imageUrl?: string;
					analysis?: Record<string, unknown>;
				};
				const a = typedItem.analysis;
				if (!a) continue;

				resourceInsights.push({
					id: String(typedItem.fileId || a.materialType || Math.random()),
					fileId: typedItem.fileId ?? undefined,
					imageUrl: typedItem.imageUrl ?? undefined,
					material: String(a.materialType || "Unknown"),
					quality: (a.qualityGrade as "High" | "Medium" | "Low") || "Medium",
					lifecycle: (a.lifecycleStatus as ResourceInsight["lifecycle"]) ?? undefined,
					priceHint: String(a.priceBandHint || "TBD"),
					insight: String(a.summary || "AI analyzed this material"),
					confidence: a.confidence === "High" ? 92 : a.confidence === "Low" ? 75 : 85,
				} as ResourceInsight);
			}
		}
	}

	return (
		<div className="space-y-8 animate-in fade-in duration-500">
			{/* HEADER */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<div className="flex items-center gap-3 mb-1">
						<h1 className="text-2xl font-bold tracking-tight">{proposal.title}</h1>
						<AIBadge />
					</div>
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<span className="font-medium text-foreground">{report.client}</span>
						<span>·</span>
						<span className="flex items-center gap-1">
							<MapPin className="h-3 w-3" /> {report.location}
						</span>
					</div>
				</div>
			</div>

			{/* MATERIAL SUMMARY - Based on questionnaire data */}
			<div className="p-4 rounded-lg bg-muted/50 border border-border">
				<div className="flex items-center justify-between">
					<div>
						<h4 className="font-semibold text-foreground">Material Summary</h4>
						<p className="text-sm text-muted-foreground">{report.material} · {report.volume}</p>
					</div>
					<span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
						From questionnaire
					</span>
				</div>
			</div>

			{/* 1. HERO DECISION BANNER */}
			<SectionErrorBoundary sectionName="Decision Banner">
				<HeroDecisionBanner
					recommendation={report.recommendation}
					headline={report.headline}
					confidence={report.confidence}
				/>
			</SectionErrorBoundary>

			{/* 2. PHOTO EVIDENCE */}
			<SectionErrorBoundary sectionName="Photo Evidence">
				<TopResources insights={resourceInsights} />
			</SectionErrorBoundary>

			{/* 3. PATHWAY CARDS */}
			<SectionErrorBoundary sectionName="Business Pathways">
				<PathwayCards pathways={report.pathways || []} />
			</SectionErrorBoundary>

			{/* 4. FINANCIALS SNAPSHOT */}
			{report.financials && (
				<SectionErrorBoundary sectionName="Financials">
					<FinancialsSnapshot
						currentCost={report.financials.currentCost}
						dsrOffer={report.financials.dsrOffer}
						dsrMargin={report.financials.dsrMargin}
						roiSummary={report.roiSummary}
					/>
				</SectionErrorBoundary>
			)}

			{/* 5. SAFETY ALERT (conditional) */}
			{report.safety && (
				<SectionErrorBoundary sectionName="Safety">
					<SafetyAlert
						hazard={report.safety.hazard}
						warnings={report.safety.warnings}
						storage={report.safety.storage}
					/>
				</SectionErrorBoundary>
			)}

			{/* 6. RISKS & NEXT STEPS */}
			<SectionErrorBoundary sectionName="Action Plan">
				<ActionPlaybook
					recommendations={report.nextSteps || []}
					risks={report.risks || []}
				/>
			</SectionErrorBoundary>

			{/* 7. QUICK ACTIONS */}
			<QuickActions
				proposalId={proposal.id}
				proposalTitle={proposal.title}
			/>

			<Separator className="my-8" />

			{/* FOOTER */}
			<div className="text-sm text-muted-foreground text-right">
				<p>Version {proposal.version}</p>
				<p>Generated {new Date(proposal.createdAt).toLocaleDateString()}</p>
			</div>
		</div>
	);
}
