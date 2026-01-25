"use client";

import { Check, Loader2, Pencil, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AISuggestion } from "@/lib/types/intake";
import { cn } from "@/lib/utils";
import { ConfidenceBadge } from "./confidence-badge";
import { EvidenceDrawer } from "./evidence-drawer";
import { formatSuggestionValue } from "./format-suggestion-value";

interface SuggestionCardProps {
	suggestion: AISuggestion;
	onApply: (id: string) => Promise<void>;
	onEdit?: ((id: string) => void) | undefined;
	onReject: (id: string) => Promise<void>;
	disabled?: boolean | undefined;
}

export function SuggestionCard({
	suggestion,
	onApply,
	onEdit,
	onReject,
	disabled = false,
}: SuggestionCardProps) {
	const [isApplying, setIsApplying] = useState(false);
	const [isRejecting, setIsRejecting] = useState(false);

	const handleApply = async () => {
		if (disabled || isApplying || isRejecting) return;

		setIsApplying(true);
		try {
			await onApply(suggestion.id);
		} finally {
			setIsApplying(false);
		}
	};

	const handleReject = async () => {
		if (disabled || isApplying || isRejecting) return;

		setIsRejecting(true);
		try {
			await onReject(suggestion.id);
		} finally {
			setIsRejecting(false);
		}
	};

	const formatValue = () =>
		formatSuggestionValue(suggestion.value, suggestion.unit);

	const isProcessing = isApplying || isRejecting;

	return (
		<div
			className={cn(
				"rounded-2xl border border-transparent bg-muted/30 p-3 transition-all duration-200",
				"hover:border-primary/20",
				isProcessing && "opacity-50 pointer-events-none",
			)}
		>
			{/* Header: Field label + confidence */}
			<div className="flex items-start justify-between gap-2">
				<div className="space-y-0.5">
					<p className="text-sm font-medium text-foreground">
						{suggestion.fieldLabel}
					</p>
					<p className="text-xs text-muted-foreground">
						{suggestion.sectionTitle}
					</p>
				</div>
				<ConfidenceBadge confidence={suggestion.confidence} />
			</div>

			{/* Value */}
			<div className="mt-2">
				<p className="text-lg font-semibold text-foreground">{formatValue()}</p>
			</div>

			{/* Actions */}
			<div className="mt-3 flex items-center gap-2">
				<Button
					variant="default"
					size="sm"
					className="h-7 flex-1 rounded-xl text-xs"
					onClick={handleApply}
					disabled={disabled || isProcessing}
					aria-label={`Apply ${suggestion.fieldLabel} value`}
				>
					{isApplying ? (
						<Loader2 className="mr-1 h-3 w-3 animate-spin" />
					) : (
						<Check className="mr-1 h-3 w-3" />
					)}
					Apply
				</Button>

				{onEdit && (
					<Button
						variant="outline"
						size="sm"
						className="h-7 rounded-xl text-xs"
						onClick={() => onEdit(suggestion.id)}
						disabled={disabled || isProcessing}
						aria-label={`Edit ${suggestion.fieldLabel} suggestion`}
					>
						<Pencil className="h-3 w-3" />
					</Button>
				)}

				<Button
					variant="ghost"
					size="sm"
					className="h-7 rounded-xl text-xs hover:text-destructive"
					onClick={handleReject}
					disabled={disabled || isProcessing}
					aria-label={`Reject ${suggestion.fieldLabel} suggestion`}
				>
					{isRejecting ? (
						<Loader2 className="h-3 w-3 animate-spin" />
					) : (
						<X className="h-3 w-3" />
					)}
				</Button>
			</div>

			{/* Evidence drawer */}
			<EvidenceDrawer evidence={suggestion.evidence ?? null} />
		</div>
	);
}
