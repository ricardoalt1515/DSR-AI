"use client";

import { Check, FileText, RefreshCw, X } from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	useIntakePanelStore,
	useIsSuggestionSelected,
} from "@/lib/stores/intake-store";
import type { AISuggestion } from "@/lib/types/intake";
import { getConfidenceLevel } from "@/lib/types/intake";
import { cn } from "@/lib/utils";
import { formatSuggestionValue } from "./format-suggestion-value";

interface SuggestionRowProps {
	suggestion: AISuggestion;
	visibleIds: string[];
	onApply: (id: string) => Promise<void>;
	onReject: (id: string) => Promise<void>;
	disabled?: boolean;
	willReplace?: boolean;
}

/**
 * Compact suggestion row with checkbox for batch selection.
 * Confidence shown as colored number, source file on hover.
 */
export function SuggestionRow({
	suggestion,
	visibleIds,
	onApply,
	onReject,
	disabled = false,
	willReplace = false,
}: SuggestionRowProps) {
	const isSelected = useIsSuggestionSelected(suggestion.id);
	const toggleSelection = useIntakePanelStore(
		(s) => s.toggleSuggestionSelection,
	);
	const toggleRangeSelection = useIntakePanelStore(
		(s) => s.toggleRangeSelection,
	);

	const handleCheckboxChange = useCallback(
		(e: React.MouseEvent) => {
			if (e.shiftKey) {
				toggleRangeSelection(suggestion.id, visibleIds);
			} else {
				toggleSelection(suggestion.id);
			}
		},
		[suggestion.id, visibleIds, toggleSelection, toggleRangeSelection],
	);

	const confidenceLevel = getConfidenceLevel(suggestion.confidence);
	const confidenceColor = {
		high: "text-success",
		medium: "text-warning",
		low: "text-muted-foreground",
	}[confidenceLevel];

	const formattedValue = formatSuggestionValue(
		suggestion.value,
		suggestion.unit,
	);

	return (
		<div
			className={cn(
				"group flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
				"hover:bg-muted/50",
				isSelected && "bg-primary/5",
				disabled && "opacity-50 pointer-events-none",
			)}
		>
			{/* Checkbox */}
			<div
				role="button"
				tabIndex={0}
				onClick={handleCheckboxChange}
				onKeyDown={(e) => {
					if (e.key === " " || e.key === "Enter") {
						e.preventDefault();
						if (e.shiftKey) {
							toggleRangeSelection(suggestion.id, visibleIds);
						} else {
							toggleSelection(suggestion.id);
						}
					}
				}}
				className="cursor-pointer p-0 bg-transparent border-none outline-none"
				aria-label={`Select ${suggestion.fieldLabel}`}
			>
				<Checkbox checked={isSelected} tabIndex={-1} />
			</div>

			{/* Field label and section */}
			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium truncate">{suggestion.fieldLabel}</p>
				<p className="text-xs text-muted-foreground truncate">
					{suggestion.sectionTitle}
				</p>
			</div>

			{/* Value */}
			<div className="text-sm font-semibold text-foreground min-w-[80px] text-right">
				{formattedValue}
			</div>

			{/* Confidence */}
			<div
				className={cn(
					"text-xs font-medium tabular-nums min-w-[40px] text-right",
					confidenceColor,
				)}
			>
				{Math.round(suggestion.confidence)}%
			</div>

			{/* Source file popover */}
			{suggestion.evidence && (
				<Popover>
					<PopoverTrigger asChild>
						<button
							type="button"
							className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
							aria-label="View source"
						>
							<FileText className="h-3.5 w-3.5" />
						</button>
					</PopoverTrigger>
					<PopoverContent side="left" align="center" className="w-64 p-3">
						<div className="space-y-2">
							<p className="text-xs font-medium text-muted-foreground">
								Source
							</p>
							<p className="text-sm font-medium truncate">
								{suggestion.evidence.filename}
							</p>
							{suggestion.evidence.page && (
								<p className="text-xs text-muted-foreground">
									Page {suggestion.evidence.page}
								</p>
							)}
							{suggestion.evidence.excerpt && (
								<blockquote className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2 mt-2">
									"{suggestion.evidence.excerpt}"
								</blockquote>
							)}
						</div>
					</PopoverContent>
				</Popover>
			)}

			{/* Quick actions (visible on hover) */}
			<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
				<Button
					variant="ghost"
					size="sm"
					className={cn(
						"h-7 w-7 p-0 hover:bg-success/10",
						willReplace
							? "text-warning hover:text-warning hover:bg-warning/10"
							: "text-success hover:text-success",
					)}
					onClick={() => onApply(suggestion.id)}
					disabled={disabled}
					aria-label={`Apply ${suggestion.fieldLabel}`}
				>
					{willReplace ? (
						<RefreshCw className="h-3.5 w-3.5" />
					) : (
						<Check className="h-3.5 w-3.5" />
					)}
				</Button>
				<Button
					variant="ghost"
					size="sm"
					className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
					onClick={() => onReject(suggestion.id)}
					disabled={disabled}
					aria-label={`Reject ${suggestion.fieldLabel}`}
				>
					<X className="h-3.5 w-3.5" />
				</Button>
			</div>
		</div>
	);
}
