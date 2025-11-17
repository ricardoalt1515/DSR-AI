"use client";

import {
	Archive,
	Briefcase,
	Building,
	Calendar,
	Clock,
	Download,
	Edit,
	Factory,
	FileText,
	Home,
	MapPin,
	MoreHorizontal,
	RotateCcw,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import type React from "react";
import { memo, useMemo, useState } from "react";
import { toast } from "sonner";
import { ProjectProgressIndicator } from "@/components/features/projects";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	getProjectStatusDescription,
	getProjectStatusLabel,
} from "@/lib/project-status";
import type { ProjectSector, ProjectStatus } from "@/lib/project-types";
import { useProjectActions, useTechnicalSections } from "@/lib/stores";
import { overallCompletion } from "@/lib/technical-sheet-data";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
	id: string;
	name: string;
	client: string;
	sector: ProjectSector;
	location: string;
	// NEW: Computed from relationships
	companyName?: string;
	locationName?: string;
	status: ProjectStatus;
	progress: number;
	updatedAt: string;
	createdAt: string;
	proposalsCount?: number;
	isArchived?: boolean;
	archivedAt?: string | null;
	className?: string;
}

const sectorIcons: Record<
	string,
	React.ComponentType<{ className?: string }>
> = {
	Municipal: Building,
	Industrial: Factory,
	Residential: Home,
	Commercial: Briefcase,
	// Fallbacks for lowercase (backwards compatibility)
	municipal: Building,
	industrial: Factory,
	residential: Home,
	commercial: Briefcase,
};

type PrimaryAction = {
	label: string;
	href: string;
	variant?: "default" | "outline";
};

