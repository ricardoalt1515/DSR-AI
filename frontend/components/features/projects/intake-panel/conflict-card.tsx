"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { AISuggestion } from "@/lib/types/intake";
import { cn } from "@/lib/utils";
import { ConfidenceBadge } from "./confidence-badge";
import { formatSuggestionValue } from "./format-suggestion-value";

interface ConflictCardProps {
	fieldLabel: string;
	suggestions: AISuggestion[];
	onResolve: (conflictKey: string, selectedId: string) => Promise<void>;
	disabled?: boolean;
}

export function ConflictCard({
	fieldLabel,
	suggestions,
	onResolve,
	disabled = false,
}: ConflictCardProps) {
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [isResolving, setIsResolving] = useState(false);

	const handleResolve = async () => {
		if (!selectedId || disabled || isResolving) return;

		const sectionId = suggestions[0]?.sectionId;
		const fieldId = suggestions[0]?.fieldId;
		if (!sectionId || !fieldId) return;

		setIsResolving(true);
		try {
			await onResolve(`${sectionId}:${fieldId}`, selectedId);
			toast.success(`${fieldLabel} resolved`);
		} catch {
			toast.error(`Failed to resolve ${fieldLabel}`);
		} finally {
			setIsResolving(false);
		}
	};

	const formatValue = (suggestion: AISuggestion) =>
		formatSuggestionValue(suggestion.value, suggestion.unit);

	return (
		<div className="rounded-2xl border-2 border-warning/50 bg-warning/10 p-3 space-y-3">
			{/* Header */}
			<div className="flex items-center gap-2">
				<AlertTriangle className="h-4 w-4 text-warning" />
				<div>
					<p className="text-sm font-medium text-foreground">
						Conflicting values
					</p>
					<p className="text-xs text-muted-foreground">
						Multiple values found for: {fieldLabel}
					</p>
				</div>
			</div>

			{/* Options */}
			<RadioGroup
				value={selectedId ?? ""}
				onValueChange={setSelectedId}
				className="space-y-2"
				disabled={disabled || isResolving}
			>
				{suggestions.map((suggestion) => (
					<div
						key={suggestion.id}
						className={cn(
							"flex items-center gap-3 rounded-xl bg-card/50 p-2",
							"transition-colors",
							selectedId === suggestion.id && "ring-1 ring-primary/50",
						)}
					>
						<RadioGroupItem
							value={suggestion.id}
							id={suggestion.id}
							disabled={disabled || isResolving}
						/>
						<Label
							htmlFor={suggestion.id}
							className="flex-1 cursor-pointer text-sm"
						>
							<div className="flex items-center justify-between">
								<span className="font-medium">{formatValue(suggestion)}</span>
								<ConfidenceBadge confidence={suggestion.confidence} />
							</div>
							<p className="text-xs text-muted-foreground">
								from {suggestion.evidence?.filename ?? "Notes"}
							</p>
						</Label>
					</div>
				))}
			</RadioGroup>

			{/* Apply button */}
			<Button
				className="w-full rounded-xl"
				onClick={handleResolve}
				disabled={!selectedId || disabled || isResolving}
			>
				{isResolving ? (
					<>
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						Applying...
					</>
				) : (
					"Apply Selected"
				)}
			</Button>
		</div>
	);
}
