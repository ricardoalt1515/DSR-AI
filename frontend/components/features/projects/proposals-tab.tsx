"use client";

import {
	ClipboardCheck,
	Download,
	Eye,
	FileText,
	Lightbulb,
	Loader2,
	Sparkles,
	Trash2,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { ProposalSkeleton } from "@/components/ui/proposal-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { proposalsAPI } from "@/lib/api/proposals";
import { mapProposalDtoToUi } from "@/lib/mappers/proposal-mapper";
import type { ProjectDetail, ProjectSummary } from "@/lib/project-types";
import { routes } from "@/lib/routes";
import {
	useCurrentProject,
	useLoadProjectAction,
	useProjectLoading,
} from "@/lib/stores/project-store";
import { useProposalGenerationStore } from "@/lib/stores/proposal-generation-store";
import {
	useTechnicalDataActions,
	useTechnicalSections,
} from "@/lib/stores/technical-data-store";
import {
	overallCompletion,
	PROPOSAL_READINESS_THRESHOLD,
	sectionCompletion,
} from "@/lib/technical-sheet-data";
import type {
	ProposalStatus,
	ProposalType,
	ProposalUI,
} from "@/lib/types/proposal-ui";
import { logger } from "@/lib/utils/logger";
import type { ProposalGeneratorHandle } from "./intelligent-proposal-generator";

const IntelligentProposalGeneratorComponent = dynamic(
	() =>
		import("./intelligent-proposal-generator").then(
			(mod) => mod.IntelligentProposalGeneratorComponent,
		),
	{
		ssr: false,
		loading: () => (
			<div className="space-y-4 p-6 border rounded-lg bg-muted/20">
				<Skeleton className="h-6 w-48" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-10 w-32" />
			</div>
		),
	},
);

type Project = Pick<ProjectSummary, "id" | "name" | "type">;

const ProposalStatusLabels: Record<ProposalStatus, string> = {
	Draft: "Draft",
	Current: "Current",
	Archived: "Archived",
};

const ProposalTypeLabels: Record<ProposalType, string> = {
	Conceptual: "Conceptual",
	Technical: "Technical",
	Detailed: "Detailed",
};

interface ProposalsTabProps {
	project: Project;
}

export function ProposalsTab({ project }: ProposalsTabProps) {
	const router = useRouter();
	const storeProject = useCurrentProject();
	const isLoading = useProjectLoading();
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
	const isReady = completion.percentage >= PROPOSAL_READINESS_THRESHOLD;
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

	const proposals = useMemo<ProposalUI[]>(() => {
		if (!projectDetail?.proposals) return [];

		const mapped: ProposalUI[] = [];

		for (const dto of projectDetail.proposals) {
			try {
				mapped.push(mapProposalDtoToUi(dto));
			} catch (error) {
				logger.error(
					`Skipping invalid proposal (projectId=${project.id}, proposalId=${dto.id})`,
					error,
					"ProposalsTab",
				);
			}
		}

		return mapped.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);
	}, [projectDetail?.proposals, project.id]);

	const { isGenerating, projectId: generatingProjectId } =
		useProposalGenerationStore();
	const isGeneratingForProject =
		isGenerating && generatingProjectId === project.id;
	const shouldShowGenerator = isReady || isGeneratingForProject;

	// Ref to trigger generation from "Generate First Proposal" button
	const generatorRef = useRef<ProposalGeneratorHandle | null>(null);

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
			await proposalsAPI.deleteProposal(project.id, proposalToDelete.id);

			toast.success("Proposal deleted", {
				description: `"${proposalToDelete.title}" has been successfully deleted.`,
			});

			// ✅ Reload project data from API (no page refresh needed)
			await loadProject(project.id);
		} catch (error) {
			logger.error("Failed to delete proposal", error, "ProposalsTab");
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
					triggerRef={generatorRef}
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
								At least {PROPOSAL_READINESS_THRESHOLD}% required.
							</AlertDescription>
						</Alert>
						{prioritizedGaps.length > 0 && (
							<div className="space-y-4">
								<div className="space-y-2 text-sm">
									<p className="font-semibold">
										Complete these sections to continue:
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
														{stats.completed} of {stats.total} fields
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

				{isLoading && !projectDetail ? (
					<ProposalSkeleton count={2} />
				) : proposals.length === 0 ? (
					<Card className="border-dashed bg-gradient-to-br from-card to-muted/20">
						<CardContent className="flex flex-col items-center justify-center py-12 text-center">
							<div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
								{isReady ? (
									<Sparkles className="h-8 w-8 text-primary" />
								) : (
									<Lightbulb className="h-8 w-8 text-muted-foreground" />
								)}
							</div>
							<h3 className="text-lg font-semibold mb-2">
								{isReady ? "Ready to Generate!" : "No Proposals Yet"}
							</h3>
							<p className="text-muted-foreground max-w-md mb-4">
								{isReady
									? "Your questionnaire is complete enough to generate an AI-powered conceptual proposal."
									: `Complete at least ${PROPOSAL_READINESS_THRESHOLD}% of your questionnaire to unlock AI proposal generation.`}
							</p>

							{!isReady && (
								<div className="w-full max-w-xs mb-6">
									<div className="flex justify-between text-xs text-muted-foreground mb-1.5">
										<span>Progress</span>
										<span className="font-medium">
											{completion.percentage}% / {PROPOSAL_READINESS_THRESHOLD}%
										</span>
									</div>
									<div className="h-2 bg-muted rounded-full overflow-hidden">
										<div
											className="h-full bg-primary transition-[width] duration-500 rounded-full"
											style={{
												width: `${Math.min((completion.percentage / PROPOSAL_READINESS_THRESHOLD) * 100, 100)}%`,
											}}
										/>
									</div>
									<p className="text-xs text-muted-foreground mt-2">
										{PROPOSAL_READINESS_THRESHOLD - completion.percentage > 0
											? `${PROPOSAL_READINESS_THRESHOLD - completion.percentage}% more to unlock`
											: "Ready!"}
									</p>
								</div>
							)}

							<div className="flex flex-col sm:flex-row gap-3">
								<Button
									onClick={() => {
										if (isReady) {
											// Trigger the proposal generation
											generatorRef.current?.triggerGeneration();
											// Scroll to generator to show progress
											window.scrollTo({ top: 0, behavior: "smooth" });
										} else {
											// Not ready - go to Questionnaire to complete data
											router.push(routes.project.technical(project.id));
										}
									}}
									variant={isReady ? "default" : "outline"}
								>
									{isReady ? (
										<>
											<Sparkles className="mr-2 h-4 w-4" />
											Generate First Proposal
										</>
									) : (
										"Continue Questionnaire"
									)}
								</Button>
								{!isReady && (
									<Button
										variant="ghost"
										onClick={() =>
											router.push(routes.project.overview(project.id))
										}
									>
										View Overview
									</Button>
								)}
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
													{ProposalTypeLabels[proposal.proposalType]}
												</Badge>
											</div>
										</div>
										<FileText className="h-5 w-5 text-muted-foreground" />
									</div>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="text-sm text-muted-foreground">
										Created on{" "}
										{new Date(proposal.createdAt).toLocaleDateString("en-US")}
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
											onClick={async () => {
												const url = await proposalsAPI.getProposalPDFUrl(
													project.id,
													proposal.id,
													false,
													"internal",
												);
												window.open(url, "_blank");
											}}
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
												<Loader2 className="h-4 w-4 animate-spin" />
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
