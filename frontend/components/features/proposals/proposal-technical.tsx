"use client";

import { AlertTriangle, Building2, Lightbulb, Package, Recycle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
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
	const lines = optionText.split('→').map(l => l.trim());
	
	// Extract revenue ($X-$Y/ton or $Xk/yr)
	const revenueMatch = optionText.match(/\$[\d.,]+[–—-]?\$?[\d.,]*k?(\/ton|\/yr)/i);
	
	// Extract buyer type (after "to" or "with")
	const buyerMatch = optionText.match(/(?:sell to|partner with|sell|to)\s+([^→(]+?)(?:\s*→|\s*\(|$)/i);
	const buyerType = buyerMatch?.[1]?.trim().replace(/^(the|a)\s+/i, '');
	
	// Extract requirement (Requires X, needs X, manual sort, etc.)
	const requirementMatch = optionText.match(/(?:requires?|needs?)\s+([^→]+?)(?:\s*→|$)/i);
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
		description: lines.slice(1).join(' → ') || optionText,
		notes: optionText
	};
	
	// Only add optional properties if they exist (DRY - avoid undefined assignments)
	if (revenueMatch?.[0]) result.revenue = revenueMatch[0];
	if (buyerType && buyerType.length < 40) result.buyerType = buyerType;
	if (requirement && requirement.length < 40) result.requirement = requirement;
	
	return result;
}

export function ProposalTechnical({ proposal }: ProposalTechnicalProps) {
	const report = proposal.aiMetadata.proposal;
	const businessOpp = report.businessOpportunity;
	const circularEconomyOptions = businessOpp?.circularEconomyOptions || [];
	const hazardousConcerns = businessOpp?.hazardousConcerns || [];
	const resourceConsiderations = businessOpp?.resourceConsiderations;

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-3xl font-bold mb-2">Business Opportunities & Material Intelligence</h2>
				<p className="text-muted-foreground">
					Circular economy pathways, buyer intelligence, and safety considerations
				</p>
			</div>

			{/* Waste Materials Overview */}
			{report.primaryWasteTypes && report.primaryWasteTypes.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Package className="h-5 w-5 text-primary" />
							Waste Materials
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<p className="text-sm text-muted-foreground mb-2">Material Types</p>
							<div className="flex flex-wrap gap-2">
								{report.primaryWasteTypes.map((wasteType: string, idx: number) => (
									<Badge key={idx} variant="secondary" className="text-sm px-3 py-1">
										{wasteType}
									</Badge>
								))}
							</div>
						</div>
						
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
							<div>
								<p className="text-xs text-muted-foreground mb-1">Volume</p>
								<p className="text-base font-semibold">{report.dailyMonthlyVolume}</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground mb-1">Current Disposal</p>
								<p className="text-base font-semibold">{report.existingDisposalMethod}</p>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			<Separator />

			{/* Circular Economy Business Ideas - ACCORDION FORMAT */}
			{circularEconomyOptions.length > 0 && (
				<Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Recycle className="h-6 w-6 text-primary" />
							Circular Economy Business Ideas
						</CardTitle>
						<p className="text-sm text-muted-foreground">
							{circularEconomyOptions.length} pathway{circularEconomyOptions.length > 1 ? 's' : ''} identified for waste valorization
						</p>
					</CardHeader>
					<CardContent>
						<Accordion type="single" collapsible className="w-full">
							{circularEconomyOptions.map((option: string, idx: number) => {
								const parsed = parseBusinessOption(option);
								
								return (
									<AccordionItem key={idx} value={`option-${idx}`} className="border-b last:border-b-0">
										<AccordionTrigger className="hover:no-underline py-4">
											<div className="flex items-start gap-3 text-left w-full pr-4">
												<div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
													<span className="text-base font-bold text-primary">{idx + 1}</span>
												</div>
												<div className="flex-1 min-w-0">
													<h4 className="font-semibold text-base leading-tight mb-1">
														{parsed.title}
													</h4>
													<div className="flex flex-wrap gap-2 mt-2">
														{parsed.revenue !== undefined && (
															<Badge variant="default" className="text-xs">
																{parsed.revenue}
															</Badge>
														)}
														{parsed.buyerType !== undefined && (
															<Badge variant="outline" className="text-xs">
																{parsed.buyerType}
															</Badge>
														)}
														{parsed.requirement !== undefined && (
															<Badge variant="secondary" className="text-xs">
																{parsed.requirement}
															</Badge>
														)}
													</div>
												</div>
											</div>
										</AccordionTrigger>
										<AccordionContent>
											<div className="pl-11 pr-4 pb-4 space-y-3">
												<p className="text-sm text-muted-foreground leading-relaxed">
													{parsed.description}
												</p>
											</div>
										</AccordionContent>
									</AccordionItem>
								);
							})}
						</Accordion>
					</CardContent>
				</Card>
			)}

			{/* Material Safety & Handling Concerns */}
			{hazardousConcerns.length > 0 && (
				<Alert variant="destructive">
					<AlertTriangle className="h-5 w-5" />
					<AlertTitle className="text-base font-semibold mb-2">
						Material Safety & Handling Concerns
					</AlertTitle>
					<AlertDescription>
						<ul className="space-y-2 mt-2">
							{hazardousConcerns.map((concern: string, idx: number) => (
								<li key={idx} className="flex items-start gap-2">
									<span className="text-destructive font-bold">•</span>
									<span className="text-sm leading-relaxed">{concern}</span>
								</li>
							))}
						</ul>
					</AlertDescription>
				</Alert>
			)}

			{/* Resource Considerations - Practical Guidance */}
			{resourceConsiderations && (
				<Card className="border-green-200 bg-green-50/30 dark:border-green-800 dark:bg-green-950/20">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Package className="h-6 w-6 text-green-600" />
							Resource Considerations
						</CardTitle>
						<p className="text-sm text-muted-foreground">
							Environmental impact, safety requirements, storage guidance, and market intelligence
						</p>
					</CardHeader>
					<CardContent>
						<Accordion type="multiple" className="w-full">
							{/* Environmental Impact */}
							<AccordionItem value="environmental">
								<AccordionTrigger>
									<div className="flex items-center justify-between w-full pr-4">
										<span>🌱 Environmental Impact</span>
										<span className="text-xs text-muted-foreground hidden md:inline">
											{resourceConsiderations.environmentalImpact.benefitIfDiverted.length} benefits • ESG story
										</span>
									</div>
								</AccordionTrigger>
								<AccordionContent className="space-y-4">
									<div>
										<p className="text-sm font-medium mb-2">Current Situation</p>
										<ul className="space-y-1">
											{resourceConsiderations.environmentalImpact.currentSituation.map((item: string, idx: number) => (
												<li key={idx} className="text-sm text-muted-foreground">• {item}</li>
											))}
										</ul>
									</div>
									<div>
										<p className="text-sm font-medium mb-2">Benefit If Diverted</p>
										<ul className="space-y-1">
											{resourceConsiderations.environmentalImpact.benefitIfDiverted.map((item: string, idx: number) => (
												<li key={idx} className="text-sm text-green-600 dark:text-green-400">• {item}</li>
											))}
										</ul>
									</div>
									<div className="p-3 rounded-lg bg-green-100/50 dark:bg-green-900/20">
										<p className="text-sm font-medium mb-1">ESG Story</p>
										<p className="text-sm text-muted-foreground italic">{resourceConsiderations.environmentalImpact.esgStory}</p>
									</div>
								</AccordionContent>
							</AccordionItem>

							{/* Material Safety */}
							<AccordionItem value="safety">
								<AccordionTrigger>
									<div className="flex items-center justify-between w-full pr-4">
										<span>⚠️ Material Safety & Handling</span>
										<div className="flex items-center gap-2">
											<Badge 
												variant={resourceConsiderations.materialSafety.hazardLevel === "High" ? "destructive" : resourceConsiderations.materialSafety.hazardLevel === "Moderate" ? "secondary" : "outline"}
												className="text-xs"
											>
												{resourceConsiderations.materialSafety.hazardLevel}
											</Badge>
											<span className="text-xs text-muted-foreground hidden md:inline">
												{resourceConsiderations.materialSafety.ppeRequirements.length} PPE items
											</span>
										</div>
									</div>
								</AccordionTrigger>
								<AccordionContent className="space-y-4">
									<div className="flex items-center gap-2">
										<Badge variant={resourceConsiderations.materialSafety.hazardLevel === "High" ? "destructive" : resourceConsiderations.materialSafety.hazardLevel === "Moderate" ? "secondary" : "outline"}>
											{resourceConsiderations.materialSafety.hazardLevel} Hazard Level
										</Badge>
									</div>
									{resourceConsiderations.materialSafety.specificHazards?.length > 0 && (
										<div>
											<p className="text-sm font-medium mb-2">Specific Hazards</p>
											<ul className="space-y-1">
												{resourceConsiderations.materialSafety.specificHazards.map((item: string, idx: number) => (
													<li key={idx} className="text-sm text-muted-foreground">• {item}</li>
												))}
											</ul>
										</div>
									)}
									{resourceConsiderations.materialSafety.ppeRequirements?.length > 0 && (
										<div>
											<p className="text-sm font-medium mb-2">PPE Requirements</p>
											<ul className="space-y-1">
												{resourceConsiderations.materialSafety.ppeRequirements.map((item: string, idx: number) => (
													<li key={idx} className="text-sm text-muted-foreground">• {item}</li>
												))}
											</ul>
										</div>
									)}
								</AccordionContent>
							</AccordionItem>

							{/* Storage & Handling */}
							<AccordionItem value="storage">
								<AccordionTrigger>
									<div className="flex items-center justify-between w-full pr-4">
										<span>📦 Storage & Handling</span>
										<span className="text-xs text-muted-foreground hidden md:inline">
											{resourceConsiderations.storageHandling.degradationRisks.length > 0 ? `${resourceConsiderations.storageHandling.degradationRisks.length} risks • ` : ''}quality impact
										</span>
									</div>
								</AccordionTrigger>
								<AccordionContent className="space-y-4">
									<div>
										<p className="text-sm font-medium mb-2">Storage Requirements</p>
										<ul className="space-y-1">
											{resourceConsiderations.storageHandling.storageRequirements.map((item: string, idx: number) => (
												<li key={idx} className="text-sm text-muted-foreground">• {item}</li>
											))}
										</ul>
									</div>
									{resourceConsiderations.storageHandling.degradationRisks?.length > 0 && (
										<div>
											<p className="text-sm font-medium mb-2">Degradation Risks</p>
											<ul className="space-y-1">
												{resourceConsiderations.storageHandling.degradationRisks.map((item: string, idx: number) => (
													<li key={idx} className="text-sm text-orange-600 dark:text-orange-400">• {item}</li>
												))}
											</ul>
										</div>
									)}
									{resourceConsiderations.storageHandling.qualityPriceImpact?.length > 0 && (
										<div>
											<p className="text-sm font-medium mb-2">Quality vs Price Impact</p>
											<ul className="space-y-1">
												{resourceConsiderations.storageHandling.qualityPriceImpact.map((item: string, idx: number) => (
													<li key={idx} className="text-sm text-muted-foreground">• {item}</li>
												))}
											</ul>
										</div>
									)}
								</AccordionContent>
							</AccordionItem>

							{/* Market Intelligence */}
							<AccordionItem value="market">
								<AccordionTrigger>
									<div className="flex items-center justify-between w-full pr-4">
										<span>💼 Market Intelligence</span>
										<div className="flex items-center gap-2">
											<span className="text-xs text-muted-foreground hidden md:inline">
												{resourceConsiderations.marketIntelligence.buyerTypes.length} buyer types • {resourceConsiderations.marketIntelligence.pricingFactors.length} pricing factors
											</span>
										</div>
									</div>
								</AccordionTrigger>
								<AccordionContent className="space-y-4">
									<div>
										<p className="text-sm font-medium mb-2">Buyer Types</p>
										<div className="flex flex-wrap gap-2">
											{resourceConsiderations.marketIntelligence.buyerTypes.map((type: string, idx: number) => (
												<Badge key={idx} variant="secondary">{type}</Badge>
											))}
										</div>
									</div>
									{resourceConsiderations.marketIntelligence.typicalRequirements?.length > 0 && (
										<div>
											<p className="text-sm font-medium mb-2">Typical Requirements</p>
											<ul className="space-y-1">
												{resourceConsiderations.marketIntelligence.typicalRequirements.map((item: string, idx: number) => (
													<li key={idx} className="text-sm text-muted-foreground">• {item}</li>
												))}
											</ul>
										</div>
									)}
									{resourceConsiderations.marketIntelligence.pricingFactors?.length > 0 && (
										<div>
											<p className="text-sm font-medium mb-2">Pricing Factors</p>
											<ul className="space-y-1">
												{resourceConsiderations.marketIntelligence.pricingFactors.map((item: string, idx: number) => (
													<li key={idx} className="text-sm text-muted-foreground">• {item}</li>
												))}
											</ul>
										</div>
									)}
								</AccordionContent>
							</AccordionItem>
						</Accordion>
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
								<div key={idx} className="flex items-start gap-3 p-4 rounded-lg bg-blue-100/50 dark:bg-blue-900/20">
									<Lightbulb className="h-5 w-5 mt-0.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
									<p className="text-sm leading-relaxed">{insight}</p>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
