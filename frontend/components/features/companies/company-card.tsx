"use client";

/**
 * CompanyCard - Display company summary in a card
 */
import { Building2, MapPin, MoreVertical, Trash2, FolderKanban, Edit } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CompanySummary } from "@/lib/types/company";
import type { ProjectSummary } from "@/lib/project-types";
import { useProjects } from "@/lib/stores";
import { CreateCompanyDialog } from "./create-company-dialog";

interface CompanyCardProps {
	company: CompanySummary;
	onClick?: () => void;
	onDelete?: (companyId: string) => void;
}

export function CompanyCard({ company, onClick, onDelete }: CompanyCardProps) {
	const router = useRouter();
	const allProjects = useProjects();
	const [recentAssessments, setRecentAssessments] = useState<ProjectSummary[]>([]);
	const [editDialogOpen, setEditDialogOpen] = useState(false);

	// Filter assessments for this company
	useEffect(() => {
		const companyAssessments = allProjects
			.filter(p => p.client === company.name)
			.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
			.slice(0, 2);
		setRecentAssessments(companyAssessments);
	}, [allProjects, company.name]);

	const handleCardClick = () => {
		if (onClick) {
			onClick();
		}
	};

	const handleMenuClick = (e: React.MouseEvent) => {
		e.stopPropagation();
	};

	const handleEdit = (e: React.MouseEvent) => {
		e.stopPropagation();
		setEditDialogOpen(true);
	};

	const handleDelete = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (onDelete) {
			onDelete(company.id);
		}
	};

	return (
		<Card
			className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
			onClick={handleCardClick}
		>
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-2">
						<Building2 className="h-5 w-5 text-primary" />
						<CardTitle className="text-lg">{company.name}</CardTitle>
					</div>
					<div className="flex items-center gap-2">
						<Badge variant="outline">{company.industry}</Badge>
						{onDelete && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild onClick={handleMenuClick}>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8"
									>
										<MoreVertical className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem onClick={handleEdit}>
										<Edit className="mr-2 h-4 w-4" />
										Edit
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={handleDelete}
										className="text-destructive focus:text-destructive"
									>
										<Trash2 className="mr-2 h-4 w-4" />
										Delete
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-3">
				{/* Sector/Subsector */}
				{company.sector && company.subsector && (
					<div className="flex flex-wrap gap-2">
						<Badge variant="secondary" className="capitalize">
							{company.sector}
						</Badge>
						<Badge variant="outline" className="text-xs">
							{company.subsector.replace(/_/g, ' ')}
						</Badge>
					</div>
				)}

				{/* Contact Info */}
				{(company.contactName || company.contactEmail || company.contactPhone) && (
					<div className="space-y-1 text-sm">
						{company.contactName && (
							<div className="text-muted-foreground">
								<span className="font-medium">Contact:</span> {company.contactName}
							</div>
						)}
						{company.contactEmail && (
							<div className="text-muted-foreground">
								<span className="font-medium">Email:</span> {company.contactEmail}
							</div>
						)}
						{company.contactPhone && (
							<div className="text-muted-foreground">
								<span className="font-medium">Phone:</span> {company.contactPhone}
							</div>
						)}
					</div>
				)}

				{/* Stats */}
				<div className="flex items-center gap-4 text-sm">
					<div className="flex items-center gap-1">
						<MapPin className="h-4 w-4 text-muted-foreground" />
						<span className="font-medium">{company.locationCount}</span>
						<span className="text-muted-foreground">
							{company.locationCount === 1 ? "location" : "locations"}
						</span>
					</div>
				</div>

				{/* Tags */}
				{company.tags && company.tags.length > 0 && (
					<div className="flex flex-wrap gap-1">
						{company.tags.slice(0, 3).map((tag) => (
							<Badge key={tag} variant="secondary" className="text-xs">
								{tag}
							</Badge>
						))}
						{company.tags.length > 3 && (
							<Badge variant="secondary" className="text-xs">
								+{company.tags.length - 3}
							</Badge>
						)}
					</div>
				)}

				{/* Recent Assessments */}
				{recentAssessments.length > 0 && (
					<div className="space-y-2 pt-2 border-t">
						<div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
							<FolderKanban className="h-3.5 w-3.5" />
							Recent Assessments
						</div>
						<div className="space-y-1.5">
							{recentAssessments.map((assessment) => (
								<div
									key={assessment.id}
									className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
									onClick={(e) => {
										e.stopPropagation();
										router.push(`/project/${assessment.id}`);
									}}
								>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium truncate">{assessment.name}</p>
										<p className="text-xs text-muted-foreground truncate">
											{assessment.location}
										</p>
									</div>
									<Badge variant="outline" className="text-xs capitalize ml-2">
										{assessment.status}
									</Badge>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Footer */}
				<div className="text-xs text-muted-foreground pt-2 border-t">
					Created {new Date(company.createdAt).toLocaleDateString()}
				</div>
			</CardContent>

			{/* Edit Dialog - Reuse CreateCompanyDialog in edit mode (DRY) */}
			{editDialogOpen && (
				<CreateCompanyDialog
					companyToEdit={{
						id: company.id,
						name: company.name,
						industry: company.industry,
						sector: company.sector,
						subsector: company.subsector,
						...(company.contactName && { contactName: company.contactName }),
						...(company.contactEmail && { contactEmail: company.contactEmail }),
						...(company.contactPhone && { contactPhone: company.contactPhone }),
						...(company.notes && { notes: company.notes }),
					}}
					onSuccess={() => {
						setEditDialogOpen(false);
						// Store will auto-refresh
					}}
				/>
			)}
		</Card>
	);
}
