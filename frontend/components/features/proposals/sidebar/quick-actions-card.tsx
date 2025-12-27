import { Download, ListChecks, ShieldCheck, Target } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { DecisionActionButton } from "../shared/decision-action-button";
import type { Proposal } from "../types";

interface QuickActionsCardProps {
	proposal: Proposal;
	onDownloadPDF: (() => void) | undefined;
	onStatusChange: ((newStatus: string) => void) | undefined;
	closeDrawer?: (() => void) | undefined;
}

/**
 * Quick actions card for waste upcycling proposal decisions
 * Provides download PDF and mark as current actions
 */
export function QuickActionsCard({
	proposal,
	onDownloadPDF,
	onStatusChange,
	closeDrawer,
}: QuickActionsCardProps) {
	const handleDownload = () => {
		if (!onDownloadPDF) return;
		onDownloadPDF();
		closeDrawer?.();
	};

	const handleSetCurrent = () => {
		if (!onStatusChange) return;
		onStatusChange("Current");
		closeDrawer?.();
	};

	const report = proposal.aiMetadata.proposal as any;
	const hasPathways =
		(report.businessOpportunity?.circularEconomyOptions?.length || 0) > 0;

	return (
		<Card>
			<CardHeader className="pb-4">
				<CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
					<ListChecks className="h-4 w-4" />
					Quick actions
				</CardTitle>
				<CardDescription>
					Next steps based on the feasibility analysis
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3 text-sm">
				<DecisionActionButton
					icon={Download}
					label="Download PDF report"
					description="Complete waste upcycling feasibility report with ROI analysis."
					onAction={handleDownload}
					disabled={!onDownloadPDF}
				/>
				<Separator />
				<DecisionActionButton
					icon={ShieldCheck}
					label="Mark as current proposal"
					description="Set this version as the reference for implementation."
					onAction={handleSetCurrent}
					disabled={!onStatusChange || proposal.status === "Current"}
				/>
				<Separator />
				<div className="flex items-start gap-3 rounded-lg bg-muted/40 p-3">
					<Tooltip delayDuration={200}>
						<TooltipTrigger asChild>
							<div className="rounded-full bg-primary/15 p-2">
								<Target className="h-4 w-4 text-primary" />
							</div>
						</TooltipTrigger>
						<TooltipContent>
							Review recommendations before implementation
						</TooltipContent>
					</Tooltip>
					<div className="space-y-1">
						<p className="text-sm font-medium">
							{hasPathways ? "Pathways identified" : "Limited opportunities"}
						</p>
						<p className="text-xs text-muted-foreground leading-tight">
							{hasPathways
								? "Review strategic recommendations and cost estimates to prioritize implementation."
								: "Consider refining questionnaire data or exploring alternative waste streams."}
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
