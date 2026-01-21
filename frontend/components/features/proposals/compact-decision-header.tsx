"use client";

import { AlertCircle, Leaf, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CompactDecisionHeaderProps {
	recommendation: "GO" | "NO-GO" | "INVESTIGATE FURTHER" | "INVESTIGATE";
	keyFinancials: string;
	keyEnvironmentalImpact: string;
	riskCount: number;
}

/**
 * Compact decision header to show in tabs other than Overview
 * Replaces the large sidebar card to save space
 */
export function CompactDecisionHeader({
	recommendation,
	keyFinancials,
	keyEnvironmentalImpact,
	riskCount,
}: CompactDecisionHeaderProps) {
	const getConfig = () => {
		switch (recommendation) {
			case "GO":
				return {
					variant: "default" as const,
					bg: "bg-decision-go-bg",
					border: "border-decision-go-border",
					text: "text-success",
				};
			case "NO-GO":
				return {
					variant: "destructive" as const,
					bg: "bg-decision-nogo-bg",
					border: "border-decision-nogo-border",
					text: "text-destructive",
				};
			case "INVESTIGATE FURTHER":
			case "INVESTIGATE":
				return {
					variant: "secondary" as const,
					bg: "bg-decision-investigate-bg",
					border: "border-decision-investigate-border",
					text: "text-warning",
				};
		}
	};

	const config = getConfig();

	return (
		<Card className={cn("mb-6 border", config.border, config.bg)}>
			<div className="flex items-center justify-between gap-4 p-4">
				{/* Decision Badge */}
				<div className="flex items-center gap-3">
					<Badge variant={config.variant} className="font-bold">
						{recommendation}
					</Badge>
					<span className={cn("text-sm font-medium", config.text)}>
						DSR Decision Recommendation
					</span>
				</div>

				{/* Quick Metrics */}
				<div className="flex items-center gap-6 text-sm">
					<div className="flex items-center gap-2">
						<TrendingUp className="h-4 w-4 text-muted-foreground" />
						<span className="font-semibold">{keyFinancials}</span>
					</div>
					<div className="flex items-center gap-2">
						<Leaf className="h-4 w-4 text-muted-foreground" />
						<span className="font-semibold">{keyEnvironmentalImpact}</span>
					</div>
					{riskCount > 0 && (
						<div className="flex items-center gap-2">
							<AlertCircle className="h-4 w-4 text-warning" />
							<span className="text-muted-foreground">{riskCount} risks</span>
						</div>
					)}
				</div>
			</div>
		</Card>
	);
}
