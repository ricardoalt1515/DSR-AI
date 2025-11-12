import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ComplianceSnapshotCardProps {
	compliance: boolean | undefined;
	criticalParameters: string[];
}

/**
 * Displays regulatory compliance status
 * Shows validation against NOM-001 and critical parameters
 */
export function ComplianceSnapshotCard({
	compliance,
	criticalParameters,
}: ComplianceSnapshotCardProps) {
	return (
		<Card className="h-full">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
					<ShieldCheck className="h-4 w-4" />
					Regulatory compliance
				</CardTitle>
				<CardDescription>
					Automatic validation against NOM-001 and internal operating limits.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4 text-sm">
				<div
					className={cn(
						"rounded-lg border p-4",
						compliance === undefined && "border-border/70 bg-muted/40",
						compliance === true && "border-success/40 bg-success/12",
						compliance === false && "border-destructive/40 bg-destructive/10",
					)}
				>
					<p className="text-base font-semibold">
						{compliance === undefined
							? "Result pending validation"
							: compliance
								? "Proposal compliant"
								: "Attention: parameters out of specification"}
					</p>
					<p className="mt-1 text-xs text-muted-foreground">
						{compliance === undefined
							? "Validate critical parameters to confirm regulatory compliance."
							: compliance
								? "The agent confirmed the proposed parameters meet the target regulation."
								: "Review the flagged parameters and evaluate treatment train adjustments."}
					</p>
				</div>
				{criticalParameters.length > 0 && (
					<div className="space-y-2">
						<p className="font-medium">Parameters under watch</p>
						<ul className="flex flex-wrap gap-2">
							{criticalParameters.map((parameter) => (
								<Badge key={parameter} variant="outline">
									{parameter}
								</Badge>
							))}
						</ul>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
