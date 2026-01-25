/**
 * Files Tab Enhanced Types
 *
 * Types for the document-centric file list with AI insights,
 * expandable rows, and category-based filtering.
 */

import type { AISuggestion, UnmappedNote } from "@/lib/types/intake";

/**
 * File category for visual distinction and filtering
 */
export type FileCategory = "lab" | "sds" | "photo" | "general";

/**
 * Processing status for file analysis
 */
export type FileProcessingStatus =
	| "pending"
	| "processing"
	| "completed"
	| "failed";

/**
 * Sort options for file list (ai-confidence removed - belongs in Intake Panel)
 */
export type FileSortBy = "date" | "name";

/**
 * Filter status options
 */
export type FileFilterStatus = "all" | "processing" | "completed" | "failed";

/**
 * Key fact extracted from document analysis
 */
export interface KeyFact {
	id: string;
	label: string;
	value: string;
}

/**
 * AI analysis data attached to a file
 */
export interface FileAIAnalysis {
	summary: string;
	suggestions: AISuggestion[];
	keyFacts: KeyFact[];
	unmappedNotes: UnmappedNote[];
	averageConfidence: number;
}

/**
 * Enhanced project file with typed AI analysis
 */
export interface EnhancedProjectFile {
	id: string;
	filename: string;
	fileSize: number;
	fileType: string;
	category: FileCategory;
	uploadedAt: string;
	hasProcessedText: boolean;
	hasAIAnalysis: boolean;
	processingStatus: FileProcessingStatus;
	processingProgress?: number;
	aiAnalysis?: FileAIAnalysis | null;
	thumbnailUrl?: string | null;
}

/**
 * State for the file list component
 */
export interface FileListState {
	expandedFileIds: Set<string>;
	sortBy: FileSortBy;
	filterStatus: FileFilterStatus;
	filterCategory: FileCategory | "all";
	searchTerm: string;
}

/**
 * URL query params for deep linking
 */
export interface FileListUrlParams {
	expanded?: string; // Comma-separated file IDs
	category?: FileCategory | "all";
	status?: FileFilterStatus;
	sort?: FileSortBy;
	search?: string;
}

/**
 * Category configuration for badges and filtering
 */
export interface CategoryConfig {
	label: string;
	borderColor: string;
	bgColor: string;
	textColor: string;
	darkBgColor: string;
	darkTextColor: string;
	icon: "beaker" | "shield" | "image" | "file";
}

/**
 * Map file type to category.
 *
 * Backend categories: analysis, regulatory, photos, general, technical
 * Frontend categories: lab, sds, photo, general
 */
export function getFileCategory(
	fileType: string,
	category?: string,
): FileCategory {
	// First check explicit category from backend
	if (category) {
		const cat = category.toLowerCase();
		if (cat === "lab" || cat === "laboratory" || cat === "analysis")
			return "lab";
		if (cat === "sds" || cat === "safety" || cat === "regulatory") return "sds";
		if (cat === "photo" || cat === "image" || cat === "photos") return "photo";
		// technical, general → general (default below)
	}

	// Fall back to file type detection
	const type = fileType.toLowerCase();
	if (type.includes("image") || type.includes("png") || type.includes("jpg")) {
		return "photo";
	}

	return "general";
}

/**
 * Category display configuration
 */
export const CATEGORY_CONFIG: Record<FileCategory, CategoryConfig> = {
	lab: {
		label: "LAB",
		borderColor: "border-l-blue-500",
		bgColor: "bg-blue-500/10",
		textColor: "text-blue-600",
		darkBgColor: "dark:bg-blue-500/20",
		darkTextColor: "dark:text-blue-400",
		icon: "beaker",
	},
	sds: {
		label: "SDS",
		borderColor: "border-l-amber-500",
		bgColor: "bg-amber-500/10",
		textColor: "text-amber-600",
		darkBgColor: "dark:bg-amber-500/20",
		darkTextColor: "dark:text-amber-400",
		icon: "shield",
	},
	photo: {
		label: "PHOTO",
		borderColor: "border-l-violet-500",
		bgColor: "bg-violet-500/10",
		textColor: "text-violet-600",
		darkBgColor: "dark:bg-violet-500/20",
		darkTextColor: "dark:text-violet-400",
		icon: "image",
	},
	general: {
		label: "GENERAL",
		borderColor: "border-l-slate-400",
		bgColor: "bg-slate-500/10",
		textColor: "text-slate-500",
		darkBgColor: "dark:bg-slate-500/20",
		darkTextColor: "dark:text-slate-400",
		icon: "file",
	},
};

/**
 * Parse processing status from backend string
 */
export function parseProcessingStatus(status: string): FileProcessingStatus {
	const s = status.toLowerCase();
	if (s === "processing") return "processing";
	if (s === "completed" || s === "complete") return "completed";
	if (s === "failed" || s === "error") return "failed";
	return "pending";
}
