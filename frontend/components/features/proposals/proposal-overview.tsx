"use client";

import { MapPin } from "lucide-react";
import dynamic from "next/dynamic";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AIBadge } from "./overview/ai-badge";
import { SectionErrorBoundary } from "./overview/section-error-boundary";
import type { ResourceInsight } from "./overview/top-resources";
import type { Proposal } from "./types";

const HeroDecisionBanner = dynamic(
	() =>
		import("./overview/hero-decision-banner").then(
			(mod) => mod.HeroDecisionBanner,
		),
	{ loading: () => <Skeleton className="h-32 w-full rounded-xl" /> },
);

const TopResources = dynamic(
	() => import("./overview/top-resources").then((mod) => mod.TopResources),
	{
		ssr: false,
		loading: () => <Skeleton className="h-48 w-full rounded-xl" />,
	},
);

const PathwayCards = dynamic(
	() => import("./overview/pathway-cards").then((mod) => mod.PathwayCards),
	{ loading: () => <Skeleton className="h-64 w-full rounded-xl" /> },
);

const FinancialsSnapshot = dynamic(
	() =>
		import("./overview/financials-snapshot").then(
			(mod) => mod.FinancialsSnapshot,
		),
	{ loading: () => <Skeleton className="h-32 w-full rounded-xl" /> },
);

const SafetyAlert = dynamic(
	() => import("./overview/safety-alert").then((mod) => mod.SafetyAlert),
	{ loading: () => <Skeleton className="h-24 w-full rounded-xl" /> },
);

const ActionPlaybook = dynamic(
	() => import("./overview/action-playbook").then((mod) => mod.ActionPlaybook),
	{ loading: () => <Skeleton className="h-48 w-full rounded-xl" /> },
);

const QuickActions = dynamic(
	() => import("./overview/quick-actions").then((mod) => mod.QuickActions),
	{
		ssr: false,
		loading: () => <Skeleton className="h-16 w-full rounded-xl" />,
	},
);

interface ProposalOverviewProps {
	proposal: Proposal;
}

const PHOTO_INSIGHTS_LIMIT = 6;
const CONFIDENCE_SCORES = { High: 92, Medium: 85, Low: 75 } as const;

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === "object";
}

function parsePhotoInsights(clientMetadata: unknown): ResourceInsight[] {
	if (!isRecord(clientMetadata)) return [];

	const attachmentsSummary = clientMetadata.attachmentsSummary;
	if (!isRecord(attachmentsSummary)) return [];

	const photoInsights = attachmentsSummary.photoInsights;
	if (!Array.isArray(photoInsights)) return [];

	const insights: ResourceInsight[] = [];

	for (const item of photoInsights.slice(0, PHOTO_INSIGHTS_LIMIT)) {
		if (!isRecord(item)) continue;

		const analysis = item.analysis;
		if (!isRecord(analysis)) continue;

		const fileId = typeof item.fileId === "string" ? item.fileId : undefined;
		const imageUrl =
			typeof item.imageUrl === "string" ? item.imageUrl : undefined;

		const qualityValue = analysis.qualityGrade;
		const quality =
			qualityValue === "High" ||
			qualityValue === "Medium" ||
			qualityValue === "Low"
				? qualityValue
				: "Medium";

		const lifecycleValue = analysis.lifecycleStatus;
		const lifecycle =
			lifecycleValue === "Like-new" ||
			lifecycleValue === "Good" ||
			lifecycleValue === "Used" ||
			lifecycleValue === "Degraded" ||
			lifecycleValue === "End-of-life"
				? lifecycleValue
				: undefined;

		const confidenceValue = analysis.confidence;
		const confidence =
			confidenceValue === "High"
				? CONFIDENCE_SCORES.High
				: confidenceValue === "Low"
					? CONFIDENCE_SCORES.Low
					: CONFIDENCE_SCORES.Medium;

		insights.push({
			id: String(fileId || analysis.materialType || Math.random()),
			...(fileId === undefined ? {} : { fileId }),
			...(imageUrl === undefined ? {} : { imageUrl }),
			material: String(analysis.materialType || "Unknown"),
			quality,
			...(lifecycle === undefined ? {} : { lifecycle }),
			priceHint: String(analysis.priceBandHint || "TBD"),
			insight: String(analysis.summary || "AI analyzed this material"),
			confidence,
		});
	}

	return insights;
}

export function ProposalOverview({ proposal }: ProposalOverviewProps) {
	const report = proposal.aiMetadata.proposal;

	const resourceInsights = parsePhotoInsights(
		proposal.aiMetadata.transparency.clientMetadata,
	);

	return (
		<div className="space-y-8 animate-in fade-in duration-500">
			{/* HEADER */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<div className="flex items-center gap-3 mb-1">
						<h1 className="text-2xl font-bold tracking-tight">
							{proposal.title}
						</h1>
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
						<p className="text-sm text-muted-foreground">
							{report.material} · {report.volume}
						</p>
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
						offerTerms={report.financials.offerTerms}
						estimatedMargin={report.financials.estimatedMargin}
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
			<QuickActions proposalId={proposal.id} proposalTitle={proposal.title} />

			<Separator className="my-8" />

			{/* FOOTER */}
			<div className="text-sm text-muted-foreground text-right">
				<p>Version {proposal.version}</p>
				<p>Generated {new Date(proposal.createdAt).toLocaleDateString()}</p>
			</div>
		</div>
	);
}
