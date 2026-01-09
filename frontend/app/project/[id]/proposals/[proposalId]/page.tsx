/**
 * Proposal Detail Page - Next.js 15 App Router page
 *
 * Production-grade data fetching with proper error handling.
 * - Local loading/error states (not dependent on global store)
 * - Separate handling for 404 vs transient errors
 * - Guards to prevent unnecessary refetches
 */

"use client";

import { notFound } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ProposalDetail } from "@/components/features/proposals";
import type { Proposal } from "@/components/features/proposals/types";
import type { ReportAudience } from "@/components/features/proposals/report-audience-toggle";
import { ProposalsAPI } from "@/lib/api/proposals";
import { APIClientError, API_ERROR_CODES } from "@/lib/api/client";
import { projectsAPI } from "@/lib/api/projects";
import { useCurrentProject } from "@/lib/stores";
import { Button } from "@/components/ui/button";
import type { ProjectDetail } from "@/lib/project-types";
import { useLatestRequest } from "@/lib/hooks/use-latest-request";
import { mapProposalDtoToUi } from "@/lib/mappers/proposal-mapper";

interface PageProps {
	params: { id: string; proposalId: string };
}

function CenteredSpinner({ label }: { label: string }) {
	return (
		<div className="flex items-center justify-center min-h-screen">
			<div className="text-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
				<p className="text-muted-foreground">{label}</p>
			</div>
		</div>
	);
}

function ErrorState({
	title,
	message,
	onRetry,
}: {
	title: string;
	message?: string | undefined;
	onRetry: () => void;
}) {
	return (
		<div className="flex items-center justify-center min-h-screen">
			<div className="text-center space-y-4">
				<p className="text-destructive">{title}</p>
				{message && <p className="text-sm text-muted-foreground">{message}</p>}
				<Button onClick={onRetry}>Retry</Button>
			</div>
		</div>
	);
}

