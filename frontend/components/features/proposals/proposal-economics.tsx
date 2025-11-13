"use client";

import { AlertCircle, ArrowRight, Car, DollarSign, Leaf, TrendingDown, TrendingUp, TreeDeciduous, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import type { Proposal } from "./types";
import { extractCO2Tons, co2ToCars, co2ToTrees, co2ToCoalKwh, formatNumber } from "./metrics-helpers";

interface ProposalEconomicsProps {
	proposal: Proposal;
}

// Helper component for assumption badges (DRY)
function AssumptionBadge() {
	return (
		<Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-700 dark:text-yellow-400 bg-yellow-50/50 dark:bg-yellow-950/30">
			<AlertCircle className="h-3 w-3 mr-1" />
			Assumption
		</Badge>
	);
}

// Helper to parse revenue strings like "$8.8k/yr" or "$43.8k/yr"
function parseRevenue(revenueStr: string): { value: string; detail: string } | null {
	const match = revenueStr.match(/^([\$\d.,k]+\/yr)/i);
	if (match) {
		return {
			value: match[1],
			detail: revenueStr.replace(match[1], '').trim()
		};
	}
	return { value: revenueStr, detail: '' };
}

export function ProposalEconomics({ proposal }: ProposalEconomicsProps) {
	const report = proposal.aiMetadata.proposal;
	const businessOpp = report.businessOpportunity;
	const lca = report.lca;

	if (!businessOpp || !lca) {
		return (
			<div className="space-y-6">
				<div>
					<h2 className="text-3xl font-bold mb-2">Economics & Environmental Impact</h2>
					<p className="text-muted-foreground">
						Financial analysis and environmental benefits
					</p>
				</div>
				<Card>
					<CardContent className="pt-6">
						<p className="text-sm text-muted-foreground">No economic data available</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Parse annual potential for visual range
	const annualPotentialItems = businessOpp.potentialRevenue.annualPotential;
	const lowCase = annualPotentialItems.find((item: string) => item.toLowerCase().includes('low'));
	const highCase = annualPotentialItems.find((item: string) => item.toLowerCase().includes('high'));
	
	const lowParsed = lowCase ? parseRevenue(lowCase) : null;
	const highParsed = highCase ? parseRevenue(highCase) : null;

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-3xl font-bold mb-2">Financial & Environmental Impact</h2>
				<p className="text-muted-foreground">
					Revenue potential, cost savings, and environmental benefits
				</p>
			</div>

			{/* DSR REVENUE POTENTIAL - VISUAL RANGE */}
			<Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<DollarSign className="h-6 w-6 text-primary" />
						DSR Revenue Potential
					</CardTitle>
					<p className="text-sm text-muted-foreground">
						Projected annual revenue from material resale
					</p>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* VISUAL REVENUE RANGE */}
					{lowParsed && highParsed ? (
						<div className="space-y-4">
							{/* Assumption Badge for Revenue */}
							<div className="flex items-center gap-2">
								<AssumptionBadge />
								<span className="text-xs text-muted-foreground">Based on volume and market rate estimates</span>
							</div>
							{/* Range Bar */}
							<div className="relative p-6 rounded-xl bg-gradient-to-r from-yellow-500/10 via-green-500/10 to-green-600/15 border border-primary/20">
								<div className="flex items-center justify-between">
									{/* Low Case */}
									<div className="text-center flex-1">
										<div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
											Conservative
										</div>
										<div className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">
											{lowParsed.value}
										</div>
										{lowParsed.detail && (
											<div className="text-xs text-muted-foreground mt-2 max-w-[200px] mx-auto">
												{lowParsed.detail}
											</div>
										)}
									</div>
									
									{/* Arrow */}
									<ArrowRight className="h-8 w-8 text-muted-foreground/50 flex-shrink-0 mx-4" />
									
									{/* High Case */}
									<div className="text-center flex-1">
										<div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
											Optimistic
										</div>
										<div className="text-4xl font-bold text-green-600 dark:text-green-400">
											{highParsed.value}
										</div>
										{highParsed.detail && (
											<div className="text-xs text-muted-foreground mt-2 max-w-[200px] mx-auto">
												{highParsed.detail}
											</div>
										)}
									</div>
								</div>
							</div>

							{/* Per-unit pricing */}
							{businessOpp.potentialRevenue.perKg.length > 0 && (
								<div className="flex flex-wrap gap-2">
									{businessOpp.potentialRevenue.perKg.map((price: string, idx: number) => (
										<Badge key={idx} variant="outline" className="text-sm">
											{price}
										</Badge>
									))}
								</div>
							)}
						</div>
					) : (
						/* Fallback if no low/high case */
						<div className="space-y-2">
							{annualPotentialItems.map((item: string, idx: number) => (
								<div key={idx} className="text-2xl font-bold text-primary">
									{item}
								</div>
							))}
						</div>
					)}

					{/* Market Rates & Notes - COLLAPSIBLE */}
					<Accordion type="single" collapsible className="w-full">
						{businessOpp.potentialRevenue.marketRate.length > 0 && (
							<AccordionItem value="market-rates" className="border-none">
								<AccordionTrigger className="text-sm font-medium hover:no-underline py-2">
									Market Rate Details
								</AccordionTrigger>
								<AccordionContent>
									<div className="space-y-2 pt-2">
										{businessOpp.potentialRevenue.marketRate.map((rate: string, idx: number) => (
											<p key={idx} className="text-sm text-muted-foreground leading-relaxed">
												{rate}
											</p>
										))}
									</div>
								</AccordionContent>
							</AccordionItem>
						)}

						{businessOpp.potentialRevenue.notes.length > 0 && (
							<AccordionItem value="notes" className="border-none">
								<AccordionTrigger className="text-sm font-medium hover:no-underline py-2">
									Pricing Assumptions
								</AccordionTrigger>
								<AccordionContent>
									<ul className="space-y-1 pt-2">
										{businessOpp.potentialRevenue.notes.map((note: string, idx: number) => (
											<li key={idx} className="text-sm text-muted-foreground">
												• {note}
											</li>
										))}
									</ul>
								</AccordionContent>
							</AccordionItem>
						)}
					</Accordion>
				</CardContent>
			</Card>

			<Separator />

			{/* LANDFILL REDUCTION - 3 COLUMN GRID */}
			<Card>
				<CardHeader>
					<div className="flex items-start justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								<TrendingDown className="h-5 w-5 text-green-600" />
								Landfill Reduction
							</CardTitle>
							<p className="text-sm text-muted-foreground">
								Waste diversion impact
							</p>
						</div>
						<AssumptionBadge />
					</div>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div className="space-y-2">
							<p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
								Current Baseline
							</p>
							{businessOpp.landfillReduction.before.map((item: string, idx: number) => (
								<p key={idx} className="text-lg font-semibold">{item}</p>
							))}
						</div>
						
						<div className="space-y-2">
							<p className="text-xs uppercase tracking-wide text-green-600 font-medium">
								After DSR Acquisition
							</p>
							{businessOpp.landfillReduction.after.map((item: string, idx: number) => (
								<p key={idx} className="text-lg font-semibold text-green-600">{item}</p>
							))}
						</div>
						
						<div className="space-y-2">
							<p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
								Annual Savings
							</p>
							{businessOpp.landfillReduction.annualSavings.map((item: string, idx: number) => (
								<Badge key={idx} variant="default" className="mb-1 text-sm">
									{item}
								</Badge>
							))}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* GENERATOR COST SAVINGS */}
			<Card className="border-blue-200 dark:border-blue-800">
				<CardHeader>
					<div className="flex items-start justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								<DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
								Generator Cost Savings
							</CardTitle>
							<p className="text-sm text-muted-foreground">
								Negotiation leverage - what the waste generator saves
							</p>
						</div>
						<AssumptionBadge />
					</div>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div className="space-y-2">
							<p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
								Current Costs
							</p>
							{businessOpp.wasteHandlingCostSavings.before.map((item: string, idx: number) => (
								<p key={idx} className="text-lg font-semibold">{item}</p>
							))}
						</div>
						
						<div className="space-y-2">
							<p className="text-xs uppercase tracking-wide text-blue-600 font-medium">
								After DSR
							</p>
							{businessOpp.wasteHandlingCostSavings.after.map((item: string, idx: number) => (
								<p key={idx} className="text-lg font-semibold text-blue-600 dark:text-blue-400">{item}</p>
							))}
						</div>
						
						<div className="space-y-2">
							<p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
								Annual Savings
							</p>
							{businessOpp.wasteHandlingCostSavings.annualSavings.map((item: string, idx: number) => (
								<Badge key={idx} variant="secondary" className="mb-1 text-sm">
									{item}
								</Badge>
							))}
						</div>
					</div>
				</CardContent>
			</Card>

			<Separator />

			{/* CO2 REDUCTION - BIG NUMBERS */}
			<Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
				<CardHeader>
					<div className="flex items-start justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								<Leaf className="h-6 w-6 text-green-600 dark:text-green-400" />
								CO₂ Emissions Avoided
							</CardTitle>
							<p className="text-sm text-muted-foreground">
								Environmental impact calculated using EPA WaRM methodology
							</p>
						</div>
						<AssumptionBadge />
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* BIG CO2 NUMBER */}
					{lca.co2Reduction.tons.length > 0 && (
						<div className="text-center p-6 rounded-xl bg-green-100/50 dark:bg-green-900/20">
							<div className="text-sm uppercase tracking-wide text-green-700 dark:text-green-300 mb-2">
								Annual CO₂ Avoided
							</div>
							{lca.co2Reduction.tons.map((item: string, idx: number) => (
								<div key={idx} className="text-5xl font-bold text-green-600 dark:text-green-400">
									{item}
								</div>
							))}
							{lca.co2Reduction.percent.length > 0 && (
								<div className="mt-4 flex justify-center gap-2">
									{lca.co2Reduction.percent.map((pct: string, idx: number) => (
										<Badge key={idx} className="bg-green-600 text-base px-4 py-1">
											{pct}
										</Badge>
									))}
								</div>
							)}
						</div>
					)}

					{/* CO₂ EQUIVALENTS - STORYTELLING */}
					{(() => {
						const co2Tons = extractCO2Tons(report);
						if (!co2Tons) return null;

						const cars = co2ToCars(co2Tons);
						const trees = co2ToTrees(co2Tons);
						const kwhCoal = co2ToCoalKwh(co2Tons);

						return (
							<div className="space-y-4">
								<div className="text-center">
									<p className="text-sm text-muted-foreground font-medium">
										That's equivalent to:
									</p>
								</div>

								{/* Equivalents Grid */}
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
									{/* Cars off the road */}
									<div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-white dark:bg-green-950/30 border border-green-200 dark:border-green-800">
										<Car className="h-8 w-8 text-green-600 dark:text-green-400" />
										<div className="text-center">
											<div className="text-3xl font-bold text-green-600 dark:text-green-400">
												{formatNumber(cars)}
											</div>
											<p className="text-xs text-muted-foreground mt-1">
												cars off the road
											</p>
										</div>
									</div>

									{/* Trees planted */}
									<div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-white dark:bg-green-950/30 border border-green-200 dark:border-green-800">
										<TreeDeciduous className="h-8 w-8 text-green-600 dark:text-green-400" />
										<div className="text-center">
											<div className="text-3xl font-bold text-green-600 dark:text-green-400">
												{formatNumber(trees)}
											</div>
											<p className="text-xs text-muted-foreground mt-1">
												trees planted
											</p>
										</div>
									</div>

									{/* Coal power avoided */}
									<div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-white dark:bg-green-950/30 border border-green-200 dark:border-green-800">
										<Zap className="h-8 w-8 text-green-600 dark:text-green-400" />
										<div className="text-center">
											<div className="text-3xl font-bold text-green-600 dark:text-green-400">
												{formatNumber(kwhCoal)}
											</div>
											<p className="text-xs text-muted-foreground mt-1">
												kWh coal power
											</p>
										</div>
									</div>
								</div>

								{/* EPA source note */}
								<p className="text-xs text-center text-muted-foreground">
									Based on EPA standard conversion factors
								</p>
							</div>
						);
					})()}

					{/* Methodology - Collapsible */}
					{lca.co2Reduction.method.length > 0 && (
						<Accordion type="single" collapsible className="w-full">
							<AccordionItem value="methodology" className="border-none">
								<AccordionTrigger className="text-sm font-medium hover:no-underline">
									EPA WaRM Calculation Methodology
								</AccordionTrigger>
								<AccordionContent>
									<div className="space-y-2 pt-2">
										{lca.co2Reduction.method.map((method: string, idx: number) => (
											<p key={idx} className="text-sm text-muted-foreground leading-relaxed">
												{method}
											</p>
										))}
									</div>
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					)}
				</CardContent>
			</Card>

			{/* Environmental Value Proposition */}
			{lca.environmentalNotes && (
				<Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Leaf className="h-5 w-5 text-blue-600 dark:text-blue-400" />
							Environmental Value Proposition
						</CardTitle>
						<p className="text-sm text-muted-foreground">
							Sustainability pitch for buyers and generators
						</p>
					</CardHeader>
					<CardContent>
						<p className="text-base leading-relaxed font-medium">
							{lca.environmentalNotes}
						</p>
					</CardContent>
				</Card>
			)}

			{/* Business Risks */}
			{businessOpp.risks && businessOpp.risks.length > 0 && (
				<Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
					<CardHeader>
						<div className="flex items-center gap-2">
							<AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
							<CardTitle className="text-yellow-900 dark:text-yellow-100">
								Business Risks to Monitor
							</CardTitle>
						</div>
						<p className="text-sm text-yellow-700 dark:text-yellow-300">
							Key risks DSR should evaluate before committing
						</p>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{businessOpp.risks.map((risk: string, index: number) => (
								<div
									key={index}
									className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-white p-4 dark:border-yellow-800 dark:bg-yellow-900/20"
								>
									<div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center">
										<span className="text-xs font-bold text-yellow-700 dark:text-yellow-300">
											{index + 1}
										</span>
									</div>
									<span className="text-sm text-yellow-900 dark:text-yellow-100 leading-relaxed">
										{risk}
									</span>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
