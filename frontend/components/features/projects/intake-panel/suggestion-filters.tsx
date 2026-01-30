"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	type ActiveFilter,
	useIntakePanelStore,
	usePendingSuggestionsCount,
} from "@/lib/stores/intake-store";
import { cn } from "@/lib/utils";

interface SuggestionFiltersProps {
	className?: string | undefined;
}

const FILTER_OPTIONS: { value: ActiveFilter; label: string }[] = [
	{ value: "all", label: "All suggestions" },
	{ value: "high", label: "High confidence (≥85%)" },
	{ value: "notes", label: "From notes only" },
	{ value: "files", label: "From files only" },
];

const VALID_FILTERS = new Set<string>(["all", "high", "notes", "files"]);

function isActiveFilter(v: string): v is ActiveFilter {
	return VALID_FILTERS.has(v);
}

export function SuggestionFilters({ className }: SuggestionFiltersProps) {
	const activeFilter = useIntakePanelStore((s) => s.activeFilter);
	const setActiveFilter = useIntakePanelStore((s) => s.setActiveFilter);
	const count = usePendingSuggestionsCount();

	return (
		<div className={cn("flex items-center gap-2", className)}>
			<span className="text-sm text-muted-foreground">Showing:</span>
			<Select
				value={activeFilter}
				onValueChange={(v) => isActiveFilter(v) && setActiveFilter(v)}
			>
				<SelectTrigger className="h-8 w-auto min-w-[160px] text-xs">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{FILTER_OPTIONS.map((opt) => (
						<SelectItem key={opt.value} value={opt.value}>
							{opt.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<span className="text-xs text-muted-foreground">({count})</span>
		</div>
	);
}
