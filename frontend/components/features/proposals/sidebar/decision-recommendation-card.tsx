"use client";

import {
	AlertCircle,
	CheckCircle2,
	Leaf,
	TrendingUp,
	XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DecisionRecommendationCardProps {
	recommendation: "GO" | "NO-GO" | "INVESTIGATE FURTHER";
	rationale: string;
	keyFinancials: string;
	keyEnvironmentalImpact: string;
}

export function DecisionRecommendationCard({
	recommendation,
	rationale,
	keyFinancials,
	keyEnvironmentalImpact,
}: DecisionRecommendationCardProps) {
	const getRecommendationConfig = () => {
		switch (recommendation) {
			case "GO":
				return {
					variant: "default" as const,
					icon: CheckCircle2,
					bgColor: "bg-decision-go-bg",
					borderColor: "border-decision-go-border",
					textColor: "text-success",
					badgeBg: "bg-success",
				};
			case "NO-GO":
				return {
					variant: "destructive" as const,
					icon: XCircle,
					bgColor: "bg-decision-nogo-bg",
					borderColor: "border-decision-nogo-border",
					textColor: "text-destructive",
					badgeBg: "bg-destructive",
				};
			case "INVESTIGATE FURTHER":
				return {
					variant: "secondary" as const,
					icon: AlertCircle,
					bgColor: "bg-decision-investigate-bg",
					borderColor: "border-decision-investigate-border",
					textColor: "text-warning",
					badgeBg: "bg-warning",
				};
		}
	};

	const config = getRecommendationConfig();
	const Icon = config.icon;

	return (
		<Card className={cn("border-2", config.borderColor, config.bgColor)}>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm font-medium">
						Decision Recommendation
					</CardTitle>
					<Badge
						variant={config.variant}
						className={cn("font-bold text-xs", config.badgeBg, "text-white")}
					>
						<Icon className="mr-1 h-3 w-3" />
						{recommendation}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				{/* Rationale */}
				<div>
					<p className={cn("text-sm", config.textColor)}>{rationale}</p>
				</div>

				{/* Key Financials */}
				<div className="flex items-start gap-2 rounded-md bg-background/50 p-3">
					<TrendingUp className="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
					<div>
						<p className="text-xs font-medium text-muted-foreground">
							Financial
						</p>
						<p className="text-sm font-semibold">{keyFinancials}</p>
					</div>
				</div>

				{/* Key Environmental Impact */}
				<div className="flex items-start gap-2 rounded-md bg-background/50 p-3">
					<Leaf className="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
					<div>
						<p className="text-xs font-medium text-muted-foreground">
							Environmental
						</p>
						<p className="text-sm font-semibold">{keyEnvironmentalImpact}</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
