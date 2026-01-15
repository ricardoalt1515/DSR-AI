"use client";

import { Building, CheckCircle2, Clock, TrendingUp, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectStatsData } from "@/lib/stores";
import { cn } from "@/lib/utils";

export function SimplifiedStats() {
	// Use backend stats instead of client-side calculations
	const backendStats = useProjectStatsData();

	// Show skeleton while loading
	if (!backendStats) {
		return (
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				{[1, 2, 3].map((i) => (
					<Card key={i}>
						<CardContent className="p-6">
							<div className="flex items-center gap-4">
								<Skeleton className="h-12 w-12 rounded-xl" />
								<div className="flex-1 space-y-2">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-8 w-16" />
									<Skeleton className="h-3 w-32" />
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	// Map backend stats (snake_case) to component format
	const stats = {
		total: backendStats.total_projects ?? 0,
		inPreparation: backendStats.in_preparation ?? 0,
		generating: backendStats.generating ?? 0,
		ready: backendStats.proposal_ready ?? 0,
		completed: backendStats.completed ?? 0,
		avgProgress: Math.round(backendStats.avg_progress ?? 0),
		activeProjects:
			(backendStats.in_preparation ?? 0) +
			(backendStats.generating ?? 0) +
			(backendStats.proposal_ready ?? 0),
		completionRate:
			backendStats.total_projects && backendStats.total_projects > 0
				? Math.round(
						((backendStats.completed ?? 0) / backendStats.total_projects) * 100,
					)
				: 0,
	};

	const activeDescription =
		stats.activeProjects === 0
			? "All waste streams are up to date"
			: "Require attention";

	const readyDescription =
		stats.ready === 0 ? "No proposals ready yet" : "For review and delivery";

	const efficiencyDescription =
		stats.total === 0
			? "Start by creating your first waste stream"
			: "Overall completion";

	const statCards = [
		{
			id: "active",
			title: "Active Waste Streams",
			value: stats.activeProjects,
			description: activeDescription,
			icon: Building,
			color: "blue",
			priority: stats.inPreparation > 0 ? "high" : "normal",
		},
		{
			id: "ready",
			title: "Ready Proposals",
			value: stats.ready,
			description: readyDescription,
			icon: Zap,
			color: "green",
			priority: stats.ready > 0 ? "high" : "normal",
		},
		{
			id: "efficiency",
			title: "Average Progress",
			value: `${stats.avgProgress}%`,
			description: efficiencyDescription,
			icon: TrendingUp,
			color: "purple",
			priority: "normal",
		},
	];

	if (stats.total === 0) {
		return null; // Hero component handles empty state
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
			{statCards.map((stat) => {
				const Icon = stat.icon;
				const colorClasses = {
					blue: {
						card: "border-primary/35 bg-primary/10",
						iconBg: "bg-primary/15",
						iconColor: "text-primary",
						valueColor: "text-primary",
						descColor: "text-muted-foreground",
						divider: "border-primary/25",
						accent: "text-primary",
					},
					green: {
						card: "border-success/35 bg-success/12",
						iconBg: "bg-success/15",
						iconColor: "text-success",
						valueColor: "text-success",
						descColor: "text-success/80",
						divider: "border-success/25",
						accent: "text-success",
					},
					purple: {
						card: "border-treatment-auxiliary/35 bg-treatment-auxiliary/12",
						iconBg: "bg-treatment-auxiliary/15",
						iconColor: "text-treatment-auxiliary",
						valueColor: "text-treatment-auxiliary",
						descColor: "text-muted-foreground",
						divider: "border-treatment-auxiliary/25",
						accent: "text-treatment-auxiliary",
					},
				};

				const colors = colorClasses[stat.color as keyof typeof colorClasses];

				return (
					<Card
						key={stat.id}
						className={cn(
							colors.card,
							"transition-all duration-200 hover:shadow-md",
							stat.priority === "high" &&
								"ring-2 ring-primary/20 animate-pulse",
						)}
					>
						<CardContent className="p-6">
							<div className="flex items-center gap-4">
								<div
									className={cn(
										"h-12 w-12 rounded-xl flex items-center justify-center",
										colors.iconBg,
									)}
								>
									<Icon className={cn("h-6 w-6", colors.iconColor)} />
								</div>

								<div className="flex-1">
									<div className="flex items-center gap-2 mb-1">
										<p className="text-sm font-medium">{stat.title}</p>
										{stat.priority === "high" && (
											<Badge variant="secondary" className="text-xs">
												Action Required
											</Badge>
										)}
									</div>
									<p className={cn("text-3xl font-bold", colors.valueColor)}>
										{stat.value}
									</p>
									<p className={cn("text-sm", colors.descColor)}>
										{stat.description}
									</p>
								</div>
							</div>

							{/* Additional context for each stat */}
							{stat.id === "active" && stats.inPreparation > 0 && (
								<div className={cn("mt-4 pt-4 border-t", colors.divider)}>
									<div
										className={cn(
											"flex items-center gap-2 text-xs",
											colors.accent,
										)}
									>
										<Clock className="h-3 w-3" />
										<span>
											{stats.inPreparation} need to complete technical sheet
										</span>
									</div>
								</div>
							)}

							{stat.id === "ready" && stats.generating > 0 && (
								<div className={cn("mt-4 pt-4 border-t", colors.divider)}>
									<div
										className={cn(
											"flex items-center gap-2 text-xs",
											colors.accent,
										)}
									>
										<Zap className="h-3 w-3" />
										<span>{stats.generating} generating proposal...</span>
									</div>
								</div>
							)}

							{stat.id === "efficiency" && (
								<div className={cn("mt-4 pt-4 border-t", colors.divider)}>
									<div className="flex items-center justify-between text-xs">
										<div
											className={cn("flex items-center gap-2", colors.accent)}
										>
											<CheckCircle2 className="h-3 w-3" />
											<span>{stats.completed} completed</span>
										</div>
										<span className={cn("font-medium", colors.accent)}>
											{stats.completionRate}% success rate
										</span>
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}
