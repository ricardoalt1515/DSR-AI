import {
	Building,
	CalendarDays,
	Clock,
	DollarSign,
	Droplets,
	MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";

interface ProjectOverviewProject {
	id: string;
	name: string;
	client: string;
	location: string;
	status: string;
	progress: number;
	type: string;
	description: string;
	budget?: number;
	scheduleSummary?: string;
	timeline?: string;
	updatedAt?: string;
	team?: Array<{ name: string; role: string; avatar?: string }>;
}

interface ProjectOverviewProps {
	project: ProjectOverviewProject;
	onNavigateToTechnical?: () => void;
}

const DEFAULT_TEAM: Array<{ name: string; role: string; avatar: string }> = [
	{ name: "Juan Pérez", role: "Lead Engineer", avatar: "JP" },
	{ name: "María González", role: "Environmental Engineer", avatar: "MG" },
	{ name: "Carlos Rodríguez", role: "Specialist Technician", avatar: "CR" },
];

export function ProjectOverview({
	project,
	onNavigateToTechnical,
}: ProjectOverviewProps) {
	const budgetLabel =
		typeof project.budget === "number"
			? formatCurrency(project.budget)
			: "Not defined";
	const durationLabel =
		project.timeline ?? project.scheduleSummary ?? "Not defined";
	const updatedAtLabel = project.updatedAt
		? new Date(project.updatedAt).toLocaleDateString("en-US")
		: "Not defined";
	const teamMembers =
		project.team && project.team.length > 0 ? project.team : DEFAULT_TEAM;

	return (
		<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<div className="space-y-6 lg:col-span-2">
				<Card>
					<CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
						<div className="space-y-2">
							<CardTitle className="text-lg font-semibold">
								Project Summary
							</CardTitle>
							<p className="text-sm text-muted-foreground leading-relaxed">
								{project.description}
							</p>
						</div>
						{onNavigateToTechnical && (
							<Button
								size="sm"
								variant="outline"
								onClick={onNavigateToTechnical}
							>
								Complete Technical Data Sheet
							</Button>
						)}
					</CardHeader>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Overall Progress</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">Completed</span>
							<span className="text-sm text-muted-foreground">
								{project.progress}%
							</span>
						</div>
						<Progress value={project.progress} className="w-full" />

						<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
							<div className="text-center">
								<div className="text-2xl font-bold text-primary">
									{project.progress}%
								</div>
								<div className="text-xs text-muted-foreground">
									Project Progress
								</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-secondary">
									{project.status}
								</div>
								<div className="text-xs text-muted-foreground">
									Current Status
								</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-muted-foreground">
									{durationLabel}
								</div>
								<div className="text-xs text-muted-foreground">
									Estimated Duration
								</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-chart-1">
									{budgetLabel}
								</div>
								<div className="text-xs text-muted-foreground">Budget</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="space-y-6">
				<Card>
					<CardHeader>
						<CardTitle>Project Details</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center gap-3">
							<Building className="h-4 w-4 text-muted-foreground" />
							<div>
								<div className="text-sm font-medium">Client</div>
								<div className="text-sm text-muted-foreground">
									{project.client}
								</div>
							</div>
						</div>

						<div className="flex items-center gap-3">
							<MapPin className="h-4 w-4 text-muted-foreground" />
							<div>
								<div className="text-sm font-medium">Location</div>
								<div className="text-sm text-muted-foreground">
									{project.location}
								</div>
							</div>
						</div>

						<div className="flex items-center gap-3">
							<Droplets className="h-4 w-4 text-muted-foreground" />
							<div>
								<div className="text-sm font-medium">Treatment Type</div>
								<div className="text-sm text-muted-foreground">
									{project.type}
								</div>
							</div>
						</div>

						<div className="flex items-center gap-3">
							<DollarSign className="h-4 w-4 text-muted-foreground" />
							<div>
								<div className="text-sm font-medium">Budget</div>
								<div className="text-sm text-muted-foreground">
									{budgetLabel}
								</div>
							</div>
						</div>

						<div className="flex items-center gap-3">
							<Clock className="h-4 w-4 text-muted-foreground" />
							<div>
								<div className="text-sm font-medium">Duration</div>
								<div className="text-sm text-muted-foreground">
									{durationLabel}
								</div>
							</div>
						</div>

						<div className="flex items-center gap-3">
							<CalendarDays className="h-4 w-4 text-muted-foreground" />
							<div>
								<div className="text-sm font-medium">Last Updated</div>
								<div className="text-sm text-muted-foreground">
									{updatedAtLabel}
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Project Team</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{teamMembers.map((member, index) => (
							<div
								key={`${member.name}-${index}`}
								className="flex items-center gap-3"
							>
								<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
									{member.avatar ??
										member.name?.slice(0, 2).toUpperCase() ??
										"--"}
								</div>
								<div>
									<div className="text-sm font-medium">{member.name}</div>
									<div className="text-xs text-muted-foreground">
										{member.role}
									</div>
								</div>
							</div>
						))}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
