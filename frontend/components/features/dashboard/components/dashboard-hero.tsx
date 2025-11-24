"use client";

import {
	ArrowRight,
	Building,
	Clock,
	FileText,
	MapPin,
	Plus,
	Recycle,
	TrendingUp,
	Users,
	Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
// Button import removed - not used
import { Card, CardContent } from "@/components/ui/card";
import {
	EngineeringButton,
	EngineeringButtonGroup,
	QuickActionButton,
} from "@/components/ui/engineering-button";
import { Progress } from "@/components/ui/progress";
import { DASHBOARD_STATUS_PRIORITY, getProjectStatusLabel } from "@/lib/project-status";
import { routes } from "@/lib/routes";
import { useProjects, useTechnicalSections } from "@/lib/stores";
import { overallCompletion } from "@/lib/technical-sheet-data";

interface DashboardHeroProps {
	onCreateProject?: () => void;
}

interface FirstTimeHeroProps {
	onCreateProject?: () => void;
}

export function DashboardHero({ onCreateProject }: DashboardHeroProps) {
	const projects = useProjects();
	const router = useRouter();

	// ✅ Calculate progress dynamically for priority project
	const priorityProjectSections = useTechnicalSections(
		projects.find(
			(p) => p.status === "In Preparation" || p.status === "Proposal Ready",
		)?.id || "",
	);
	const priorityCompletion = overallCompletion(priorityProjectSections);

	// Find the most important/urgent project
	const priorityProject = useMemo(() => {
		if (projects.length === 0) return null;

		// Priority logic: In Preparation > Proposal Ready > others, then by recent update
		const sorted = [...projects].sort((a, b) => {
			const aPriority = DASHBOARD_STATUS_PRIORITY[a.status] ?? 0;
			const bPriority = DASHBOARD_STATUS_PRIORITY[b.status] ?? 0;

			if (aPriority !== bPriority) {
				return bPriority - aPriority;
			}

			// If same priority, sort by most recently updated
			return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
		});

		return sorted[0] || null;
	}, [projects]);

	// Quick stats for hero
	const quickStats = useMemo(() => {
		const inPreparation = projects.filter(
			(p) => p.status === "In Preparation",
		).length;
		const readyProposals = projects.filter(
			(p) => p.status === "Proposal Ready",
		).length;
		const avgProgress =
			projects.length > 0
				? Math.round(
						projects.reduce((sum, p) => sum + p.progress, 0) / projects.length,
					)
				: 0;

		return { inPreparation, readyProposals, avgProgress };
	}, [projects]);

	if (!priorityProject && projects.length === 0) {
		return <FirstTimeHero {...(onCreateProject ? { onCreateProject } : {})} />;
	}

	return (
		<div className="space-y-6">
			<Card className="aqua-panel relative overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
				<div className="absolute -top-28 -right-20 h-64 w-64 rounded-full bg-gradient-radial from-primary/15 via-transparent to-transparent blur-3xl" />
				<div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-gradient-radial from-accent/10 via-transparent to-transparent blur-3xl" />
				<CardContent className="relative p-0">
					<div className="flex flex-col lg:flex-row">
						<div className="flex-1 space-y-6 p-8">
							<div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
								<div className="flex items-start gap-4">
									<div className="aqua-metric-icon shadow-water">
										<Building className="h-6 w-6 text-primary-foreground" />
									</div>
									<div className="space-y-3">
										<div className="flex flex-wrap items-center gap-3">
											<span className="aqua-floating-chip">
												Priority Project
											</span>
											{priorityProject && (
												<Badge
													variant="outline"
													className="border-primary/40 bg-primary/10 text-xs tracking-wide backdrop-blur"
												>
													{getProjectStatusLabel(priorityProject.status)}
												</Badge>
											)}
										</div>
										<h2 className="text-3xl font-semibold leading-tight text-gradient">
											{priorityProject?.name ?? "Unassigned"}
										</h2>
										<div className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-3">
											<div className="flex items-center gap-2">
												<Users className="h-4 w-4 text-primary" />
												<span>
													{priorityProject?.client ?? "Client not defined"}
												</span>
											</div>
											<div className="flex items-center gap-2">
												<MapPin className="h-4 w-4 text-primary" />
												<span>
													{priorityProject?.location ?? "Location pending"}
												</span>
											</div>
											<div className="flex items-center gap-2">
												<Clock className="h-4 w-4 text-primary" />
												<span>
													Updated{" "}
													{priorityProject
														? new Date(
																priorityProject.updatedAt,
															).toLocaleDateString("en-US")
														: "–"}
												</span>
											</div>
										</div>
									</div>
								</div>
								<div className="rounded-2xl border border-border/40 bg-card/60 p-4 text-sm backdrop-blur-xl">
									<div className="flex items-center justify-between">
										<span className="font-medium text-muted-foreground">
											Capture Progress
										</span>
										<span className="text-xl font-semibold text-gradient">
											{priorityCompletion.percentage}%
										</span>
									</div>
									<Progress
										value={priorityCompletion.percentage}
										className="mt-3 h-2.5 overflow-hidden rounded-full bg-card/70"
									/>
									<p className="mt-3 text-xs text-muted-foreground">
										Keep the technical sheet above 80% to enable instant
										proposals.
									</p>
								</div>
							</div>

							<div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
								<div className="rounded-2xl border border-border/40 bg-card/60 p-4 backdrop-blur">
									<p className="font-medium text-foreground">Key Indicators</p>
									<div className="mt-3 flex items-center justify-between">
										<span>Ready Proposals</span>
										<Badge
											variant="secondary"
											className="bg-primary/15 text-primary"
										>
											{quickStats.readyProposals}
										</Badge>
									</div>
									<div className="mt-2 flex items-center justify-between">
										<span>Capture Average</span>
										<Badge
											variant="outline"
											className="border-border/40 bg-card/60 text-foreground"
										>
											{quickStats.avgProgress}%
										</Badge>
									</div>
								</div>
								<div className="rounded-2xl border border-border/40 bg-card/60 p-4 backdrop-blur">
									<p className="font-medium text-foreground">Pipeline Status</p>
									<div className="mt-3 flex items-center gap-2">
										<Badge variant="default">
											{quickStats.inPreparation} in preparation
										</Badge>
										<Badge variant="success">
											{quickStats.readyProposals} ready
										</Badge>
									</div>
									<p className="mt-3 text-xs">
										Prioritize completing projects in preparation to unlock new
										proposals.
									</p>
								</div>
							</div>
						</div>

						<div className="flex w-full flex-col gap-6 border-t border-border/40 bg-card/60 p-6 backdrop-blur-xl lg:w-80 lg:border-t-0 lg:border-l lg:border-border/40">
							<div>
								<h4 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
									<Zap className="h-4 w-4 text-primary" /> Quick Actions
								</h4>
								<p className="mt-2 text-xs text-muted-foreground">
									Continue with project flow or create new opportunities.
								</p>
							</div>
							{priorityProject && (
								<EngineeringButtonGroup orientation="vertical">
									{priorityProject.status === "In Preparation" && (
										<EngineeringButton
											variant="quick"
											size="sm"
											className="justify-start"
											onClick={() =>
												router.push(
													routes.project.technical(priorityProject.id),
												)
											}
										>
											<FileText className="h-4 w-4" />
											Complete Technical Sheet
											<ArrowRight className="ml-auto h-3 w-3" />
										</EngineeringButton>
									)}

									{priorityProject.status === "Proposal Ready" && (
										<QuickActionButton
											action="generate-proposal"
											size="sm"
											className="justify-start"
											onClick={() =>
												router.push(
													routes.project.proposals(priorityProject.id),
												)
											}
										/>
									)}

									<EngineeringButton
										variant="outline"
										size="sm"
										className="justify-start"
										onClick={() =>
											router.push(routes.project.detail(priorityProject.id))
										}
									>
										<Building className="h-4 w-4" />
										View Full Project
										<ArrowRight className="ml-auto h-3 w-3" />
									</EngineeringButton>

									<EngineeringButton
										variant="default"
										size="sm"
										className="justify-start"
										onClick={onCreateProject}
									>
										<Plus className="h-4 w-4" />
										New Assessment
									</EngineeringButton>
								</EngineeringButtonGroup>
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<div className="aqua-metric-tile">
					<div className="flex items-center gap-3">
						<div className="aqua-metric-icon">
							<FileText className="h-5 w-5 text-primary-foreground" />
						</div>
						<div>
							<p className="text-2xl font-semibold text-gradient">
								{quickStats.inPreparation}
							</p>
							<p className="text-sm text-muted-foreground">In Preparation</p>
						</div>
					</div>
				</div>

				<div className="aqua-metric-tile">
					<div className="flex items-center gap-3">
						<div className="aqua-metric-icon">
							<Zap className="h-5 w-5 text-primary-foreground" />
						</div>
						<div>
							<p className="text-2xl font-semibold text-gradient">
								{quickStats.readyProposals}
							</p>
							<p className="text-sm text-muted-foreground">Ready Proposals</p>
						</div>
					</div>
				</div>

				<div className="aqua-metric-tile">
					<div className="flex items-center gap-3">
						<div className="aqua-metric-icon">
							<TrendingUp className="h-5 w-5 text-primary-foreground" />
						</div>
						<div>
							<p className="text-2xl font-semibold text-gradient">
								{quickStats.avgProgress}%
							</p>
							<p className="text-sm text-muted-foreground">Average Progress</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

// First-time user hero
function FirstTimeHero({ onCreateProject }: FirstTimeHeroProps) {
	return (
		<Card className="bg-card/80 backdrop-blur-sm border border-border/50 shadow-xl overflow-hidden relative">
			<div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
			<div
				className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"
				style={{
					background:
						"radial-gradient(circle, rgba(59,130,246,0.3) 0%, rgba(59,130,246,0.1) 50%, transparent 100%)",
				}}
			/>
			<CardContent className="relative p-8 lg:p-12 text-center">
				<div className="mx-auto max-w-2xl space-y-6">
					<div className="mx-auto w-16 h-16 rounded-2xl bg-muted/50 backdrop-blur-sm shadow-lg hover:animate-pulse flex items-center justify-center">
						<Recycle className="h-8 w-8 text-primary" />
					</div>

					<div className="space-y-3">
						<h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
							Welcome to DSR Platform!
						</h1>
						<p className="text-lg text-muted-foreground">
							Your central hub for waste resource management. Analyze
							opportunities and identify profitable deals in minutes.
						</p>
					</div>

					<div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
						<QuickActionButton
							action="quick-start"
							size="lg"
							onClick={onCreateProject}
						/>

						<EngineeringButton variant="outline" size="lg">
							<FileText className="h-4 w-4" />
							View Documentation
						</EngineeringButton>
					</div>

					<div className="pt-6 border-t border-border/40">
						<p className="text-sm text-muted-foreground">
							💡 <strong>Tip:</strong> Start by creating your first assessment.
							Complete the questionnaire to unlock AI-powered deal analysis and
							profitability reports.
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
