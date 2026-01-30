"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	useIntakePanelStore,
	useSuggestionStats,
} from "@/lib/stores/intake-store";
import { cn } from "@/lib/utils";

interface IntakeSummaryBarProps {
	onApplyHighConfidence: (ids: string[]) => Promise<void>;
	disabled?: boolean;
	className?: string;
}

export function IntakeSummaryBar({
	onApplyHighConfidence,
	disabled = false,
	className,
}: IntakeSummaryBarProps) {
	const [isApplying, setIsApplying] = useState(false);
	const stats = useSuggestionStats();
	const applyHighConfidence = useIntakePanelStore(
		(s) => s.applyHighConfidenceSuggestions,
	);

	const handleApplyHighConfidence = async () => {
		setIsApplying(true);
		try {
			const affectedIds = applyHighConfidence();
			if (affectedIds.length > 0) {
				await onApplyHighConfidence(affectedIds);
			}
		} finally {
			setIsApplying(false);
		}
	};

	if (stats.pendingCount === 0) {
		return null;
	}

	return (
		<div
			className={cn(
				"sticky top-0 z-10 flex items-center justify-between gap-3 p-3 rounded-xl bg-background/95 backdrop-blur-sm border",
				className,
			)}
		>
			<span className="text-sm">
				<span className="font-medium">{stats.pendingCount} suggestions</span>
				{stats.highConfCount > 0 && (
					<span className="text-muted-foreground">
						{" "}
						- {stats.highConfCount} high-confidence
					</span>
				)}
			</span>

			{stats.highConfCount > 0 && (
				<Button
					size="sm"
					className="h-8 gap-1.5"
					onClick={handleApplyHighConfidence}
					disabled={disabled || isApplying}
				>
					{isApplying ? (
						<Loader2 className="h-3.5 w-3.5 animate-spin" />
					) : (
						<CheckCircle2 className="h-3.5 w-3.5" />
					)}
					Apply All High-Conf
				</Button>
			)}
		</div>
	);
}
