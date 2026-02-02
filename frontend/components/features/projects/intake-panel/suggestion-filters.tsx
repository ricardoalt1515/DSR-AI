"use client";

import { useShallow } from "zustand/react/shallow";
import { Badge } from "@/components/ui/badge";
import {
	type ActiveFilter,
	useIntakePanelStore,
} from "@/lib/stores/intake-store";
import { cn } from "@/lib/utils";

interface SuggestionFiltersProps {
	className?: string | undefined;
}

const FILTER_OPTIONS: {
	value: ActiveFilter;
	label: string;
	shortLabel: string;
}[] = [
	{ value: "all", label: "All", shortLabel: "All" },
	{ value: "high", label: "High", shortLabel: "High" },
	{ value: "notes", label: "Notes", shortLabel: "Notes" },
	{ value: "files", label: "Files", shortLabel: "Files" },
];

/** Calculate counts per filter from suggestions */
function useFilterCounts() {
	return useIntakePanelStore(
		useShallow((state) => {
			const pending = state.suggestions.filter((s) => s.status === "pending");
			return {
				all: pending.length,
				high: pending.filter((s) => s.confidence >= 85).length,
				notes: pending.filter((s) => !s.sourceFileId).length,
				files: pending.filter((s) => Boolean(s.sourceFileId)).length,
			};
		}),
	);
}

export function SuggestionFilters({ className }: SuggestionFiltersProps) {
	const activeFilter = useIntakePanelStore((s) => s.activeFilter);
	const setActiveFilter = useIntakePanelStore((s) => s.setActiveFilter);
	const counts = useFilterCounts();

	return (
		<div
			className={cn(
				"flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 -mb-1",
				className,
			)}
			role="tablist"
			aria-label="Filter suggestions"
		>
			{FILTER_OPTIONS.map((opt) => {
				const isActive = activeFilter === opt.value;
				const count = counts[opt.value];

				return (
					<button
						key={opt.value}
						type="button"
						role="tab"
						aria-selected={isActive}
						onClick={() => setActiveFilter(opt.value)}
						className={cn(
							"inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
							"whitespace-nowrap shrink-0",
							"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
							isActive
								? "bg-primary text-primary-foreground shadow-sm"
								: "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
						)}
					>
						{opt.shortLabel}
						<Badge
							variant="secondary"
							className={cn(
								"h-4 min-w-4 px-1 text-[10px] font-semibold",
								isActive
									? "bg-primary-foreground/20 text-primary-foreground"
									: "bg-background/80 text-muted-foreground",
							)}
						>
							{count}
						</Badge>
					</button>
				);
			})}
		</div>
	);
}
