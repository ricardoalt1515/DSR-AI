"use client";

import { AlertTriangle, CheckCircle2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	useIntakePanelStore,
	useSuggestionStats,
} from "@/lib/stores/intake-store";
import { cn } from "@/lib/utils";

interface IntakeSummaryBarProps {
	onApplyHighConfidence: (ids: string[]) => Promise<void>;
	onAutoResolveConflicts?: (result: {
		winnerIds: string[];
		loserIds: string[];
	}) => Promise<void>;
	disabled?: boolean;
	className?: string;
}

/**
 * Summary bar showing suggestion stats with primary "Apply all" CTA.
 * Displays pending count, high-confidence count, and conflicts.
 */
export function IntakeSummaryBar({
	onApplyHighConfidence,
	onAutoResolveConflicts,
	disabled = false,
	className,
}: IntakeSummaryBarProps) {
	const stats = useSuggestionStats();
	const applyHighConfidence = useIntakePanelStore(
		(s) => s.applyHighConfidenceSuggestions,
	);
	const autoResolveAll = useIntakePanelStore((s) => s.autoResolveAllConflicts);

	const handleApplyHighConfidence = async () => {
		const affectedIds = applyHighConfidence();
		if (affectedIds.length > 0) {
			await onApplyHighConfidence(affectedIds);
		}
	};

	const handleAutoResolve = async () => {
		const { resolvedCount, winnerIds, loserIds } = autoResolveAll();
		if (
			(winnerIds.length > 0 || loserIds.length > 0) &&
			onAutoResolveConflicts
		) {
			await onAutoResolveConflicts({ winnerIds, loserIds });
		}
		return resolvedCount;
	};

	if (stats.pendingCount === 0) {
		return null;
	}

	return (
		<div
			className={cn(
				"flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-muted/30",
				className,
			)}
		>
			{/* Stats */}
			<div className="flex flex-wrap items-center gap-4 text-sm min-w-0">
				<div className="flex items-center gap-1.5">
					<Sparkles className="h-4 w-4 text-primary" />
					<span className="font-medium">{stats.pendingCount} pending</span>
				</div>

				{stats.highConfCount > 0 && (
					<div className="flex items-center gap-1.5 text-success">
						<CheckCircle2 className="h-3.5 w-3.5" />
						<span>{stats.highConfCount} high-conf</span>
					</div>
				)}

				{stats.mediumConfCount > 0 && (
					<div className="flex items-center gap-1.5 text-warning">
						<span className="h-2 w-2 rounded-full bg-warning" />
						<span>{stats.mediumConfCount} medium</span>
					</div>
				)}

				{stats.conflictCount > 0 && (
					<div className="flex items-center gap-1.5 text-destructive">
						<AlertTriangle className="h-3.5 w-3.5" />
						<span>{stats.conflictCount} conflicts</span>
					</div>
				)}
			</div>

			{/* Action buttons */}
			<div className="flex flex-wrap items-center justify-end gap-2 min-w-0">
				{/* Auto-resolve conflicts button */}
				{stats.conflictCount > 0 && (
					<Button
						variant="outline"
						size="sm"
						className="h-8 gap-1.5 shrink min-w-0"
						onClick={handleAutoResolve}
						disabled={disabled}
					>
						<Wand2 className="h-3.5 w-3.5" />
						Auto-resolve ({stats.conflictCount})
					</Button>
				)}

				{/* Apply high-confidence CTA */}
				{stats.highConfCount > 0 && (
					<Button
						variant="default"
						size="sm"
						className="h-8 gap-1.5 shrink min-w-0"
						onClick={handleApplyHighConfidence}
						disabled={disabled}
					>
						<CheckCircle2 className="h-3.5 w-3.5" />
						Apply all ({stats.highConfCount})
					</Button>
				)}
			</div>
		</div>
	);
}
