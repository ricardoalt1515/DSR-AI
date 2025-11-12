import { ClipboardList } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatNumber, formatUSD } from "@/lib/utils";
import type { AIMetadata } from "../types";

interface ProvenCasesCardProps {
	provenCases?: any[]; // Legacy field - no longer used in new schema
}

const PROVEN_CASES_SCROLL_HEIGHT = 220;

/**
 * Displays reference cases used by AI for proposal generation
 * Shows similarity scores and historical performance data
 */
export function ProvenCasesCard({ provenCases }: ProvenCasesCardProps) {
	// Legacy component - provenCases no longer used in new schema
	if (!provenCases || provenCases.length === 0) {
		return null;
	}

	return (
		<Card className="h-full">
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
					<ClipboardList className="h-4 w-4" />
					Reference cases
				</CardTitle>
				<CardDescription>
					Similar projects used for AI analysis
				</CardDescription>
			</CardHeader>
			<CardContent className="px-0 pb-0">
				<ScrollArea
					className="px-6"
					style={{ height: PROVEN_CASES_SCROLL_HEIGHT }}
				>
					<ul className="space-y-4">
						{provenCases.map((reference: any) => (
							<li
								key={`${reference.projectName}-${reference.treatmentTrain}-${reference.applicationType}`}
								className="rounded-lg border border-border/70 bg-card/60 p-4"
							>
								<div className="flex items-center justify-between text-xs text-muted-foreground">
									<span>{reference.applicationType}</span>
									{reference.similarityScore && (
										<span>
											Similarity {formatNumber(reference.similarityScore)}%
										</span>
									)}
								</div>
								<p className="mt-2 text-sm font-medium text-foreground">
									{reference.projectName ?? "Unnamed case"}
								</p>
								<p className="mt-1 text-xs text-muted-foreground">
									Train: {reference.treatmentTrain}
								</p>
								{reference.capexUsd && (
									<p className="mt-1 text-xs text-muted-foreground">
										Approx. CAPEX {formatUSD(reference.capexUsd)}
									</p>
								)}
							</li>
						))}
					</ul>
				</ScrollArea>
			</CardContent>
		</Card>
	);
}
