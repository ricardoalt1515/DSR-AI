import {
	ArrowRight,
	Building,
	FileText,
	MapPin,
	Percent,
	Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import type { ProjectSummary } from "@/lib/project-types";
import { PROPOSAL_READINESS_THRESHOLD } from "@/lib/technical-sheet-data";

type ProjectOverviewProject = Pick<
	ProjectSummary,
	| "id"
	| "name"
	| "client"
	| "location"
	| "status"
	| "progress"
	| "projectType"
	| "description"
	| "updatedAt"
> & { proposalCount?: number };

interface ProjectOverviewProps {
	project: ProjectOverviewProject;
	onNavigateToTechnical?: () => void;
	onNavigateToProposals?: () => void;
}

export function ProjectOverview({
	project,
	onNavigateToTechnical,
	onNavigateToProposals,
}: ProjectOverviewProps) {
	const updatedAtLabel = project.updatedAt
		? new Date(project.updatedAt).toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
			})
		: "Not available";

	const proposalCount = project.proposalCount ?? 0;
	const canGenerateProposal = project.progress >= PROPOSAL_READINESS_THRESHOLD;

	return (
		<div className="space-y-6">
			{/* Key Metrics - Clickable to navigate */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<MetricCard
					icon={Percent}
					label="Data Complete"
					value={`${project.progress}%`}
					subtitle="Click to continue"
					variant={
						project.progress >= PROPOSAL_READINESS_THRESHOLD
							? "success"
							: "primary"
					}
					onClick={onNavigateToTechnical}
				/>
				<MetricCard
					icon={FileText}
					label="Proposals"
					value={proposalCount}
					subtitle={proposalCount > 0 ? "Click to view" : "Click to generate"}
					variant="chart-2"
					onClick={onNavigateToProposals}
				/>
				<MetricCard
					icon={Building}
					label="Client"
					value={project.client}
					subtitle={project.projectType}
					variant="chart-4"
				/>
				<MetricCard
					icon={MapPin}
					label="Location"
					value={project.location || "Not set"}
					subtitle={`Updated ${updatedAtLabel}`}
					variant="warning"
				/>
			</div>

			{/* Next Step Card */}
			<Card className="next-step-card overflow-hidden">
				<CardContent className="p-6">
					<div className="flex items-start justify-between gap-4">
						<div className="flex-1 space-y-2">
							<div className="flex items-center gap-2">
								<Sparkles className="h-5 w-5 text-primary" />
								<h3 className="font-semibold text-lg">Next Step</h3>
							</div>
							{canGenerateProposal ? (
								<>
									<p className="text-muted-foreground">
										Your questionnaire is ready! Generate an AI-powered proposal
										based on your technical data.
									</p>
									<Button onClick={onNavigateToProposals} className="mt-2">
										Generate Proposal
										<ArrowRight className="ml-2 h-4 w-4" />
									</Button>
								</>
							) : (
								<>
									<p className="text-muted-foreground">
										Complete at least {PROPOSAL_READINESS_THRESHOLD}% of your
										questionnaire to unlock AI proposal generation.
									</p>
									<div className="flex items-center gap-3 mt-2">
										<div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
											<div
												className="h-full bg-primary transition-[width] duration-500"
												style={{
													width: `${(project.progress / PROPOSAL_READINESS_THRESHOLD) * 100}%`,
												}}
											/>
										</div>
										<span className="text-sm font-medium text-muted-foreground">
											{project.progress}% / {PROPOSAL_READINESS_THRESHOLD}%
										</span>
									</div>
									<Button
										variant="outline"
										onClick={onNavigateToTechnical}
										className="mt-3"
									>
										Continue Questionnaire
										<ArrowRight className="ml-2 h-4 w-4" />
									</Button>
								</>
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Project Description */}
			{project.description && (
				<Card>
					<CardContent className="p-6">
						<h3 className="font-semibold mb-2">About This Project</h3>
						<p className="text-sm text-muted-foreground leading-relaxed">
							{project.description}
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
