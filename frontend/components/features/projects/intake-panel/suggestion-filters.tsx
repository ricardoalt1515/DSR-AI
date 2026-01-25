"use client";

import { Filter, X } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	type ConfidenceFilter,
	useIntakePanelStore,
} from "@/lib/stores/intake-store";
import { cn } from "@/lib/utils";

interface SuggestionFiltersProps {
	className?: string;
}

const CONFIDENCE_OPTIONS: { value: ConfidenceFilter; label: string }[] = [
	{ value: "all", label: "All confidence" },
	{ value: "high", label: "High (≥85%)" },
	{ value: "medium", label: "Medium (70-85%)" },
	{ value: "low", label: "Low (<70%)" },
];

/**
 * Filter dropdowns for suggestions: Confidence, Section, Source file.
 */
export function SuggestionFilters({ className }: SuggestionFiltersProps) {
	const confidenceFilter = useIntakePanelStore((s) => s.confidenceFilter);
	const sectionFilter = useIntakePanelStore((s) => s.sectionFilter);
	const sourceFileFilter = useIntakePanelStore((s) => s.sourceFileFilter);

	const setConfidenceFilter = useIntakePanelStore((s) => s.setConfidenceFilter);
	const setSectionFilter = useIntakePanelStore((s) => s.setSectionFilter);
	const setSourceFileFilter = useIntakePanelStore((s) => s.setSourceFileFilter);
	const clearFilters = useIntakePanelStore((s) => s.clearFilters);

	const suggestions = useIntakePanelStore((s) => s.suggestions);

	const sections = useMemo(() => {
		const pending = suggestions.filter((s) => s.status === "pending");
		const map = new Map<string, string>();
		for (const s of pending) {
			if (!map.has(s.sectionId)) {
				map.set(s.sectionId, s.sectionTitle);
			}
		}
		return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
	}, [suggestions]);

	const sourceFiles = useMemo(() => {
		const pending = suggestions.filter((s) => s.status === "pending");
		const map = new Map<string, string>();
		for (const s of pending) {
			if (s.sourceFileId && s.evidence?.filename) {
				map.set(s.sourceFileId, s.evidence.filename);
			}
		}
		return Array.from(map.entries()).map(([id, filename]) => ({
			id,
			filename,
		}));
	}, [suggestions]);

	const hasActiveFilters =
		confidenceFilter !== "all" || sectionFilter || sourceFileFilter;

	return (
		<div className={cn("flex flex-wrap items-center gap-2", className)}>
			<Filter className="h-4 w-4 text-muted-foreground" />

			{/* Confidence filter */}
			<Select
				value={confidenceFilter}
				onValueChange={(value) =>
					setConfidenceFilter(value as ConfidenceFilter)
				}
			>
				<SelectTrigger className="h-8 w-[140px] text-xs">
					<SelectValue placeholder="Confidence" />
				</SelectTrigger>
				<SelectContent>
					{CONFIDENCE_OPTIONS.map((opt) => (
						<SelectItem key={opt.value} value={opt.value}>
							{opt.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{/* Section filter */}
			{sections.length > 1 && (
				<Select
					value={sectionFilter ?? "all"}
					onValueChange={(value) =>
						setSectionFilter(value === "all" ? null : value)
					}
				>
					<SelectTrigger className="h-8 w-[160px] text-xs">
						<SelectValue placeholder="Section" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All sections</SelectItem>
						{sections.map((section) => (
							<SelectItem key={section.id} value={section.id}>
								{section.title}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			)}

			{/* Source file filter */}
			{sourceFiles.length > 1 && (
				<Select
					value={sourceFileFilter ?? "all"}
					onValueChange={(value) =>
						setSourceFileFilter(value === "all" ? null : value)
					}
				>
					<SelectTrigger className="h-8 w-[180px] text-xs">
						<SelectValue placeholder="Source file" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All files</SelectItem>
						{sourceFiles.map((file) => (
							<SelectItem key={file.id} value={file.id}>
								<span className="truncate max-w-[150px]">{file.filename}</span>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			)}

			{/* Clear filters */}
			{hasActiveFilters && (
				<Button
					variant="ghost"
					size="sm"
					className="h-8 text-xs text-muted-foreground"
					onClick={clearFilters}
				>
					<X className="h-3 w-3 mr-1" />
					Clear
				</Button>
			)}
		</div>
	);
}
