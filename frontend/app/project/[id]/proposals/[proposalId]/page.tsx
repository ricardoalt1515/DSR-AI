/**
 * Proposal Detail Page - Next.js 15 App Router page
 *
 * Simplified to use the modular ProposalDetail component.
 * Handles data fetching and delegates UI rendering to the component.
 */

"use client";

import { notFound } from "next/navigation";
import { use, useEffect, useState } from "react";
import { ProposalDetail } from "@/components/features/proposals";
import type { Proposal } from "@/components/features/proposals/types";
import { ProposalsAPI } from "@/lib/api/proposals";
import { useCurrentProject } from "@/lib/stores";

interface PageProps {
	params: Promise<{ id: string; proposalId: string }>;
}

export default function ProposalDetailPage({ params }: PageProps) {
	const { id: projectId, proposalId } = use(params);
	const project = useCurrentProject();
	const [proposal, setProposal] = useState<Proposal | null>(null);
	const [loading, setLoading] = useState(true);

	// Fetch proposal data
	useEffect(() => {
		if (!project) return;

		// Try to find in store first (faster)
		const storeProposal = project.proposals?.find((p) => p.id === proposalId);

		if (storeProposal) {
			setProposal(storeProposal as unknown as Proposal);
			setLoading(false);
		} else {
			// Fallback to API if not in store
			ProposalsAPI.getProposal(projectId, proposalId)
				.then((apiProposal) => {
					setProposal(apiProposal as unknown as Proposal);
					setLoading(false);
				})
				.catch(() => {
					// Error handled by API client logger
					setLoading(false);
				});
		}
	}, [project, projectId, proposalId]);

	// Loading state
	if (loading || !project) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
					<p className="text-muted-foreground">Cargando propuesta...</p>
				</div>
			</div>
		);
	}

	// 404 if proposal not found
	if (!proposal) {
		notFound();
	}

	/**
	 * Handle status change (set as current, archive, etc.)
	 * Note: Backend doesn't support status updates yet, so this is a no-op
	 */
	const handleStatusChange = async (_newStatus: string) => {
		// Feature pending: Backend doesn't support proposal status updates yet
		return;
	};

	/**
	 * Handle PDF download
	 */
	const handleDownloadPDF = async () => {
		const blob = await ProposalsAPI.downloadProposalPDF(projectId, proposalId);

		// Create download link
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `Proposal_${proposal.version}_${project.name.replace(/\s+/g, "_")}.pdf`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		// Cleanup
		URL.revokeObjectURL(url);
	};

	return (
		<ProposalDetail
			proposal={proposal}
			project={project}
			isLoading={loading}
			onStatusChange={handleStatusChange}
			onDownloadPDF={handleDownloadPDF}
		/>
	);
}
