"use client";

import { Info, Loader2, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	useIntakePanelStore,
	usePendingSuggestions,
} from "@/lib/stores/intake-store";
import type { AISuggestion } from "@/lib/types/intake";
import { cn } from "@/lib/utils";
import { SuggestionCard } from "./suggestion-card";

interface AISuggestionsSectionProps {
	projectId: string;
	disabled?: boolean;
	isLoading?: boolean;
	isProcessing?: boolean;
	processingCount?: number;
	onApplySuggestion: (suggestion: AISuggestion) => Promise<void>;
	onEditSuggestion?: (suggestion: AISuggestion) => void;
	onRejectSuggestion: (suggestion: AISuggestion) => Promise<void>;
}

export function AISuggestionsSection({
	projectId: _projectId,
	disabled = false,
	isLoading = false,
	isProcessing = false,
	processingCount = 0,
	onApplySuggestion,
	onEditSuggestion,
	onRejectSuggestion,
}: AISuggestionsSectionProps) {
	const pendingSuggestions = usePendingSuggestions();

	// Defer state reads to callback execution (rerender-defer-reads)
	const handleApply = async (id: string) => {
		const { suggestions } = useIntakePanelStore.getState();
		const suggestion = suggestions.find(
			(s) => s.id === id && s.status === "pending",
		);
		if (!suggestion) return;

		try {
			await onApplySuggestion(suggestion);
			toast.success(`${suggestion.fieldLabel} applied`);
		} catch {
			toast.error(`Failed to apply ${suggestion.fieldLabel}`);
		}
	};

	const handleReject = async (id: string) => {
		const { suggestions } = useIntakePanelStore.getState();
		const suggestion = suggestions.find(
			(s) => s.id === id && s.status === "pending",
		);
		if (!suggestion) return;

		try {
			await onRejectSuggestion(suggestion);
		} catch {
			toast.error(`Failed to reject ${suggestion.fieldLabel}`);
		}
	};

	const handleEdit = (id: string) => {
		const { suggestions } = useIntakePanelStore.getState();
		const suggestion = suggestions.find(
			(s) => s.id === id && s.status === "pending",
		);
		if (!suggestion || !onEditSuggestion) return;
		onEditSuggestion(suggestion);
	};

	return (
		<Card className="flex-1 overflow-hidden rounded-3xl border-none bg-card/80">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2 text-base">
						<Sparkles className="h-4 w-4 text-primary" />
						AI Suggestions
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger>
									<Info className="h-3 w-3 text-muted-foreground" />
								</TooltipTrigger>
								<TooltipContent>
									<p className="text-xs">
										High: ≥85% • Medium: 70-85% • Low: &lt;70% (unmapped)
									</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</CardTitle>
					{pendingSuggestions.length > 0 && (
						<span className="text-xs text-muted-foreground">
							{pendingSuggestions.length} pending
						</span>
					)}
				</div>
				<CardDescription>Extracted values from documents.</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3 overflow-y-auto max-h-[calc(100vh-400px)]">
				{/* Loading state */}
				{isLoading && (
					<div className="space-y-3">
						<Skeleton className="h-[140px] w-full rounded-2xl" />
						<Skeleton className="h-[140px] w-full rounded-2xl" />
					</div>
				)}

				{/* Processing state */}
				{isProcessing && (
					<div
						className="flex items-center gap-3 rounded-2xl bg-primary/10 p-3"
						aria-live="polite"
					>
						<Loader2 className="h-4 w-4 animate-spin text-primary" />
						<p className="text-sm text-foreground">
							Analyzing {processingCount}{" "}
							{processingCount === 1 ? "document" : "documents"}...
						</p>
					</div>
				)}

				{/* Empty state */}
				{!isLoading && !isProcessing && pendingSuggestions.length === 0 && (
					<div
						className={cn(
							"flex flex-col items-center justify-center gap-3",
							"rounded-2xl border border-dashed border-muted/60 bg-muted/20 p-6 text-center",
						)}
					>
						<div className="rounded-full bg-muted/50 p-3">
							<Upload className="h-5 w-5 text-muted-foreground" />
						</div>
						<p className="text-sm text-muted-foreground">
							Upload documents to see AI suggestions
						</p>
					</div>
				)}

				{/* Suggestions list */}
				{!isLoading &&
					pendingSuggestions.map((suggestion) => (
						<SuggestionCard
							key={suggestion.id}
							suggestion={suggestion}
							onApply={handleApply}
							{...(onEditSuggestion ? { onEdit: handleEdit } : {})}
							onReject={handleReject}
							disabled={disabled}
						/>
					))}
			</CardContent>
		</Card>
	);
}
