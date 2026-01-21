"use client";

import { motion } from "framer-motion";
import {
	AlertTriangle,
	ChevronDown,
	DollarSign,
	HelpCircle,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface EconomicsDeepDiveProps {
	profitabilityBand?: "High" | "Medium" | "Low" | "Unknown";
	profitabilitySummary?: string;
	costBreakdown?: string[];
	scenarioSummary?: string[];
	assumptions?: string[];
	dataGaps?: string[];
}

const PROFITABILITY_CONFIG = {
	High: { bg: "bg-success/10", text: "text-success", icon: TrendingUp },
	Medium: { bg: "bg-warning/10", text: "text-warning", icon: DollarSign },
	Low: {
		bg: "bg-destructive/10",
		text: "text-destructive",
		icon: TrendingDown,
	},
	Unknown: { bg: "bg-muted", text: "text-muted-foreground", icon: HelpCircle },
} as const;

export function EconomicsDeepDive({
	profitabilityBand = "Unknown",
	profitabilitySummary,
	costBreakdown = [],
	scenarioSummary = [],
	assumptions = [],
	dataGaps = [],
}: EconomicsDeepDiveProps) {
	const [assumptionsOpen, setAssumptionsOpen] = useState(false);
	const withStableKeys = (items: string[]) => {
		const counts = new Map<string, number>();
		return items.map((item) => {
			const count = counts.get(item) ?? 0;
			counts.set(item, count + 1);
			return {
				item,
				key: count === 0 ? item : `${item}-${count}`,
			};
		});
	};

	if (
		!profitabilitySummary &&
		costBreakdown.length === 0 &&
		scenarioSummary.length === 0
	) {
		return null;
	}

	const ProfitabilityIcon = PROFITABILITY_CONFIG[profitabilityBand].icon;
	const costItems = withStableKeys(costBreakdown);
	const scenarioItems = withStableKeys(scenarioSummary);
	const assumptionItems = withStableKeys(assumptions);
	const dataGapItems = withStableKeys(dataGaps);

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.4 }}
		>
			<Card className="border-dashed">
				<CardContent className="p-6">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
							<TrendingUp className="h-5 w-5 text-primary" />
							Economics Analysis
						</h3>
						<span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
							Estimates only
						</span>
					</div>

					<div className="flex items-center gap-3 mb-4">
						<span className="text-sm font-medium text-muted-foreground">
							Profitability:
						</span>
						<Badge
							variant="outline"
							className={cn(
								"gap-1 text-sm",
								PROFITABILITY_CONFIG[profitabilityBand].bg,
								PROFITABILITY_CONFIG[profitabilityBand].text,
							)}
						>
							<ProfitabilityIcon className="h-3.5 w-3.5" />
							{profitabilityBand}
						</Badge>
					</div>

					{profitabilitySummary && (
						<p className="text-sm text-muted-foreground mb-6 leading-relaxed">
							{profitabilitySummary}
						</p>
					)}

					{costItems.length > 0 && (
						<div className="mb-6">
							<h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
								<DollarSign className="h-4 w-4 text-muted-foreground" />
								Cost Breakdown
							</h4>
							<ul className="space-y-1.5 list-disc list-inside text-sm text-muted-foreground">
								{costItems.map(({ item, key }) => (
									<li key={key}>{item}</li>
								))}
							</ul>
						</div>
					)}

					{scenarioItems.length > 0 && (
						<div className="mb-6">
							<h4 className="text-sm font-semibold text-foreground mb-3">
								Scenario Outlooks
							</h4>
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
								{scenarioItems.map(({ item, key }, index) => {
									const isFirst = index === 0;
									const isLast = index === scenarioItems.length - 1;
									const label = isFirst ? "Best" : isLast ? "Worst" : "Base";
									return (
										<div
											key={key}
											className={cn(
												"p-3 rounded-lg border text-sm",
												isFirst && "bg-success/5 border-success/20",
												!isFirst && !isLast && "bg-muted/50 border-border",
												isLast && "bg-warning/5 border-warning/20",
											)}
										>
											<span className="text-xs font-medium text-muted-foreground block mb-1">
												{label}
											</span>
											<p className="text-foreground">{item}</p>
										</div>
									);
								})}
							</div>
						</div>
					)}

					{assumptionItems.length > 0 && (
						<Collapsible
							open={assumptionsOpen}
							onOpenChange={setAssumptionsOpen}
						>
							<CollapsibleTrigger asChild>
								<Button
									variant="ghost"
									size="sm"
									className="w-full justify-between text-muted-foreground hover:text-foreground mb-2"
								>
									<span className="text-xs flex items-center gap-1">
										<HelpCircle className="h-3.5 w-3.5" />
										Assumptions ({assumptions.length})
									</span>
									<ChevronDown
										className={cn(
											"h-4 w-4 transition-transform",
											assumptionsOpen && "rotate-180",
										)}
									/>
								</Button>
							</CollapsibleTrigger>
							<CollapsibleContent>
								<ul className="space-y-1 pl-4 mb-4 list-disc text-xs text-muted-foreground">
									{assumptionItems.map(({ item, key }) => (
										<li key={key}>{item}</li>
									))}
								</ul>
							</CollapsibleContent>
						</Collapsible>
					)}

					{dataGapItems.length > 0 && (
						<div className="p-3 rounded-lg bg-warning/10 border-l-2 border-warning">
							<div className="flex items-center gap-2 mb-2">
								<AlertTriangle className="h-4 w-4 text-warning" />
								<span className="text-xs font-semibold text-warning">
									Data Gaps
								</span>
							</div>
							<ul className="space-y-1 list-disc list-inside text-xs text-muted-foreground">
								{dataGapItems.map(({ item, key }) => (
									<li key={key}>{item}</li>
								))}
							</ul>
						</div>
					)}
				</CardContent>
			</Card>
		</motion.div>
	);
}