const ProjectCard = memo(function ProjectCard({
	id,
	name,
	client,
	sector,
	location,
	companyName,
	locationName,
	status,
	progress: _progress, // Not used - using dynamic completion instead
	updatedAt,
	createdAt,
	proposalsCount = 0,
	isArchived = false,
	archivedAt,
	className,
}: ProjectCardProps) {
	const { deleteProject, archiveProject, restoreProject } = useProjectActions();
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isArchiving, setIsArchiving] = useState(false);

	// ✅ Calculate progress dynamically from technical sections
	const sections = useTechnicalSections(id);
	const completion = overallCompletion(sections);

	const statusLabel = useMemo(() => getProjectStatusLabel(status), [status]);
	const statusDescription = useMemo(
		() => getProjectStatusDescription(status),
		[status],
	);
	const SectorIcon = useMemo(() => sectorIcons[sector] || Building, [sector]);
	const formattedCreatedDate = useMemo(
		() => new Date(createdAt).toLocaleDateString("en-US"),
		[createdAt],
	);
	const formattedUpdatedAt = useMemo(
		() => new Date(updatedAt).toLocaleDateString("en-US"),
		[updatedAt],
	);

	// ✅ Use calculated progress, not prop
	const formattedProgress = completion.percentage;

	const primaryAction: PrimaryAction = useMemo(() => {
		switch (status) {
			case "In Preparation":
				return { label: "Complete Sheet", href: `/project/${id}` };
			case "Generating Proposal":
				return { label: "View Progress", href: `/project/${id}` };
			case "Proposal Ready":
				return { label: "View Proposal", href: `/project/${id}` };
			case "In Development":
				return { label: "Open Project", href: `/project/${id}` };
			case "Completed":
				return {
					label: "View Documentation",
					href: `/project/${id}`,
					variant: "outline",
				};
			default:
				return { label: "Review", href: `/project/${id}`, variant: "outline" };
		}
	}, [status, id]);

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			await deleteProject(id);
			toast.success("Assessment deleted", {
				description: `"${name}" has been successfully deleted`,
			});
			setShowDeleteDialog(false);
		} catch (_error) {
			toast.error("Deletion error", {
				description: "Could not delete the assessment. Please try again.",
			});
		} finally {
			setIsDeleting(false);
		}
	};

	const archiveLabel = isArchived
		? archivedAt
			? `Archived ${new Date(archivedAt).toLocaleDateString("en-US")}`
			: "Archived"
		: null;

	const handleArchiveToggle = async () => {
		setIsArchiving(true);
		try {
			if (isArchived) {
				await restoreProject(id);
				toast.success("Assessment restored", {
					description: `"${name}" is back in the portfolio`,
				});
			} else {
				await archiveProject(id);
				toast.success("Assessment archived", {
					description: `"${name}" moved to archive`,
				});
			}
		} catch (_error) {
			toast.error(isArchived ? "Restore failed" : "Archive failed", {
				description: "Please try again",
			});
		} finally {
			setIsArchiving(false);
		}
	};

	return (
		<Card
			className={cn(
				"group relative flex h-full flex-col bg-card/80 backdrop-blur-sm border border-border/50 shadow-lg hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 overflow-hidden",
				isArchived && "border-dashed border-muted-foreground/50 opacity-90",
				className,
			)}
		>
			<div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
			<CardHeader className="relative flex flex-col gap-4 border-b border-border/30 bg-gradient-to-br from-card/50 to-card/30 py-4 backdrop-blur-sm">
				<div className="flex items-start justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 shadow-lg group-hover:shadow-xl transition-all duration-300 hover:animate-pulse">
							<SectorIcon className="h-5 w-5 text-primary group-hover:scale-110 transition-transform duration-300" />
						</div>
						<div className="space-y-1">
							<Link href={`/project/${id}`} className="hover:underline">
								<h3 className="text-base font-semibold leading-tight text-foreground">
									{name}
								</h3>
							</Link>
							<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
								<span className="flex items-center gap-1">
									<Building className="h-3.5 w-3.5" />
									{companyName || client}
								</span>
								<span>→</span>
								<span className="flex items-center gap-1">
									<MapPin className="h-3.5 w-3.5" />
									{locationName || location}
								</span>
							</div>
						</div>
					</div>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="h-8 w-8">
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-56">
							<DropdownMenuItem asChild>
								<Link href={`/project/${id}`}>
									<Edit className="mr-2 h-4 w-4" />
									Edit Assessment
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Link href={`/project/${id}`}>
									<FileText className="mr-2 h-4 w-4" />
									Proposals ({proposalsCount})
								</Link>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem asChild>
								<Link href={`/project/${id}`}>
									<Download className="mr-2 h-4 w-4" />
									Export Summary
								</Link>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="text-primary focus:text-primary"
								onSelect={(event) => {
									event.preventDefault();
									if (!isArchiving) {
										void handleArchiveToggle();
									}
								}}
							>
								{isArchived ? (
									<RotateCcw className="mr-2 h-4 w-4" />
								) : (
									<Archive className="mr-2 h-4 w-4" />
								)}
								{isArchived ? "Restore to active" : "Archive assessment"}
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="text-destructive focus:text-destructive"
								onSelect={(e) => {
									e.preventDefault();
									setShowDeleteDialog(true);
								}}
							>
								<Trash2 className="mr-2 h-4 w-4" />
								Delete Assessment
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<Badge
						variant="outline"
						className={cn(
							"text-xs border-primary/30 bg-primary/10 hover:bg-primary/20 transition-colors duration-300",
							isArchived &&
								"border-dashed border-muted-foreground/40 bg-muted/60 text-muted-foreground",
							status === "Proposal Ready" && "status-ready",
							status === "In Development" && "status-active",
							status === "On Hold" && "status-warning",
						)}
					>
						{statusLabel}
					</Badge>
					<span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors duration-300">
						{statusDescription}
					</span>
					{isArchived && (
						<Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
							Archived
						</Badge>
					)}
				</div>
				{archiveLabel && (
					<p className="text-[11px] text-muted-foreground italic">
						{archiveLabel}
					</p>
				)}

				<ProjectProgressIndicator status={status} />
			</CardHeader>

			<CardContent className="relative flex flex-1 flex-col gap-5 py-5 bg-gradient-to-b from-transparent to-card/20">
				<div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
					<div className="flex items-center gap-1.5">
						<Calendar className="h-3.5 w-3.5" />
						Created {formattedCreatedDate}
					</div>
					<div className="flex items-center gap-1.5">
						<Clock className="h-3.5 w-3.5" />
						Updated {formattedUpdatedAt}
					</div>
				</div>

				<div className="bg-muted/30 backdrop-blur-sm rounded-lg p-3 hover:bg-muted/50 transition-colors duration-300">
					<div className="flex items-center justify-between text-sm">
						<div>
							<p className="font-medium text-foreground">Capture Progress</p>
							<p className="text-xs text-muted-foreground group-hover:text-foreground/80 transition-colors duration-300">
								{formattedProgress >= 100
									? "Technical sheet complete"
									: `${formattedProgress}% complete`}
							</p>
						</div>
						<Badge
							variant="secondary"
							className="text-xs bg-primary/20 text-primary border-primary/30"
						>
							{formattedProgress}%
						</Badge>
					</div>
				</div>

				<div className="bg-muted/30 backdrop-blur-sm rounded-lg p-3 hover:bg-muted/50 transition-colors duration-300">
					<div className="flex items-center justify-between text-sm">
						<div>
							<p className="font-medium text-foreground">AI Proposals</p>
							<p className="text-xs text-muted-foreground group-hover:text-foreground/80 transition-colors duration-300">
								{proposalsCount > 0
									? `${proposalsCount} versions registered`
									: "No proposals generated yet"}
							</p>
						</div>
						<Badge
							variant="secondary"
							className="text-xs bg-success/20 text-success border-success/30"
						>
							{proposalsCount}
						</Badge>
					</div>
				</div>

				<div className="mt-auto flex flex-col gap-2">
					<Link
						href={primaryAction.href}
						className={cn(
							buttonVariants({
								size: "sm",
								variant: primaryAction.variant ?? "default",
							}),
							"bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300",
						)}
					>
						{primaryAction.label}
					</Link>
					<Link
						href={`/project/${id}`}
						className={cn(
							buttonVariants({ size: "sm", variant: "ghost" }),
							"hover:bg-primary/10 hover:text-primary transition-all duration-300",
						)}
					>
						View Details
					</Link>
				</div>
			</CardContent>

			<ConfirmDeleteDialog
				open={showDeleteDialog}
				onOpenChange={setShowDeleteDialog}
				onConfirm={handleDelete}
				title="Delete Assessment"
				description={`This will permanently delete all technical information, ${proposalsCount} proposal${proposalsCount !== 1 ? 's' : ''}, attached files, and change history. This action cannot be undone.`}
				itemName={name}
				loading={isDeleting}
			/>
		</Card>
	);
});

export { ProjectCard };
