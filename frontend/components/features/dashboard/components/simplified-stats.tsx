"use client";

import { Building, CheckCircle2, Clock, TrendingUp, Zap } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useProjects } from "@/lib/stores";
import { cn } from "@/lib/utils";

export function SimplifiedStats() {
	const projects = useProjects();

	const stats = useMemo(() => {
		const total = projects.length;
		const inPreparation = projects.filter(
			(p) => p.status === "In Preparation",
		).length;
		const generating = projects.filter(
			(p) => p.status === "Generating Proposal",
		).length;
		const ready = projects.filter((p) => p.status === "Proposal Ready").length;
		const completed = projects.filter((p) => p.status === "Completed").length;

		// Calculate efficiency metrics
		const avgProgress =
			total > 0
				? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / total)
				: 0;

		const activeProjects = total - completed;
		const completionRate =
			total > 0 ? Math.round((completed / total) * 100) : 0;

		return {
			total,
			inPreparation,
			generating,
			ready,
			completed,
			avgProgress,
			activeProjects,
			completionRate,
		};
	}, [projects]);

	const statCards = [
		{
			id: "active",
			title: "Active Projects",
			value: stats.activeProjects,
			description: "Require attention",
			icon: Building,
			color: "blue",
			priority: stats.inPreparation > 0 ? "high" : "normal",
		},
		{
			id: "ready",
			title: "Ready Proposals",
			value: stats.ready,
			description: "For review and delivery",
			icon: Zap,
			color: "green",
			priority: stats.ready > 0 ? "high" : "normal",
		},
		{
			id: "efficiency",
			title: "Average Progress",
			value: `${stats.avgProgress}%`,
			description: "Overall completion",
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
