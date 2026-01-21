"use client";

import {
	ChevronRight,
	Download,
	Edit,
	FileText,
	Home,
	Lightbulb,
	MoreHorizontal,
	Trash2,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { STATUS_COLORS } from "@/lib/project-status";
import type { ProjectDetail, ProjectSummary } from "@/lib/project-types";
import { routes } from "@/lib/routes";
import { useProjectActions } from "@/lib/stores/project-store";
import { useTechnicalSections } from "@/lib/stores/technical-data-store";
import { overallCompletion } from "@/lib/technical-sheet-data";

const EditProjectDialog = dynamic(
	() => import("./edit-project-dialog").then((mod) => mod.EditProjectDialog),
	{ ssr: false, loading: () => null },
);

interface ProjectHeaderProps {
	project: ProjectSummary | ProjectDetail;
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
	const router = useRouter();
	const { deleteProject } = useProjectActions();
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [showEditDialog, setShowEditDialog] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);

	// ✅ Calculate progress dynamically from technical sections (same as body)
	const sections = useTechnicalSections(project.id);
	const completion =
		sections.length > 0
			? overallCompletion(sections)
			: { percentage: project.progress, completed: 0, total: 0 };

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			await deleteProject(project.id);
			toast.success("Project deleted", {
				description: `"${project.name}" has been deleted successfully`,
			});
			router.push(routes.dashboard);
		} catch (_error) {
			toast.error("Delete failed", {
				description: "The project could not be deleted. Please try again.",
			});
			setIsDeleting(false);
		}
	};

	return (
		<header className="border-b bg-card">
			<div className="container mx-auto px-4 py-6">
				{/* Breadcrumb navigation */}
				<nav
					aria-label="Breadcrumb"
					className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4"
				>
					<Link
						href="/dashboard"
						className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
					>
						<Home className="h-3.5 w-3.5" aria-hidden="true" />
						<span className="hidden sm:inline">Dashboard</span>
					</Link>
					<ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
					<span className="text-foreground font-medium truncate max-w-[200px] sm:max-w-none">
						{project.name}
					</span>
				</nav>

				{/* Main header content */}
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
					{/* Left: Project info */}
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-3 mb-1 flex-wrap">
							<h1 className="text-xl sm:text-2xl font-bold truncate">
								{project.name}
							</h1>
							<Badge
								variant="secondary"
								className={
									STATUS_COLORS[project.status] ??
									"bg-muted text-muted-foreground"
								}
							>
								{project.status}
							</Badge>
						</div>
						<p className="text-sm text-muted-foreground mb-4">
							{project.client} &bull; {project.location || project.type}
						</p>

						{/* Prominent progress bar */}
						<div className="progress-header max-w-md">
							<div className="flex items-center justify-between mb-2">
								<span className="text-sm font-medium">
									Questionnaire Progress
								</span>
								<span className="text-sm font-semibold text-primary">
									{completion.percentage}%
								</span>
							</div>
							<Progress value={completion.percentage} className="h-2" />
							<p className="text-xs text-muted-foreground mt-1.5">
								{completion.completed} of {completion.total} fields completed
							</p>
						</div>
					</div>

					{/* Right: Actions */}
					<div className="flex items-center gap-2 flex-shrink-0">
						{/* Primary CTA - hidden on mobile, visible in dropdown */}
						<Button
							onClick={() => router.push(routes.project.proposals(project.id))}
							size="sm"
							className="hidden sm:inline-flex"
						>
							<FileText className="mr-2 h-4 w-4" />
							Generate Proposal
						</Button>

						{/* Secondary actions dropdown */}
						<DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									size="icon"
									className="h-9 w-9"
									aria-label="More actions"
								>
									<MoreHorizontal className="h-4 w-4" aria-hidden="true" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								{/* Mobile-only: Generate Proposal */}
								<DropdownMenuItem
									className="sm:hidden"
									onSelect={() =>
										router.push(routes.project.proposals(project.id))
									}
								>
									<FileText className="mr-2 h-4 w-4" />
									Generate Proposal
								</DropdownMenuItem>
								<DropdownMenuItem
									onSelect={(event) => {
										event.preventDefault();
										setMenuOpen(false);
										requestAnimationFrame(() => {
											setShowEditDialog(true);
										});
									}}
								>
									<Edit className="mr-2 h-4 w-4" />
									Edit Project
								</DropdownMenuItem>
								<DropdownMenuItem>
									<Download className="mr-2 h-4 w-4" />
									Export PDF
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									className="text-destructive focus:text-destructive"
									onSelect={(event) => {
										event.preventDefault();
										setMenuOpen(false);
										requestAnimationFrame(() => {
											setShowDeleteDialog(true);
										});
									}}
								>
									<Trash2 className="mr-2 h-4 w-4" />
									Delete Project
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>

				{/* AI Data Quality Insight */}
				<div className="mt-4 flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-muted/50 rounded-lg border border-border/50">
					<Lightbulb className="h-4 w-4 flex-shrink-0 text-warning" />
					<span>
						<span className="hidden sm:inline">
							The more complete your data, the more accurate your AI proposal.
						</span>
						<span className="sm:hidden">Better data = Better proposals.</span>
					</span>
				</div>
			</div>

			<ConfirmDeleteDialog
				open={showDeleteDialog}
				onOpenChange={setShowDeleteDialog}
				onConfirm={handleDelete}
				title="Delete Project?"
				description="This action cannot be undone. All technical data, proposals and associated files will be deleted."
				itemName={project.name}
				loading={isDeleting}
			/>

			<EditProjectDialog
				open={showEditDialog}
				onOpenChange={setShowEditDialog}
				project={project}
			/>
		</header>
	);
}