export default function ProposalDetailPage({ params }: PageProps) {
	const { id: projectId, proposalId } = params;
	const storeProject = useCurrentProject();

	// Local state (scoped to this component, not global)
	const [project, setProject] = useState<ProjectDetail | null>(null);
	const [projectLoading, setProjectLoading] = useState(true);
	const [projectError, setProjectError] = useState<string | null>(null);
	const [projectNotFound, setProjectNotFound] = useState(false);

	const [proposal, setProposal] = useState<Proposal | null>(null);
	const [proposalLoading, setProposalLoading] = useState(true);
	const [proposalError, setProposalError] = useState<string | null>(null);
	const [proposalNotFound, setProposalNotFound] = useState(false);
	// Last-request-wins guards for async fetches
	const {
		startRequest: startProjectRequest,
		isLatest: isLatestProjectRequest,
		invalidate: invalidateProjectRequest,
	} = useLatestRequest();
	const {
		startRequest: startProposalRequest,
		isLatest: isLatestProposalRequest,
		invalidate: invalidateProposalRequest,
	} = useLatestRequest();

	// Load project with race condition protection
	const loadProjectData = useCallback(async () => {
		const requestId = startProjectRequest();

		setProjectLoading(true);
		setProjectError(null);
		setProjectNotFound(false);

		try {
			// Check store first
			if (storeProject?.id === projectId) {
				if (isLatestProjectRequest(requestId)) {
					setProject(storeProject);
				}
				return;
			}

			const apiProject = await projectsAPI.getProject(projectId);
			if (isLatestProjectRequest(requestId)) {
				setProject(apiProject);
			}
		} catch (err) {
			if (!isLatestProjectRequest(requestId)) return;

			const isNotFound =
				err instanceof APIClientError && err.code === API_ERROR_CODES.NOT_FOUND;
			if (isNotFound) {
				setProjectNotFound(true);
			} else {
				const message = err instanceof Error ? err.message : "Failed to load project";
				setProjectError(message);
			}
		} finally {
			if (isLatestProjectRequest(requestId)) {
				setProjectLoading(false);
			}
		}
	}, [projectId, startProjectRequest, isLatestProjectRequest, storeProject]);

	// Load proposal with race condition protection
	const loadProposalData = useCallback(async () => {
		if (proposal?.id === proposalId) return; // Guard: don't refetch the same proposal

		const requestId = startProposalRequest();

		setProposalLoading(true);
		setProposalError(null);
		setProposalNotFound(false);

		try {
			// Check store first
			if (storeProject?.id === projectId) {
				const storeProposal = storeProject.proposals?.find((p) => p.id === proposalId);
				if (storeProposal) {
					if (isLatestProposalRequest(requestId)) {
						setProposal(mapProposalDtoToUi(storeProposal));
					}
					return;
				}
			}

			const apiProposal = await ProposalsAPI.getProposal(projectId, proposalId);
			if (isLatestProposalRequest(requestId)) {
				setProposal(mapProposalDtoToUi(apiProposal));
			}
		} catch (err) {
			if (!isLatestProposalRequest(requestId)) return;

			const isNotFound =
				err instanceof APIClientError && err.code === API_ERROR_CODES.NOT_FOUND;
			if (isNotFound) {
				setProposalNotFound(true);
			} else {
				const message = err instanceof Error ? err.message : "Failed to load proposal";
				setProposalError(message);
			}
		} finally {
			if (isLatestProposalRequest(requestId)) {
				setProposalLoading(false);
			}
		}
	}, [
		projectId,
		proposalId,
		startProposalRequest,
		isLatestProposalRequest,
		proposal,
		storeProject,
	]);

	// Initial data load
	useEffect(() => {
		void loadProjectData();
		return () => {
			// Invalidate any in-flight request to avoid setState after unmount
			invalidateProjectRequest();
		};
	}, [loadProjectData]);

	useEffect(() => {
		void loadProposalData();
		return () => {
			// Invalidate any in-flight request to avoid setState after unmount
			invalidateProposalRequest();
		};
	}, [loadProposalData]);

	// --- Render states ---

	// Proposal loading
	if (proposalLoading) {
		return <CenteredSpinner label="Loading proposal..." />;
	}

	// Proposal error (transient - show retry)
	if (proposalError) {
		return (
			<ErrorState
				title="Failed to load proposal"
				message={proposalError}
				onRetry={() => {
					setProposal(null); // Reset guard
					void loadProposalData();
				}}
			/>
		);
	}

	// Proposal 404 (permanent - trigger Next.js notFound)
	if (proposalNotFound) {
		notFound();
	}

	// Project loading
	if (projectLoading) {
		return <CenteredSpinner label="Loading project..." />;
	}

	// Project 404 (permanent - trigger Next.js notFound)
	if (projectNotFound) {
		notFound();
	}

	// Project error (transient - show retry)
	if (projectError || !project) {
		return (
			<ErrorState
				title="Failed to load project"
				message={projectError ?? undefined}
				onRetry={loadProjectData}
			/>
		);
	}

	// Should not happen, but TypeScript guard
	if (!proposal) {
		notFound();
	}

	// --- Handlers ---

	const handleStatusChange = async (_newStatus: string) => {
		// Feature pending: Backend doesn't support proposal status updates yet
		return;
	};

	const handleDownloadPDF = async (audience: ReportAudience = "internal") => {
		const audienceLabel = audience === "internal" ? "Internal" : "Client";

		try {
			toast.loading(`Generating ${audienceLabel} PDF...`, { id: "pdf-download" });

			const url = await ProposalsAPI.getProposalPDFUrl(
				projectId,
				proposalId,
				false,
				audience,
			);

			window.open(url, "_blank");

			toast.success(`${audienceLabel} PDF opened`, { id: "pdf-download" });
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			toast.error(`Failed to download PDF: ${message}`, { id: "pdf-download" });
		}
	};

	return (
		<ProposalDetail
			proposal={proposal}
			project={project}
			isLoading={proposalLoading}
			onStatusChange={handleStatusChange}
			onDownloadPDF={handleDownloadPDF}
		/>
	);
}
