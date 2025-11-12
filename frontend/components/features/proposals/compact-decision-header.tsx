"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TrendingUp, Leaf, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompactDecisionHeaderProps {
	recommendation: "GO" | "NO-GO" | "INVESTIGATE FURTHER";
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
					bg: "bg-green-50 dark:bg-green-950",
					border: "border-green-200 dark:border-green-800",
					text: "text-green-700 dark:text-green-300",
				};
			case "NO-GO":
				return {
					variant: "destructive" as const,
					bg: "bg-red-50 dark:bg-red-950",
					border: "border-red-200 dark:border-red-800",
					text: "text-red-700 dark:text-red-300",
				};
			case "INVESTIGATE FURTHER":
				return {
					variant: "secondary" as const,
					bg: "bg-yellow-50 dark:bg-yellow-950",
					border: "border-yellow-200 dark:border-yellow-800",
					text: "text-yellow-700 dark:text-yellow-300",
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
							<AlertCircle className="h-4 w-4 text-yellow-600" />
							<span className="text-muted-foreground">{riskCount} risks</span>
						</div>
					)}
				</div>
			</div>
		</Card>
	);
}
