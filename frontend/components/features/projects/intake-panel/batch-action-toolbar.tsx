"use client";

import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	useIntakePanelStore,
	useSelectedCount,
} from "@/lib/stores/intake-store";
import { cn } from "@/lib/utils";

interface BatchActionToolbarProps {
	onApplyBatch: (ids: string[]) => Promise<void>;
	onRejectBatch: (ids: string[]) => Promise<void>;
	disabled?: boolean;
	className?: string;
}

/**
 * Floating toolbar for batch operations on selected suggestions.
 * Appears when one or more suggestions are selected.
 */
export function BatchActionToolbar({
	onApplyBatch,
	onRejectBatch,
	disabled = false,
	className,
}: BatchActionToolbarProps) {
	const selectedCount = useSelectedCount();
	const clearSelection = useIntakePanelStore((s) => s.clearSelection);

	if (selectedCount === 0) {
		return null;
	}

	const handleApply = async () => {
		const { selectedSuggestionIds } = useIntakePanelStore.getState();
		const ids = Array.from(selectedSuggestionIds);
		if (ids.length > 0) {
			await onApplyBatch(ids);
		}
	};

	const handleReject = async () => {
		const { selectedSuggestionIds } = useIntakePanelStore.getState();
		const ids = Array.from(selectedSuggestionIds);
		if (ids.length > 0) {
			await onRejectBatch(ids);
		}
	};

	return (
		<div
			className={cn(
				"z-10",
				"flex flex-wrap items-center justify-between gap-3 min-w-0",
				"px-4 py-3",
				"bg-card/95 backdrop-blur-sm",
				"border-t border-border",
				"rounded-b-2xl",
				"animate-in slide-in-from-bottom-2 duration-200",
				className,
			)}
		>
			{/* Selection info */}
			<div className="flex items-center gap-3">
				<span className="text-sm font-medium">{selectedCount} selected</span>
				<Button
					variant="ghost"
					size="sm"
					className="h-7 text-xs text-muted-foreground"
					onClick={clearSelection}
				>
					Clear
				</Button>
			</div>

			{/* Actions */}
			<div className="flex flex-wrap items-center gap-2 min-w-0">
				<Button
					variant="default"
					size="sm"
					className="h-8 gap-1.5 shrink min-w-0"
					onClick={handleApply}
					disabled={disabled}
				>
					<Check className="h-3.5 w-3.5" />
					Apply ({selectedCount})
				</Button>
				<Button
					variant="outline"
					size="sm"
					className="h-8 gap-1.5 text-muted-foreground hover:text-destructive hover:border-destructive shrink min-w-0"
					onClick={handleReject}
					disabled={disabled}
				>
					<X className="h-3.5 w-3.5" />
					Reject ({selectedCount})
				</Button>
			</div>
		</div>
	);
}
