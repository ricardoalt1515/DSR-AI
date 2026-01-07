"use client";

import { ArrowLeft, Download, ListChecks, FileText } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ProposalOverview } from "./proposal-overview";
import { ExternalReportView } from "./external-report-view";
import { ReportAudienceToggle, type ReportAudience } from "./report-audience-toggle";
import { QuickActionsCard } from "./sidebar";
import type { Project, Proposal } from "./types";

interface ProposalPageProps {
	proposal: Proposal;
	project: Project;
	isLoading?: boolean;
	onStatusChange?: (newStatus: string) => void;
	onDownloadPDF?: (audience?: ReportAudience) => void;
}

const STATUS_BADGE_VARIANT: Record<
	Proposal["status"],
	"default" | "secondary" | "outline"
> = {
	Draft: "outline",
	Current: "default",
	Archived: "secondary",
};

export function ProposalPage({
	proposal,
	project,
	isLoading = false,
	onStatusChange,
	onDownloadPDF,
}: ProposalPageProps) {
	const [isChecklistOpen, setIsChecklistOpen] = useState(false);
	const [audience, setAudience] = useState<ReportAudience>("internal");

	if (isLoading) {
		return <ProposalPageSkeleton />;
	}

	const handleDownloadPDF = (targetAudience: ReportAudience) => {
		if (onDownloadPDF) {
			onDownloadPDF(targetAudience);
		}
	};

	return (
		<div className="min-h-screen bg-muted/10">
			{/* Header */}
			<header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-md">
				<div className="container mx-auto flex flex-wrap items-center justify-between gap-4 px-4 py-4">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
						<Link
							href={`/project/${project.id}`}
							className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
						>
							<ArrowLeft className="h-4 w-4" />
							Back to {project.name}
						</Link>
						<div>
							<div className="flex flex-wrap items-center gap-3">
								<h1 className="text-xl font-semibold md:text-2xl">
									{proposal.title}
								</h1>
								<div className="flex flex-wrap items-center gap-2">
									<Badge variant={STATUS_BADGE_VARIANT[proposal.status]}>
										{proposal.status}
									</Badge>
									<Badge variant="secondary">{proposal.proposalType}</Badge>
								</div>
							</div>
							<div className="mt-1 text-xs text-muted-foreground md:text-sm">
								Generated on {formatDateTime(proposal.createdAt)} · Version{" "}
								{proposal.version}
							</div>
						</div>
					</div>

					{/* Actions */}
					<div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
						{/* Report Audience Toggle */}
						<ReportAudienceToggle
							value={audience}
							onValueChange={setAudience}
						/>

						{/* PDF Download Dropdown */}
						{onDownloadPDF && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button className="gap-2">
										<Download className="h-4 w-4" />
										Download PDF
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem onClick={() => handleDownloadPDF("internal")}>
										<FileText className="h-4 w-4 mr-2" />
										Internal Report
									</DropdownMenuItem>
									<DropdownMenuItem onClick={() => handleDownloadPDF("external")}>
										<FileText className="h-4 w-4 mr-2" />
										Client Report
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						)}

						{/* Checklist Drawer */}
						<Drawer open={isChecklistOpen} onOpenChange={setIsChecklistOpen}>
							<Button
								variant="outline"
								className="gap-2"
								onClick={() => setIsChecklistOpen(true)}
							>
								<ListChecks className="h-4 w-4" />
								Checklist
							</Button>
							<DrawerContent className="px-4 pb-6">
								<DrawerHeader className="items-start text-left">
									<DrawerTitle>Project checklist</DrawerTitle>
									<CardDescription>
										Quick actions to align with the team.
									</CardDescription>
								</DrawerHeader>
								<div className="space-y-4">
									<QuickActionsCard
										proposal={proposal}
										onDownloadPDF={() => handleDownloadPDF(audience)}
										onStatusChange={onStatusChange}
										closeDrawer={() => setIsChecklistOpen(false)}
									/>
								</div>
							</DrawerContent>
						</Drawer>
					</div>
				</div>
			</header>

			{/* Main Content - Conditional View */}
			<main className="container mx-auto px-4 py-6 lg:py-8">
				{audience === "internal" ? (
					<ProposalOverview proposal={proposal} />
				) : (
					<ExternalReportView proposal={proposal} />
				)}
			</main>
		</div>
	);
}

/**
 * Loading skeleton for proposal page
 */
function ProposalPageSkeleton() {
	return (
		<div className="min-h-screen bg-background">
			<div className="border-b bg-card/50">
				<div className="container mx-auto px-4 py-3">
					<Skeleton className="h-5 w-40" />
				</div>
			</div>

			<div className="container mx-auto px-4 py-8">
				<div className="space-y-6">
					<Skeleton className="h-20 w-full" />
					<Skeleton className="h-72 w-full" />
					<Skeleton className="h-64 w-full" />
				</div>
			</div>
		</div>
	);
}

/**
 * Format date-time for display
 */
function formatDateTime(value: string): string {
	return new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}

