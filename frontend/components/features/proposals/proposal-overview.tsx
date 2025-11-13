"use client";

import { AlertCircle, CheckCircle2, DollarSign, Leaf, Recycle, Target, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MetricCard } from "@/components/ui/metric-card";
import { cn } from "@/lib/utils";
import type { Proposal } from "./types";
import { extractHighRevenue, extractLandfillDiversion, extractCO2Avoided } from "./metrics-helpers";

interface ProposalOverviewProps {
	proposal: Proposal;
}

export function ProposalOverview({ proposal }: ProposalOverviewProps) {
	const report = proposal.aiMetadata.proposal;
	const businessOpp = report.businessOpportunity;
	const businessIdeas = businessOpp?.circularEconomyOptions?.length || 0;

	// Extract key metrics using shared helpers (DRY)
	const revenueEstimate = extractHighRevenue(report);
	const landfillDiversion = extractLandfillDiversion(report);
	const co2Avoided = extractCO2Avoided(report);

	const getDecisionConfig = () => {
		if (!businessOpp?.overallRecommendation) return null;
		
		switch (businessOpp.overallRecommendation) {
			case "GO":
				return {
					icon: CheckCircle2,
					color: "text-green-600 dark:text-green-400",
					bg: "bg-green-50 dark:bg-green-950/30",
					border: "border-green-500",
					label: "GO"
				};
			case "NO-GO":
				return {
					icon: XCircle,
					color: "text-red-600 dark:text-red-400",
					bg: "bg-red-50 dark:bg-red-950/30",
					border: "border-red-500",
					label: "NO-GO"
				};
			default:
				return {
					icon: AlertCircle,
					color: "text-yellow-600 dark:text-yellow-400",
					bg: "bg-yellow-50 dark:bg-yellow-950/30",
					border: "border-yellow-500",
					label: "INVESTIGATE FURTHER"
				};
		}
	};

	const decisionConfig = getDecisionConfig();

	return (
		<div className="space-y-6">
			{/* DECISION BANNER - Most Important */}
			{decisionConfig && businessOpp && (
				<Card className={cn("border-2", decisionConfig.border, decisionConfig.bg)}>
					<CardContent className="pt-6 pb-6">
						<div className="flex items-start gap-4">
							<decisionConfig.icon className={cn("h-12 w-12 flex-shrink-0", decisionConfig.color)} />
							<div className="flex-1 min-w-0">
								<div className={cn("text-3xl font-bold mb-2", decisionConfig.color)}>
									{decisionConfig.label}
								</div>
								<p className="text-base font-medium leading-relaxed">
									{businessOpp.decisionSummary}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Facility Header - Secondary */}
			<div className="text-center space-y-3">
				<h1 className="text-2xl font-bold">{proposal.title}</h1>
				<p className="text-lg text-muted-foreground">
					{report.clientName} • {report.facilityType} • {report.location}
				</p>
			</div>

			{/* Key Metrics Grid - Business-focused KPIs */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<MetricCard
					icon={DollarSign}
					label="Revenue Potential"
					value={revenueEstimate}
					subtitle="High estimate (annual)"
					variant="success"
				/>

				<MetricCard
					icon={Recycle}
					label="Business Ideas"
					value={businessIdeas}
					subtitle="Circular economy pathways"
					variant="primary"
				/>

				<MetricCard
					icon={Target}
					label="Landfill Diversion"
					value={landfillDiversion}
					subtitle="Waste recovery potential"
					variant="chart-2"
				/>

				<MetricCard
					icon={Leaf}
					label="CO₂ Avoided"
					value={co2Avoided}
					subtitle="Annual emissions reduction"
					variant="chart-4"
				/>
			</div>

			<Separator className="my-6" />

			{/* Primary Waste Types */}
			{report.primaryWasteTypes && report.primaryWasteTypes.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Primary Waste Types</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex flex-wrap gap-2">
							{report.primaryWasteTypes.map((wasteType, idx) => (
								<Badge key={idx} variant="secondary">
									{wasteType}
								</Badge>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Strategic Recommendations */}
			{businessOpp?.strategicRecommendations && businessOpp.strategicRecommendations.length > 0 && (
				<Card className="border-l-4 border-l-primary">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Target className="h-5 w-5 text-primary" />
							Next Steps for DSR
						</CardTitle>
						<p className="text-sm text-muted-foreground mt-1">
							Action items to move this opportunity forward
						</p>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{businessOpp.strategicRecommendations.map((recommendation: string, idx: number) => (
								<div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
									<div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
										<span className="text-sm font-semibold text-primary">{idx + 1}</span>
									</div>
									<span className="text-sm leading-relaxed pt-0.5">{recommendation}</span>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
