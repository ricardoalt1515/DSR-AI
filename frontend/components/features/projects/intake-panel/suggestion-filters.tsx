"use client";

import { Filter, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
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
	className?: string | undefined;
}

const COLLAPSE_THRESHOLD = 350;
const CONFIDENCE_VALUES = ["all", "high", "medium", "low"] as const;

function isConfidenceFilter(value: string): value is ConfidenceFilter {
	return (CONFIDENCE_VALUES as readonly string[]).includes(value);
}

const CONFIDENCE_OPTIONS: { value: ConfidenceFilter; label: string }[] = [
	{ value: "all", label: "All confidence" },
	{ value: "high", label: "High (≥85%)" },
	{ value: "medium", label: "Medium (70-85%)" },
	{ value: "low", label: "Low (<70%)" },
];

interface FilterState {
	confidenceFilter: ConfidenceFilter;
	sectionFilter: string | null;
	sourceFileFilter: string | null;
	sections: { id: string; title: string }[];
	sourceFiles: { id: string; filename: string }[];
	onConfidenceChange: (value: string) => void;
	onSectionChange: (value: string) => void;
	onSourceFileChange: (value: string) => void;
	onClear: () => void;
	hasActiveFilters: boolean;
}

function CompactFilters({
	activeCount,
	confidenceFilter,
	sectionFilter,
	sourceFileFilter,
	sections,
	sourceFiles,
	onConfidenceChange,
	onSectionChange,
	onSourceFileChange,
	onClear,
	hasActiveFilters,
}: FilterState & { activeCount: number }) {
	return (
		<div className="flex items-center gap-2">
			<Popover>
				<PopoverTrigger asChild>
					<Button variant="outline" size="sm" className="h-8 gap-1.5">
						<Filter className="h-3.5 w-3.5" />
						<span className="text-xs">Filters</span>
						{activeCount > 0 && (
							<span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
								{activeCount}
							</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent align="start" className="w-56 p-3">
					<div className="space-y-3">
						<div className="space-y-1.5">
							<span className="text-xs font-medium text-muted-foreground">
								Confidence
							</span>
							<Select
								value={confidenceFilter}
								onValueChange={onConfidenceChange}
							>
								<SelectTrigger className="h-8 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{CONFIDENCE_OPTIONS.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{sections.length > 1 && (
							<div className="space-y-1.5">
								<span className="text-xs font-medium text-muted-foreground">
									Section
								</span>
								<Select
									value={sectionFilter ?? "all"}
									onValueChange={onSectionChange}
								>
									<SelectTrigger className="h-8 text-xs">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All sections</SelectItem>
										{sections.map((s) => (
											<SelectItem key={s.id} value={s.id}>
												{s.title}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}

						{sourceFiles.length > 1 && (
							<div className="space-y-1.5">
								<span className="text-xs font-medium text-muted-foreground">
									Source file
								</span>
								<Select
									value={sourceFileFilter ?? "all"}
									onValueChange={onSourceFileChange}
								>
									<SelectTrigger className="h-8 text-xs">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All files</SelectItem>
										{sourceFiles.map((f) => (
											<SelectItem key={f.id} value={f.id}>
												<span className="truncate">{f.filename}</span>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}

						{hasActiveFilters && (
							<Button
								variant="ghost"
								size="sm"
								className="w-full h-8 text-xs"
								onClick={onClear}
							>
								<X className="h-3 w-3 mr-1" />
								Clear filters
							</Button>
						)}
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}

function InlineFilters({
	confidenceFilter,
	sectionFilter,
	sourceFileFilter,
	sections,
	sourceFiles,
	onConfidenceChange,
	onSectionChange,
	onSourceFileChange,
	onClear,
	hasActiveFilters,
}: FilterState) {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Filter className="h-4 w-4 text-muted-foreground shrink-0" />

			<Select value={confidenceFilter} onValueChange={onConfidenceChange}>
				<SelectTrigger className="h-8 min-w-0 w-full max-w-[140px] text-xs">
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

			{sections.length > 1 && (
				<Select value={sectionFilter ?? "all"} onValueChange={onSectionChange}>
					<SelectTrigger className="h-8 min-w-0 w-full max-w-[160px] text-xs">
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

			{sourceFiles.length > 1 && (
				<Select
					value={sourceFileFilter ?? "all"}
					onValueChange={onSourceFileChange}
				>
					<SelectTrigger className="h-8 min-w-0 w-full max-w-[180px] text-xs">
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

			{hasActiveFilters && (
				<Button
					variant="ghost"
					size="sm"
					className="h-8 text-xs text-muted-foreground"
					onClick={onClear}
				>
					<X className="h-3 w-3 mr-1" />
					Clear
				</Button>
			)}
		</div>
	);
}

export function SuggestionFilters({ className }: SuggestionFiltersProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [isCompact, setIsCompact] = useState(false);

	const confidenceFilter = useIntakePanelStore((s) => s.confidenceFilter);
	const sectionFilter = useIntakePanelStore((s) => s.sectionFilter);
	const sourceFileFilter = useIntakePanelStore((s) => s.sourceFileFilter);

	const setConfidenceFilter = useIntakePanelStore((s) => s.setConfidenceFilter);
	const setSectionFilter = useIntakePanelStore((s) => s.setSectionFilter);
	const setSourceFileFilter = useIntakePanelStore((s) => s.setSourceFileFilter);
	const clearFilters = useIntakePanelStore((s) => s.clearFilters);

	const suggestions = useIntakePanelStore((s) => s.suggestions);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		const observer = new ResizeObserver((entries) => {
			const width = entries[0]?.contentRect.width ?? 0;
			setIsCompact(width < COLLAPSE_THRESHOLD);
		});

		observer.observe(el);
		return () => observer.disconnect();
	}, []);

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
		confidenceFilter !== "all" ||
		sectionFilter !== null ||
		sourceFileFilter !== null;

	const activeFilterCount = [
		confidenceFilter !== "all",
		sectionFilter !== null,
		sourceFileFilter !== null,
	].filter(Boolean).length;

	const handleConfidenceChange = (value: string) => {
		if (isConfidenceFilter(value)) {
			setConfidenceFilter(value);
		}
	};

	const handleSectionChange = (value: string) => {
		setSectionFilter(value === "all" ? null : value);
	};

	const handleSourceFileChange = (value: string) => {
		setSourceFileFilter(value === "all" ? null : value);
	};

	const filterState: FilterState = {
		confidenceFilter,
		sectionFilter,
		sourceFileFilter,
		sections,
		sourceFiles,
		onConfidenceChange: handleConfidenceChange,
		onSectionChange: handleSectionChange,
		onSourceFileChange: handleSourceFileChange,
		onClear: clearFilters,
		hasActiveFilters,
	};

	return (
		<div ref={containerRef} className={cn("min-w-0", className)}>
			{isCompact ? (
				<CompactFilters activeCount={activeFilterCount} {...filterState} />
			) : (
				<InlineFilters {...filterState} />
			)}
		</div>
	);
}
