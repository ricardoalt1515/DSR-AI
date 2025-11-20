"use client";

import {
	ClipboardCheck,
	Download,
	Eye,
	FileText,
	Lightbulb,
	Sparkles,
	Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { ProposalsAPI } from "@/lib/api/proposals";
import type { ProjectDetail, ProposalVersion } from "@/lib/project-types";
import { routes } from "@/lib/routes";
import {
	useCurrentProject,
	useLoadProjectAction,
	useTechnicalDataActions,
	useTechnicalSections,
} from "@/lib/stores";
import {
	overallCompletion,
	sectionCompletion,
} from "@/lib/technical-sheet-data";
import { formatCurrency } from "@/lib/utils";
import { logger } from "@/lib/utils/logger";
import { IntelligentProposalGeneratorComponent } from "./intelligent-proposal-generator";

interface Project {
	id: string;
	name: string;
	type: string;
}

interface ProposalsTabProps {
	project: Project;
}

export function ProposalsTab({ project }: ProposalsTabProps) {
	const router = useRouter();
	const storeProject = useCurrentProject();
	const sections = useTechnicalSections(project.id);
	const { loadTechnicalData } = useTechnicalDataActions();
	const loadProject = useLoadProjectAction();

	// Load technical data when component mounts
	useEffect(() => {
		logger.debug(
			"Loading technical data for proposals tab",
			{ projectId: project.id },
			"ProposalsTab",
		);
		loadTechnicalData(project.id);
	}, [project.id, loadTechnicalData]);

	const completion = useMemo(() => {
		const result = overallCompletion(sections);
		logger.debug(
			"Completeness calculation",
			{
				projectId: project.id,
				sectionsCount: sections.length,
				percentage: result.percentage,
			},
			"ProposalsTab",
		);
		return result;
	}, [sections, project.id]);
	const readinessThreshold = 70;
	const isReady = completion.percentage >= readinessThreshold;
	// Only use data from store - no fallback to mock data
	const projectDetail: ProjectDetail | null =
		storeProject && storeProject.id === project.id
			? (storeProject as ProjectDetail)
			: null;

	const prioritizedGaps = useMemo(
		() =>
			sections
				.map((section) => ({ section, stats: sectionCompletion(section) }))
				.filter(({ stats }) => stats.total > 0 && stats.completed < stats.total)
				.sort((a, b) => a.stats.percentage - b.stats.percentage)
				.slice(0, 3),
		[sections],
	);

	const proposals = useMemo(() => {
		if (!projectDetail?.proposals) return [];

		return [...projectDetail.proposals].sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);
	}, [projectDetail?.proposals]);

	const ProposalStatusLabels: Record<ProposalVersion["status"], string> = {
		Draft: "Draft",
		Current: "Current",
		Archived: "Archived",
	};

	const ProposalTypeLabels: Record<ProposalVersion["type"], string> = {
		Conceptual: "Conceptual",
		Technical: "Technical",
		Detailed: "Detailed",
	};

	// Keep component mounted during generation to preserve polling state
	const [isGenerating, setIsGenerating] = useState(false);
	const shouldShowGenerator = isReady || isGenerating;

	// Delete proposal state
	const [deletingProposalId, setDeletingProposalId] = useState<string | null>(
		null,
	);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [proposalToDelete, setProposalToDelete] = useState<{
		id: string;
		title: string;
	} | null>(null);

	const openDeleteDialog = (proposalId: string, proposalTitle: string) => {
		setProposalToDelete({ id: proposalId, title: proposalTitle });
		setShowDeleteDialog(true);
	};

	const handleDeleteProposal = async () => {
		if (!proposalToDelete) return;

		setDeletingProposalId(proposalToDelete.id);
		setShowDeleteDialog(false);

		try {
			await ProposalsAPI.deleteProposal(project.id, proposalToDelete.id);

			toast.success("Proposal deleted", {
				description: `"${proposalToDelete.title}" has been successfully deleted.`,
			});

			// ✅ Reload project data from API (no page refresh needed)
			await loadProject(project.id);
		} catch (error) {
			console.error("Failed to delete proposal:", error);
			toast.error("Deletion error", {
				description: "Could not delete the proposal. Please try again.",
			});
		} finally {
			setDeletingProposalId(null);
			setProposalToDelete(null);
		}
	};

	return (
		<div className="space-y-6">
			{shouldShowGenerator ? (
				<IntelligentProposalGeneratorComponent
					projectId={project.id}
					onProposalGenerated={() => {
						setIsGenerating(false);
					}}
					onGenerationStart={() => setIsGenerating(true)}
					onGenerationEnd={() => setIsGenerating(false)}
				/>
			) : (
				<Card className="alert-warning-card">
					<CardHeader className="space-y-2">
						<CardTitle className="flex items-center gap-2">
							<ClipboardCheck className="h-5 w-5" />
							Before Generating Proposal
						</CardTitle>
						<CardDescription className="opacity-90">
							Complete the technical sheet so the conceptual agent has
							sufficient data.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<Alert variant="default" className="border-warning/30 bg-card/50">
							<Sparkles className="h-4 w-4" />
							<AlertDescription>
								<span className="font-semibold">
									Current progress: {completion.percentage}% complete.
								</span>{" "}
								At least {readinessThreshold}% required.
							</AlertDescription>
						</Alert>
						{prioritizedGaps.length > 0 && (
							<div className="space-y-4">
								<div className="space-y-2 text-sm">
									<p className="font-semibold">
										Completa estas secciones para continuar:
									</p>
									<div className="space-y-2">
										{prioritizedGaps.map(({ section, stats }) => (
											<div
												key={section.id}
												className="flex items-center justify-between p-3 bg-card/60 rounded-lg border border-border/60 backdrop-blur"
											>
												<div>
													<p className="font-medium">{section.title}</p>
													<p className="text-xs text-muted-foreground">
														{stats.completed} de {stats.total} campos
													</p>
												</div>
												<Badge variant="outline" className="border-primary/40">
													{stats.percentage}%
												</Badge>
											</div>
										))}
									</div>
								</div>
							</div>
						)}
						<div className="flex flex-wrap gap-2 mt-4">
							<Button
								size="sm"
								variant="default"
								onClick={() =>
									router.push(routes.project.technical(project.id))
								}
							>
								<Lightbulb className="mr-2 h-4 w-4" />
								Complete Technical Sheet
							</Button>
							<Button
								size="sm"
								variant="outline"
								onClick={() => router.push(routes.project.files(project.id))}
							>
								Import from Files
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			<div className="border-t pt-6">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-semibold">Existing Proposals</h3>
				</div>

				{proposals.length === 0 ? (
					<Card className="border-dashed">
						<CardContent className="flex flex-col items-center justify-center py-12 text-center">
							<div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
								<Lightbulb className="h-8 w-8 text-primary" />
							</div>
							<h3 className="text-lg font-semibold mb-2">
								No Proposals Generated
							</h3>
							<p className="text-muted-foreground max-w-md mb-6">
								Once you complete the technical sheet to {readinessThreshold}%,
								you can generate automated conceptual proposals with AI.
							</p>
							<div className="flex flex-col sm:flex-row gap-3">
								<Button
									onClick={() =>
										router.push(routes.project.technical(project.id))
									}
									variant={isReady ? "default" : "outline"}
								>
									{isReady
										? "Generate First Proposal"
										: "Complete Technical Sheet"}
								</Button>
								<Button
									variant="outline"
									onClick={() =>
										router.push(routes.project.overview(project.id))
									}
								>
									View Project Details
								</Button>
							</div>
						</CardContent>
					</Card>
				) : (
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{proposals.map((proposal) => (
							<Card key={proposal.id}>
								<CardHeader>
									<div className="flex items-start justify-between">
										<div>
											<CardTitle className="text-lg">
												{proposal.title}
											</CardTitle>
											<div className="flex items-center gap-2 mt-2">
												<Badge variant="outline">{proposal.version}</Badge>
												<Badge
													variant={
														proposal.status === "Current"
															? "default"
															: "secondary"
													}
												>
													{ProposalStatusLabels[proposal.status]}
												</Badge>
												<Badge variant="outline">
													{ProposalTypeLabels[proposal.type]}
												</Badge>
											</div>
										</div>
										<FileText className="h-5 w-5 text-muted-foreground" />
									</div>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="text-sm text-muted-foreground">
										Creado el{" "}
										{new Date(proposal.createdAt).toLocaleDateString("es-ES")}
									</div>

									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											className="flex-1 bg-transparent"
											onClick={() =>
												router.push(
													routes.project.proposal.detail(
														project.id,
														proposal.id,
													),
												)
											}
										>
											<Eye className="h-4 w-4 mr-2" />
											View
										</Button>
										<Button
											variant="outline"
											size="sm"
											className="flex-1 bg-transparent"
											onClick={() =>
												router.push(
													routes.project.proposal.pdf(project.id, proposal.id),
												)
											}
										>
											<Download className="h-4 w-4 mr-2" />
											PDF
										</Button>
										<Button
											variant="outline"
											size="sm"
											className="bg-transparent hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
											onClick={() =>
												openDeleteDialog(proposal.id, proposal.title)
											}
											disabled={deletingProposalId === proposal.id}
										>
											{deletingProposalId === proposal.id ? (
												<span className="text-xs">Eliminando...</span>
											) : (
												<Trash2 className="h-4 w-4" />
											)}
										</Button>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</div>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Proposal?</AlertDialogTitle>
						<AlertDialogDescription>
							You are about to delete <strong>{proposalToDelete?.title}</strong>
							. This action cannot be undone and will delete:
							<ul className="mt-2 list-disc list-inside space-y-1">
								<li>The generated PDF file</li>
								<li>All proposal information</li>
								<li>AI transparency data</li>
							</ul>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteProposal}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete Proposal
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
