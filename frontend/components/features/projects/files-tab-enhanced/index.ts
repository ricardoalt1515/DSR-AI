/**
 * Files Tab Enhanced Components
 *
 * Simplified document-centric file list focused on file management.
 * AI insights have been moved to the Intake Panel.
 */

export { FileActionsBar } from "./file-actions-bar";
// Main components
export { FileList } from "./file-list";
export { FileListItem } from "./file-list-item";
// Row components
export { FileRowCollapsed } from "./file-row-collapsed";
export { FileRowExpanded } from "./file-row-expanded";
// UI components
export { FileTypeIcon } from "./file-type-icon";
// Types
export type {
	CategoryConfig,
	EnhancedProjectFile,
	FileAIAnalysis,
	FileCategory,
	FileFilterStatus,
	FileListState,
	FileListUrlParams,
	FileProcessingStatus,
	FileSortBy,
	KeyFact,
} from "./types";
// Utilities
export {
	CATEGORY_CONFIG,
	getFileCategory,
	parseProcessingStatus,
} from "./types";
