"use client";

import {
	AlertCircle,
	DollarSign,
	Lightbulb,
	Package,
	Recycle,
	Target,
} from "lucide-react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CircularGauge } from "@/components/ui/circular-gauge";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import { MetricCard } from "@/components/ui/metric-card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompactDecisionHeader } from "./compact-decision-header";
import {
	extractCO2Avoided,
	extractHighRevenue,
	extractLandfillDiversion,
} from "./metrics-helpers";
import type { Proposal } from "./types";

interface ProposalTechnicalProps {
	proposal: Proposal;
}

// Helper to parse business option text into structured data
function parseBusinessOption(optionText: string): {
	title: string;
	description: string;
	revenue?: string;
	buyerType?: string;
	requirement?: string;
	notes: string;
} {
	// Extract key information from AI text
	const lines = optionText.split("→").map((l) => l.trim());

	// Extract revenue ($X-$Y/ton or $Xk/yr)
	const revenueMatch = optionText.match(
		/\$[\d.,]+[–—-]?\$?[\d.,]*k?(\/ton|\/yr)/i,
	);

	// Extract buyer type (after "to" or "with")
	const buyerMatch = optionText.match(
		/(?:sell to|partner with|sell|to)\s+([^→(]+?)(?:\s*→|\s*\(|$)/i,
	);
	const buyerType = buyerMatch?.[1]?.trim().replace(/^(the|a)\s+/i, "");

	// Extract requirement (Requires X, needs X, manual sort, etc.)
	const requirementMatch = optionText.match(
		/(?:requires?|needs?)\s+([^→]+?)(?:\s*→|$)/i,
	);
	const requirement = requirementMatch?.[1]?.trim();

	const result: {
		title: string;
		description: string;
		revenue?: string;
		buyerType?: string;
		requirement?: string;
		notes: string;
	} = {
		title: lines[0] || optionText.substring(0, 80),
		description: lines.slice(1).join(" → ") || optionText,
		notes: optionText,
	};

	// Only add optional properties if they exist (DRY - avoid undefined assignments)
	if (revenueMatch?.[0]) result.revenue = revenueMatch[0];
	if (buyerType && buyerType.length < 40) result.buyerType = buyerType;
	if (requirement && requirement.length < 40) result.requirement = requirement;

	return result;
}

export function ProposalTechnical({ proposal }: ProposalTechnicalProps) {
	const report = proposal.aiMetadata.proposal as any;
	const businessOpp = report.businessOpportunity;
	const circularEconomyOptions = businessOpp?.circularEconomyOptions || [];
	const resourceConsiderations = businessOpp?.resourceConsiderations;

	// Use shared helpers for metric extraction (DRY)
	const revenueEstimate = extractHighRevenue(report);
	const landfillDiversion = extractLandfillDiversion(report);
	const co2Avoided = extractCO2Avoided(report);

	return (
		<div className="space-y-6">
			{/* LEVEL 1: DECISION CONTEXT */}
			<CompactDecisionHeader
				recommendation={
					businessOpp?.overallRecommendation || "INVESTIGATE FURTHER"
				}
				keyFinancials={revenueEstimate}
				keyEnvironmentalImpact={co2Avoided}
				riskCount={businessOpp?.risks?.length || 0}
			/>

			{/* SAFETY ALERT - Show if Moderate or High Hazard */}
			{resourceConsiderations?.materialHandling?.hazardLevel &&
				(resourceConsiderations.materialHandling.hazardLevel === "Moderate" ||
					resourceConsiderations.materialHandling.hazardLevel === "High") && (
					<Alert
						variant={
							resourceConsiderations.materialHandling.hazardLevel === "High"
								? "destructive"
								: "default"
						}
						className={
							resourceConsiderations.materialHandling.hazardLevel === "High"
								? "border-red-500 bg-red-50 dark:bg-red-950"
								: "border-yellow-500 bg-yellow-50 dark:bg-yellow-950"
						}
					>
						<AlertCircle className="h-4 w-4" />
						<AlertTitle className="font-bold">
							{resourceConsiderations.materialHandling.hazardLevel} Hazard
							Material
						</AlertTitle>
						<AlertDescription>
							<span className="font-medium">PPE Required:</span>{" "}
							{resourceConsiderations.materialHandling.ppeRequirements
								.slice(0, 2)
								.join(", ")}
							{resourceConsiderations.materialHandling.ppeRequirements.length >
								2 &&
								` + ${resourceConsiderations.materialHandling.ppeRequirements.length - 2} more`}
						</AlertDescription>
					</Alert>
				)}

			{/* HERO METRICS SECTION */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
					value={circularEconomyOptions.length}
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
			</div>

			{/* LEVEL 2: CIRCULAR ECONOMY BUSINESS IDEAS - EXPANDED CARDS */}
			{circularEconomyOptions.length > 0 && (
				<div className="space-y-4">
					<div>
						<h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
							<Recycle className="h-6 w-6 text-primary" />
							Circular Economy Business Ideas
						</h3>
						<p className="text-muted-foreground">
							{circularEconomyOptions.length} pathway
							{circularEconomyOptions.length > 1 ? "s" : ""} identified for
							waste valorization
						</p>
					</div>

					{circularEconomyOptions.map((option: string, idx: number) => {
						const parsed = parseBusinessOption(option);

						return (
							<Card
								key={idx}
								className="border-l-4 border-l-green-500 hover:shadow-lg transition-all duration-300"
							>
								<CardHeader>
									<div className="flex items-center justify-between gap-4">
										<div className="flex items-center gap-3 flex-1 min-w-0">
											<Badge className="h-8 w-8 flex items-center justify-center text-sm font-bold">
												{idx + 1}
											</Badge>
											<CardTitle className="text-lg leading-tight">
												{parsed.title}
											</CardTitle>
										</div>
										{parsed.revenue && (
											<div className="text-2xl font-bold text-green-600 dark:text-green-400 flex-shrink-0">
												{parsed.revenue}
											</div>
										)}
									</div>
								</CardHeader>
								<CardContent className="space-y-3">
									<p className="text-sm text-muted-foreground leading-relaxed">
										{parsed.description}
									</p>
									<div className="flex flex-wrap gap-2">
										{parsed.buyerType && (
											<Badge variant="outline" className="text-xs">
												🏭 {parsed.buyerType}
											</Badge>
										)}
										{parsed.requirement && (
											<Badge variant="secondary" className="text-xs">
												📋 {parsed.requirement}
											</Badge>
										)}
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}

			{/* Strategic Recommendations */}
			{businessOpp?.strategicRecommendations &&
				businessOpp.strategicRecommendations.length > 0 && (
					<Card className="border-l-4 border-l-primary">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Target className="h-5 w-5 text-primary" />
								Next Steps for DSR
							</CardTitle>
							<p className="text-sm text-muted-foreground">
								Action items to move this opportunity forward
							</p>
						</CardHeader>
						<CardContent>
							<ol className="space-y-3">
								{businessOpp.strategicRecommendations.map(
									(rec: string, idx: number) => (
										<li key={idx} className="flex items-start gap-3">
											<span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
												{idx + 1}
											</span>
											<p className="text-sm leading-relaxed pt-0.5">{rec}</p>
										</li>
									),
								)}
							</ol>
						</CardContent>
					</Card>
				)}

			{/* Business Risks */}
			{businessOpp?.risks && businessOpp.risks.length > 0 && (
				<Card className="border-l-4 border-l-yellow-500 bg-yellow-50/30 dark:bg-yellow-950/20">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<AlertCircle className="h-5 w-5 text-yellow-600" />
							Business Risks to Monitor
						</CardTitle>
						<p className="text-sm text-muted-foreground">
							Key risks DSR should evaluate before committing CapEx
						</p>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							{businessOpp.risks.map((risk: string, idx: number) => (
								<div
									key={idx}
									className="flex items-start gap-2 p-3 rounded-lg bg-yellow-100/50 dark:bg-yellow-900/20"
								>
									<span className="flex-shrink-0 w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 flex items-center justify-center text-xs font-bold">
										{idx + 1}
									</span>
									<p className="text-sm text-yellow-800 dark:text-yellow-200">
										{risk}
									</p>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			<Separator />

			{/* Resource Considerations - Practical Guidance */}
			{resourceConsiderations && (
				<Card className="border-green-200 bg-green-50/30 dark:border-green-800 dark:bg-green-950/20">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Package className="h-6 w-6 text-green-600" />
							Resource Considerations
						</CardTitle>
						<p className="text-sm text-muted-foreground">
							Environmental impact, safety requirements, storage guidance, and
							market intelligence
						</p>
					</CardHeader>
					<CardContent>
						<Tabs defaultValue="environmental" className="w-full">
							<TabsList className="grid w-full grid-cols-4">
								<TabsTrigger value="environmental">
									🌱 Environmental
								</TabsTrigger>
								<TabsTrigger value="safety">⚠️ Safety</TabsTrigger>
								<TabsTrigger value="storage">📦 Storage</TabsTrigger>
								<TabsTrigger value="market">💼 Market</TabsTrigger>
							</TabsList>

							{/* Environmental Impact Tab */}
							<TabsContent value="environmental" className="space-y-4 mt-4">
								<div className="flex flex-col md:flex-row items-start gap-6">
									<div className="flex-shrink-0">
										<CircularGauge
											value={85}
											size="lg"
											color="hsl(142, 76%, 36%)"
											label="CO₂ Avoided"
										/>
									</div>
									<div className="flex-1 space-y-4 w-full">
										<div>
											<p className="text-sm font-medium mb-2">
												Current Situation
											</p>
											<p className="text-sm text-muted-foreground">
												{
													resourceConsiderations.environmentalImpact
														.currentSituation
												}
											</p>
										</div>
										<div>
											<p className="text-sm font-medium mb-2">
												Benefit If Diverted
											</p>
											<p className="text-sm text-green-600 dark:text-green-400">
												{
													resourceConsiderations.environmentalImpact
														.benefitIfDiverted
												}
											</p>
										</div>
									</div>
								</div>
								<div className="p-3 rounded-lg bg-green-100/50 dark:bg-green-900/20">
									<p className="text-sm font-medium mb-1">ESG Story</p>
									<p className="text-sm text-muted-foreground italic">
										{resourceConsiderations.environmentalImpact.esgStory}
									</p>
								</div>
							</TabsContent>

							{/* Material Safety Tab */}
							<TabsContent value="safety" className="space-y-4 mt-4">
								<div className="flex items-center gap-2">
									<Badge
										variant={
											resourceConsiderations.materialHandling.hazardLevel ===
											"High"
												? "destructive"
												: resourceConsiderations.materialHandling
															.hazardLevel === "Moderate"
													? "secondary"
													: "outline"
										}
									>
										{resourceConsiderations.materialHandling.hazardLevel} Hazard
										Level
									</Badge>
									<span className="text-xs text-muted-foreground">
										{
											resourceConsiderations.materialHandling.ppeRequirements
												.length
										}{" "}
										PPE items required
									</span>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{resourceConsiderations.materialHandling.specificHazards
										?.length > 0 && (
										<div>
											<p className="text-sm font-medium mb-2">
												Specific Hazards
											</p>
											<ul className="space-y-1">
												{resourceConsiderations.materialHandling.specificHazards.map(
													(item: string, idx: number) => (
														<li
															key={idx}
															className="text-sm text-muted-foreground"
														>
															• {item}
														</li>
													),
												)}
											</ul>
										</div>
									)}
									{resourceConsiderations.materialHandling.ppeRequirements
										?.length > 0 && (
										<div>
											<p className="text-sm font-medium mb-2">
												PPE Requirements
											</p>
											<ul className="space-y-1">
												{resourceConsiderations.materialHandling.ppeRequirements.map(
													(item: string, idx: number) => (
														<li
															key={idx}
															className="text-sm text-muted-foreground"
														>
															• {item}
														</li>
													),
												)}
											</ul>
										</div>
									)}
								</div>
								{resourceConsiderations.materialHandling.regulatoryNotes
									?.length > 0 && (
									<div>
										<p className="text-sm font-medium mb-2">Regulatory Notes</p>
										<ul className="space-y-1">
											{resourceConsiderations.materialHandling.regulatoryNotes.map(
												(item: string, idx: number) => (
													<li
														key={idx}
														className="text-sm text-orange-600 dark:text-orange-400"
													>
														• {item}
													</li>
												),
											)}
										</ul>
									</div>
								)}
							</TabsContent>

							{/* Storage & Handling Tab */}
							<TabsContent value="storage" className="space-y-4 mt-4">
								<div>
									<p className="text-sm font-medium mb-2">
										Storage Requirements
									</p>
									<ul className="space-y-1">
										{resourceConsiderations.materialHandling.storageRequirements.map(
											(item: string, idx: number) => (
												<li key={idx} className="text-sm text-muted-foreground">
													• {item}
												</li>
											),
										)}
									</ul>
								</div>
								{resourceConsiderations.materialHandling.degradationRisks
									?.length > 0 && (
									<div>
										<p className="text-sm font-medium mb-2">
											Degradation Risks
										</p>
										<ul className="space-y-1">
											{resourceConsiderations.materialHandling.degradationRisks.map(
												(item: string, idx: number) => (
													<li
														key={idx}
														className="text-sm text-orange-600 dark:text-orange-400"
													>
														• {item}
													</li>
												),
											)}
										</ul>
									</div>
								)}
								{resourceConsiderations.materialHandling.qualityPriceImpact
									?.length > 0 && (
									<div>
										<p className="text-sm font-medium mb-2">
											Quality vs Price Impact
										</p>
										<ul className="space-y-1">
											{resourceConsiderations.materialHandling.qualityPriceImpact.map(
												(item: string, idx: number) => (
													<li
														key={idx}
														className="text-sm text-muted-foreground"
													>
														• {item}
													</li>
												),
											)}
										</ul>
									</div>
								)}
							</TabsContent>

							{/* Market Intelligence Tab */}
							<TabsContent value="market" className="space-y-4 mt-4">
								<div>
									<p className="text-sm font-medium mb-2">Buyer Types</p>
									<div className="flex flex-wrap gap-2">
										{resourceConsiderations.marketIntelligence.buyerTypes.map(
											(type: string, idx: number) => (
												<HoverCard key={idx}>
													<HoverCardTrigger asChild>
														<Badge variant="secondary" className="cursor-help">
															{type}
														</Badge>
													</HoverCardTrigger>
													<HoverCardContent className="w-80">
														<div className="space-y-2">
															<h4 className="text-sm font-semibold">{type}</h4>
															{resourceConsiderations.marketIntelligence
																.typicalRequirements?.length > 0 && (
																<div>
																	<p className="text-xs font-medium text-muted-foreground mb-1">
																		Typical Requirements:
																	</p>
																	<ul className="text-xs text-muted-foreground space-y-0.5">
																		{resourceConsiderations.marketIntelligence.typicalRequirements
																			.slice(0, 3)
																			.map((req: string, i: number) => (
																				<li key={i}>• {req}</li>
																			))}
																	</ul>
																</div>
															)}
															{resourceConsiderations.marketIntelligence
																.pricingFactors?.length > 0 && (
																<div>
																	<p className="text-xs font-medium text-muted-foreground mb-1">
																		Pricing Factors:
																	</p>
																	<ul className="text-xs text-muted-foreground space-y-0.5">
																		{resourceConsiderations.marketIntelligence.pricingFactors
																			.slice(0, 3)
																			.map((factor: string, i: number) => (
																				<li key={i}>• {factor}</li>
																			))}
																	</ul>
																</div>
															)}
														</div>
													</HoverCardContent>
												</HoverCard>
											),
										)}
									</div>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{resourceConsiderations.marketIntelligence.typicalRequirements
										?.length > 0 && (
										<div>
											<p className="text-sm font-medium mb-2">
												Typical Requirements
											</p>
											<ul className="space-y-1">
												{resourceConsiderations.marketIntelligence.typicalRequirements.map(
													(item: string, idx: number) => (
														<li
															key={idx}
															className="text-sm text-muted-foreground"
														>
															• {item}
														</li>
													),
												)}
											</ul>
										</div>
									)}
									{resourceConsiderations.marketIntelligence.pricingFactors
										?.length > 0 && (
										<div>
											<p className="text-sm font-medium mb-2">
												Pricing Factors
											</p>
											<ul className="space-y-1">
												{resourceConsiderations.marketIntelligence.pricingFactors.map(
													(item: string, idx: number) => (
														<li
															key={idx}
															className="text-sm text-muted-foreground"
														>
															• {item}
														</li>
													),
												)}
											</ul>
										</div>
									)}
								</div>
							</TabsContent>
						</Tabs>
					</CardContent>
				</Card>
			)}

			<Separator />

			{/* AI Creative Insights */}
			{report.aiInsights && report.aiInsights.length > 0 && (
				<Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Lightbulb className="h-6 w-6 text-blue-600 dark:text-blue-400" />
							AI Creative Insights
						</CardTitle>
						<p className="text-sm text-muted-foreground">
							Non-obvious opportunities and strategic observations
						</p>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{report.aiInsights.map((insight: string, idx: number) => (
								<div
									key={idx}
									className="flex items-start gap-3 p-4 rounded-lg bg-blue-100/50 dark:bg-blue-900/20"
								>
									<Lightbulb className="h-5 w-5 mt-0.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
									<p className="text-sm leading-relaxed">{insight}</p>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* LEVEL 4: WASTE BASELINE (Background Data - Moved to Bottom) */}
			{report.primaryWasteTypes && report.primaryWasteTypes.length > 0 && (
				<Card className="border-muted">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<Package className="h-5 w-5 text-muted-foreground" />
							Waste Baseline
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
							<div>
								<p className="text-xs text-muted-foreground mb-1">
									Material Types
								</p>
								<div className="flex flex-wrap gap-1">
									{report.primaryWasteTypes.map(
										(wasteType: string, idx: number) => (
											<Badge key={idx} variant="secondary" className="text-xs">
												{wasteType}
											</Badge>
										),
									)}
								</div>
							</div>
							<div>
								<p className="text-xs text-muted-foreground mb-1">Volume</p>
								<p className="font-medium">{report.dailyMonthlyVolume}</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground mb-1">
									Current Disposal
								</p>
								<p className="font-medium">{report.existingDisposalMethod}</p>
							</div>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
