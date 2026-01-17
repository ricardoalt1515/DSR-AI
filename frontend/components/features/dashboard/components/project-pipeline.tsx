"use client";

import {
	ArrowRight,
	CheckCircle,
	FileText,
	TrendingUp,
	Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type { ProjectStatus } from "@/lib/project-status";
import { useProjectStatsData } from "@/lib/stores";
import { cn } from "@/lib/utils";

type StageDefinition = {
	id: string;
	title: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
	color: "blue" | "purple" | "green" | "gray";
	statuses: ProjectStatus[];
};

const PIPELINE_STAGES: StageDefinition[] = [
	{
		id: "preparation",
		title: "Preparation",
		description: "Technical data capture",
		icon: FileText,
		color: "blue",
		statuses: ["In Preparation"],
	},
	{
		id: "analysis",
		title: "Analysis",
		description: "AI processing",
		icon: TrendingUp,
		color: "purple",
		statuses: ["Generating Proposal", "In Development"],
	},
	{
		id: "ready",
		title: "Ready",
		description: "Proposal generated",
		icon: CheckCircle,
		color: "green",
		statuses: ["Proposal Ready"],
	},
	{
		id: "completed",
		title: "Completed",
		description: "Waste stream finalized",
		icon: Zap,
		color: "gray",
		statuses: ["Completed"],
	},
];

const STAGE_COLOR_MAP = {
	blue: {
		card: "border-primary/35 bg-primary/10",
		iconBg: "bg-primary/15",
		title: "text-primary",
		accent: "text-primary",
		badge: "bg-primary/12 text-primary",
	},
	purple: {
		card: "border-treatment-auxiliary/35 bg-treatment-auxiliary/12",
		iconBg: "bg-treatment-auxiliary/15",
		title: "text-treatment-auxiliary",
		accent: "text-treatment-auxiliary",
		badge: "bg-treatment-auxiliary/12 text-treatment-auxiliary",
	},
	green: {
		card: "border-success/35 bg-success/12",
		iconBg: "bg-success/15",
		title: "text-success",
		accent: "text-success",
		badge: "bg-success/12 text-success",
	},
	gray: {
		card: "border-border/40 bg-card/60",
		iconBg: "bg-card/70 text-muted-foreground",
		title: "text-foreground",
		accent: "text-muted-foreground",
		badge: "bg-card/70 text-muted-foreground",
	},
} as const;

// Map ProjectStatus to DashboardStats property names
const STATUS_TO_STAT_KEY: Record<ProjectStatus, keyof typeof STAT_KEYS> = {
	"In Preparation": "in_preparation",
	"Generating Proposal": "generating",
	"Proposal Ready": "proposal_ready",
	"In Development": "in_development",
	Completed: "completed",
	"On Hold": "on_hold",
};

const STAT_KEYS = {
	in_preparation: true,
	generating: true,
	proposal_ready: true,
	in_development: true,
	completed: true,
	on_hold: true,
} as const;

export function ProjectPipeline() {
	const stats = useProjectStatsData();

	if (!stats || stats.total_projects === 0) {
		return null;
	}

	// Calculate stage counts from flat stats properties
	const getStageCount = (stage: StageDefinition): number => {
		return stage.statuses.reduce((sum, status) => {
			const key = STATUS_TO_STAT_KEY[status];
			return sum + (stats[key] ?? 0);
		}, 0);
	};

	const stageData = PIPELINE_STAGES.map((stage) => ({
		...stage,
		count: getStageCount(stage),
		avgProgress: stats.avg_progress ?? 0,
	}));

	const totalActive = stageData
		.filter((stage) => stage.id !== "completed")
		.reduce((sum, stage) => sum + stage.count, 0);
	const readyToDeliver =
		stageData.find((stage) => stage.id === "ready")?.count ?? 0;

	const summaryMetrics = [
		{ label: "Active", value: totalActive, description: "in progress" },
		{ label: "Ready", value: readyToDeliver, description: "awaiting review" },
		{
			label: "Completed",
			value: stats.completed ?? 0,
			description: "delivered to client",
		},
	];

	return (
		<div className="space-y-6">
			<Card className="aqua-panel">
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								<TrendingUp className="h-5 w-5 text-primary" />
								Waste Stream Pipeline
							</CardTitle>
							<p className="text-sm text-muted-foreground mt-1">
								Data sourced from server-side lifecycle counts
							</p>
						</div>
						<div className="text-right">
							<p className="text-2xl font-bold text-primary">{totalActive}</p>
							<p className="text-xs text-muted-foreground">active</p>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
						{stageData.map((stage, index) => {
							const colors = STAGE_COLOR_MAP[stage.color];
							const Icon = stage.icon;

							return (
								<div key={stage.id} className="relative">
									<Card
										className={cn(
											colors.card,
											"transition-all duration-200 hover:shadow-md",
										)}
									>
										<CardContent className="p-4">
											<div className="flex items-center gap-3 mb-3">
												<div
													className={cn(
														"h-8 w-8 rounded-lg flex items-center justify-center",
														colors.iconBg,
													)}
												>
													<Icon className={cn("h-4 w-4", colors.accent)} />
												</div>
												<div className="flex-1">
													<h3
														className={cn("font-medium text-sm", colors.title)}
													>
														{stage.title}
													</h3>
													<p className="text-xs text-muted-foreground">
														{stage.description}
													</p>
												</div>
											</div>

											<div className="space-y-2">
												<div className="flex items-center justify-between">
													<span className="text-xs text-muted-foreground">
														Waste Streams
													</span>
													<Badge
														className={cn(
															"border border-transparent",
															colors.badge,
														)}
													>
														{stage.count}
													</Badge>
												</div>

												{stage.count > 0 && (
													<>
														<div className="flex items-center justify-between">
															<span className="text-xs text-muted-foreground">
																Avg. progress
															</span>
															<span
																className={cn(
																	"text-xs font-medium",
																	colors.accent,
																)}
															>
																{stage.avgProgress}%
															</span>
														</div>
														<Progress
															value={stage.avgProgress}
															className="h-1.5"
														/>
													</>
												)}
											</div>
										</CardContent>
									</Card>

									{index < stageData.length - 1 && (
										<div className="hidden md:block absolute top-1/2 -right-2 z-10">
											<div className="h-4 w-4 bg-background border border-border rounded-full flex items-center justify-center">
												<ArrowRight className="h-2 w-2 text-muted-foreground" />
											</div>
										</div>
									)}
								</div>
							);
						})}
					</div>

					<Separator />

					<div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
						{summaryMetrics.map((metric) => (
							<div key={metric.label} className="text-center">
								<p className="text-2xl font-semibold text-primary">
									{metric.value}
								</p>
								<p className="text-xs text-muted-foreground">
									{metric.label} · {metric.description}
								</p>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
