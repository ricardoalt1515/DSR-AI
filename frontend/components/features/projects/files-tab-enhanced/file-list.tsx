"use client";

import {
	ArrowDownAZ,
	ArrowUpDown,
	Calendar,
	Filter,
	Search,
	Upload,
	X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { FileListItem } from "./file-list-item";
import type {
	EnhancedProjectFile,
	FileCategory,
	FileFilterStatus,
	FileSortBy,
} from "./types";
import { CATEGORY_CONFIG } from "./types";

interface FileListProps {
	projectId: string;
	files: EnhancedProjectFile[];
	isLoading?: boolean;
	onDelete: (fileId: string) => Promise<void>;
	onRetry?: (fileId: string) => void;
	onDownload?: (fileId: string, filename: string) => Promise<void>;
	onView?: (fileId: string) => Promise<void>;
	disabled?: boolean;
	className?: string;
}

// Removed ai-confidence - AI data belongs in Intake Panel
const SORT_OPTIONS: {
	value: FileSortBy;
	label: string;
	icon: typeof Calendar;
}[] = [
	{ value: "date", label: "Date", icon: Calendar },
	{ value: "name", label: "Name", icon: ArrowDownAZ },
];

const STATUS_OPTIONS: { value: FileFilterStatus; label: string }[] = [
	{ value: "all", label: "All status" },
	{ value: "processing", label: "Processing" },
	{ value: "completed", label: "Completed" },
	{ value: "failed", label: "Failed" },
];

/**
 * Main file list component with filtering, sorting, and URL state sync.
 * Simplified to focus on file management - AI insights moved to Intake Panel.
 */
export function FileList({
	projectId: _projectId,
	files,
	isLoading = false,
	onDelete,
	onRetry,
	onDownload,
	onView,
	disabled = false,
	className,
}: FileListProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	// Parse URL state
	const initialExpanded = useMemo(() => {
		const expanded = searchParams.get("expanded");
		return new Set(expanded?.split(",").filter(Boolean) ?? []);
	}, [searchParams]);

	// Local state
	const [expandedIds, setExpandedIds] = useState<Set<string>>(initialExpanded);
	const [searchTerm, setSearchTerm] = useState(
		searchParams.get("search") ?? "",
	);
	const [sortBy, setSortBy] = useState<FileSortBy>(
		(searchParams.get("sort") as FileSortBy) ?? "date",
	);
	const [filterStatus, setFilterStatus] = useState<FileFilterStatus>(
		(searchParams.get("status") as FileFilterStatus) ?? "all",
	);
	const [filterCategory, setFilterCategory] = useState<FileCategory | "all">(
		(searchParams.get("category") as FileCategory | "all") ?? "all",
	);

	// Sync state to URL
	const updateUrl = useCallback(
		(updates: Record<string, string | null>) => {
			const params = new URLSearchParams(searchParams.toString());

			for (const [key, value] of Object.entries(updates)) {
				if (
					value === null ||
					value === "" ||
					value === "all" ||
					value === "date"
				) {
					params.delete(key);
				} else {
					params.set(key, value);
				}
			}

			const newUrl = params.toString()
				? `${pathname}?${params.toString()}`
				: pathname;
			router.replace(newUrl, { scroll: false });
		},
		[pathname, router, searchParams],
	);

	// Toggle file expansion
	const handleToggleExpand = useCallback(
		(fileId: string) => {
			setExpandedIds((prev) => {
				const next = new Set(prev);
				if (next.has(fileId)) {
					next.delete(fileId);
				} else {
					next.add(fileId);
				}

				// Sync to URL
				const expandedParam = Array.from(next).join(",");
				updateUrl({ expanded: expandedParam || null });

				return next;
			});
		},
		[updateUrl],
	);

	// Filter and sort files
	const filteredFiles = useMemo(() => {
		let result = [...files];

		// Filter by search term (filename only, no AI summary search)
		if (searchTerm) {
			const search = searchTerm.toLowerCase();
			result = result.filter((file) =>
				file.filename.toLowerCase().includes(search),
			);
		}

		// Filter by status
		if (filterStatus !== "all") {
			result = result.filter((file) => file.processingStatus === filterStatus);
		}

		// Filter by category
		if (filterCategory !== "all") {
			result = result.filter((file) => file.category === filterCategory);
		}

		// Sort (no AI-confidence option)
		result.sort((a, b) => {
			switch (sortBy) {
				case "name":
					return a.filename.localeCompare(b.filename);
				default:
					return (
						new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
					);
			}
		});

		return result;
	}, [files, searchTerm, filterStatus, filterCategory, sortBy]);

	// Stats (simplified - no AI counts)
	const stats = useMemo(() => {
		return {
			total: files.length,
			processing: files.filter((f) => f.processingStatus === "processing")
				.length,
		};
	}, [files]);

	// Clear all filters
	const handleClearFilters = useCallback(() => {
		setSearchTerm("");
		setFilterStatus("all");
		setFilterCategory("all");
		setSortBy("date");
		updateUrl({ search: null, status: null, category: null, sort: null });
	}, [updateUrl]);

	const hasActiveFilters =
		searchTerm || filterStatus !== "all" || filterCategory !== "all";

	// Loading state
	if (isLoading) {
		return (
			<div className={cn("space-y-2", className)}>
				{[1, 2, 3].map((i) => (
					<div
						key={i}
						className="flex items-center gap-3 p-4 border rounded-lg"
					>
						<Skeleton className="h-8 w-8 rounded-md" />
						<div className="flex-1 space-y-1">
							<Skeleton className="h-4 w-1/3" />
							<Skeleton className="h-3 w-1/4" />
						</div>
					</div>
				))}
			</div>
		);
	}

	// Empty state
	if (files.length === 0) {
		return (
			<div className={cn("text-center py-16", className)}>
				<Upload className="h-12 w-12 mx-auto text-muted-foreground/50" />
				<h3 className="mt-4 font-medium">No files yet</h3>
				<p className="text-muted-foreground text-sm">
					Upload lab reports, SDS sheets, or photos to begin
				</p>
			</div>
		);
	}

	return (
		<div className={cn("space-y-4", className)}>
			{/* Search and filters */}
			<div className="flex flex-col sm:flex-row gap-3">
				{/* Search */}
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search files..."
						value={searchTerm}
						onChange={(e) => {
							setSearchTerm(e.target.value);
							updateUrl({ search: e.target.value || null });
						}}
						className="pl-9 pr-9"
						autoComplete="off"
					/>
					{searchTerm && (
						<button
							type="button"
							onClick={() => {
								setSearchTerm("");
								updateUrl({ search: null });
							}}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
							aria-label="Clear search"
						>
							<X className="h-4 w-4" />
						</button>
					)}
				</div>

				{/* Category filter */}
				<Select
					value={filterCategory}
					onValueChange={(value) => {
						const cat = value as FileCategory | "all";
						setFilterCategory(cat);
						updateUrl({ category: cat === "all" ? null : cat });
					}}
				>
					<SelectTrigger className="w-full sm:w-[140px]">
						<Filter className="h-4 w-4 mr-2" />
						<SelectValue placeholder="Category" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All types</SelectItem>
						{(Object.keys(CATEGORY_CONFIG) as FileCategory[]).map((cat) => (
							<SelectItem key={cat} value={cat}>
								{CATEGORY_CONFIG[cat].label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* Status filter */}
				<Select
					value={filterStatus}
					onValueChange={(value) => {
						const status = value as FileFilterStatus;
						setFilterStatus(status);
						updateUrl({ status: status === "all" ? null : status });
					}}
				>
					<SelectTrigger className="w-full sm:w-[140px]">
						<SelectValue placeholder="Status" />
					</SelectTrigger>
					<SelectContent>
						{STATUS_OPTIONS.map((opt) => (
							<SelectItem key={opt.value} value={opt.value}>
								{opt.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* Sort */}
				<Select
					value={sortBy}
					onValueChange={(value) => {
						const sort = value as FileSortBy;
						setSortBy(sort);
						updateUrl({ sort: sort === "date" ? null : sort });
					}}
				>
					<SelectTrigger className="w-full sm:w-[140px]">
						<ArrowUpDown className="h-4 w-4 mr-2" />
						<SelectValue placeholder="Sort by" />
					</SelectTrigger>
					<SelectContent>
						{SORT_OPTIONS.map((opt) => (
							<SelectItem key={opt.value} value={opt.value}>
								{opt.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Results info */}
			<div className="flex items-center justify-between text-sm">
				<p className="text-muted-foreground">
					{hasActiveFilters
						? `Showing ${filteredFiles.length} of ${files.length} files`
						: `${files.length} files`}
					{stats.processing > 0 && ` · ${stats.processing} processing`}
				</p>
				{hasActiveFilters && (
					<Button
						variant="ghost"
						size="sm"
						className="h-7 text-xs"
						onClick={handleClearFilters}
					>
						Clear filters
					</Button>
				)}
			</div>

			{/* File list */}
			{filteredFiles.length === 0 ? (
				<div className="text-center py-12">
					<Search className="h-12 w-12 mx-auto text-muted-foreground/50" />
					<h3 className="mt-4 font-medium">No files match your filters</h3>
					<p className="text-muted-foreground text-sm mb-4">
						Try adjusting your search or filter settings
					</p>
					<Button variant="outline" onClick={handleClearFilters}>
						Clear filters
					</Button>
				</div>
			) : (
				<div className="space-y-2">
					{filteredFiles.map((file) => (
						<FileListItem
							key={file.id}
							file={file}
							isExpanded={expandedIds.has(file.id)}
							onToggleExpand={handleToggleExpand}
							onDelete={onDelete}
							onRetry={onRetry}
							onDownload={
								onDownload
									? () => onDownload(file.id, file.filename)
									: undefined
							}
							onView={onView ? () => onView(file.id) : undefined}
							disabled={disabled}
						/>
					))}
				</div>
			)}
		</div>
	);
}
