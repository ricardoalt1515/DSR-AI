/**
 * Files Section Types
 *
 * Types for the redesigned files section with split-view layout,
 * grid/list views, and master-detail preview panel.
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
 * View mode for file browser
 */
export type FileViewMode = "grid" | "list";

/**
 * Sort options for file list
 */
export type FileSortBy = "date" | "name";

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
 * Enhanced project file for the files section
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
 * Category configuration for visual styling
 */
export interface CategoryConfig {
	label: string;
	color: string;
	bgColor: string;
	textColor: string;
	dotColor: string;
}

/**
 * Category display configuration
 * Colors aligned with design spec: lab=blue, sds=amber, photo=violet, general=slate
 */
export const CATEGORY_CONFIG: Record<FileCategory, CategoryConfig> = {
	lab: {
		label: "Lab",
		color: "blue",
		bgColor: "bg-blue-500/10 dark:bg-blue-500/20",
		textColor: "text-blue-600 dark:text-blue-400",
		dotColor: "bg-blue-500",
	},
	sds: {
		label: "SDS",
		color: "amber",
		bgColor: "bg-amber-500/10 dark:bg-amber-500/20",
		textColor: "text-amber-600 dark:text-amber-400",
		dotColor: "bg-amber-500",
	},
	photo: {
		label: "Photo",
		color: "violet",
		bgColor: "bg-violet-500/10 dark:bg-violet-500/20",
		textColor: "text-violet-600 dark:text-violet-400",
		dotColor: "bg-violet-500",
	},
	general: {
		label: "General",
		color: "slate",
		bgColor: "bg-slate-500/10 dark:bg-slate-500/20",
		textColor: "text-slate-500 dark:text-slate-400",
		dotColor: "bg-slate-400",
	},
};

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
	}

	// Fall back to file type detection
	const type = fileType.toLowerCase();
	if (type.includes("image") || type.includes("png") || type.includes("jpg")) {
		return "photo";
	}

	return "general";
}

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

/**
 * Local storage key for view mode preference
 */
export const VIEW_MODE_STORAGE_KEY = "files-section-view-mode";
