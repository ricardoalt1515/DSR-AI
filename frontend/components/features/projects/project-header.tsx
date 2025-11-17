"use client";

import {
	Archive,
	ArrowLeft,
	ChevronRight,
	Download,
	Edit,
	FileText,
	Home,
	MoreHorizontal,
	RotateCcw,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { routes } from "@/lib/routes";
import { useProjectActions, useTechnicalSections } from "@/lib/stores";
import { overallCompletion } from "@/lib/technical-sheet-data";
import { EditProjectDialog } from "./edit-project-dialog";

interface Project {
	id: string;
	name: string;
	client: string;
	location: string;
	status: string;
	type: string;
	progress: number;
	updatedAt: string;
	description?: string;
	isArchived?: boolean;
	archivedAt?: string | null;
	lifecycleState?: string;
}

interface ProjectHeaderProps {
	project: Project;
}

const statusColors = {
	"En Desarrollo": "bg-secondary text-secondary-foreground",
	Propuesta: "bg-muted text-muted-foreground",
	Completado: "bg-primary text-primary-foreground",
	Pausado: "bg-destructive text-destructive-foreground",
};

export function ProjectHeader({ project }: ProjectHeaderProps) {
	const router = useRouter();
	const { deleteProject, archiveProject, restoreProject } = useProjectActions();
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [showEditDialog, setShowEditDialog] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isArchiving, setIsArchiving] = useState(false);

	// ✅ Calculate progress dynamically from technical sections (same as body)
	const sections = useTechnicalSections(project.id);
	const completion = overallCompletion(sections);

	const isArchived = Boolean(project.isArchived);
	const archivedLabel = project.archivedAt
		? `Archived ${new Date(project.archivedAt).toLocaleDateString("en-US")}`
		: "Archived";

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			await deleteProject(project.id);
			toast.success("Proyecto eliminado", {
				description: `"${project.name}" ha sido eliminado correctamente`,
			});
			router.push(routes.dashboard);
		} catch (_error) {
			toast.error("Error al eliminar", {
				description: "No se pudo eliminar el proyecto. Intenta nuevamente.",
			});
			setIsDeleting(false);
		}
	};

	const handleArchiveToggle = async () => {
		setIsArchiving(true);
		try {
			if (isArchived) {
				await restoreProject(project.id);
				toast.success("Proyecto restaurado", {
					description: `"${project.name}" ha vuelto a la vista activa`,
				});
			} else {
				await archiveProject(project.id);
				toast.success("Proyecto archivado", {
					description: `"${project.name}" se movió al archivo`,
				});
			}
		} catch (_error) {
			toast.error(isArchived ? "Error al restaurar" : "Error al archivar", {
				description: "Intenta nuevamente",
			});
		} finally {
			setIsArchiving(false);
		}
	};

	return (
		<header className="border-b bg-card">
			<div className="container mx-auto px-4 py-6">
				{/* Breadcrumbs */}
				<nav
					className="flex items-center gap-2 mb-4 text-sm"
					aria-label="Breadcrumb"
				>
					<Link
						href="/dashboard"
						className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
					>
						<Home className="h-4 w-4" />
						<span>Dashboard</span>
					</Link>
					<ChevronRight className="h-4 w-4 text-muted-foreground" />
					<span className="text-foreground font-medium truncate max-w-[200px] md:max-w-none">
						{project.name}
					</span>
				</nav>

				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-4">
						<Link href="/dashboard">
							<Button variant="ghost" size="icon" title="Volver al Dashboard">
								<ArrowLeft className="h-4 w-4" />
							</Button>
						</Link>
						<div>
							<div className="flex items-center gap-3 mb-2">
								<h1 className="text-2xl font-bold">{project.name}</h1>
								<Badge
									className={
										statusColors[project.status as keyof typeof statusColors]
									}
								>
									{project.status}
								</Badge>
							</div>
							<div className="flex items-center gap-4 text-sm text-muted-foreground">
								<span>Client: {project.client}</span>
								<span>•</span>
								<span>Type: {project.type}</span>
								<span>•</span>
								<span>Progress: {completion.percentage}%</span>
							</div>
						</div>
					</div>

					<div className="flex items-center space-x-2">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="sm">
									<MoreHorizontal className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem
									onSelect={() => {
										// Small delay to ensure DropdownMenu closes before Dialog opens
										setTimeout(() => setShowEditDialog(true), 0);
									}}
								>
									<Edit className="mr-2 h-4 w-4" />
									Edit Assessment
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() =>
										router.push(routes.project.proposals(project.id))
									}
								>
									<FileText className="mr-2 h-4 w-4" />
									Generate Proposal
								</DropdownMenuItem>
								<DropdownMenuItem>
									<Download className="mr-2 h-4 w-4" />
									Export PDF
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									className="text-destructive focus:text-destructive"
									onSelect={() => {
										// Small delay to ensure DropdownMenu closes before AlertDialog opens
										setTimeout(() => setShowDeleteDialog(true), 0);
									}}
								>
									<Trash2 className="mr-2 h-4 w-4" />
									Delete Project
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>

						<Button
							variant={isArchived ? "secondary" : "ghost"}
							size="sm"
							onClick={handleArchiveToggle}
							disabled={isArchiving}
						>
							{isArchived ? (
								<>
									<RotateCcw className="mr-1.5 h-4 w-4" />
									{isArchiving ? "Restoring..." : "Restore"}
								</>
							) : (
								<>
									<Archive className="mr-1.5 h-4 w-4" />
									{isArchiving ? "Archiving..." : "Archive"}
								</>
							)}
						</Button>
					</div>
				</div>
			</div>

			{isArchived && (
				<div className="border-t border-dashed border-muted-foreground/40 bg-muted/40">
					<div className="container mx-auto px-4 py-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
						<Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
							Archived
						</Badge>
						<span>{archivedLabel}</span>
						<span className="text-xs text-muted-foreground/80">
							Este proyecto está en modo de solo lectura hasta que lo restaures.
						</span>
					</div>
				</div>
			)}

			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Project?</AlertDialogTitle>
						<AlertDialogDescription>
							You are about to delete <strong>{project.name}</strong>. This
							action cannot be undone. All technical data, proposals and
							associated files will be deleted.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							disabled={isDeleting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isDeleting ? "Deleting..." : "Delete Project"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<EditProjectDialog
				open={showEditDialog}
				onOpenChange={setShowEditDialog}
				project={project}
			/>
		</header>
	);
}
