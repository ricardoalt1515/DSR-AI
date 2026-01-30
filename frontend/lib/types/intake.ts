/**
 * Intake Panel Types
 *
 * Types for the AI-powered intake panel that captures notes, files,
 * and displays AI suggestions from document analysis.
 */

export type SuggestionStatus = "pending" | "applied" | "rejected";
export type ConfidenceLevel = "high" | "medium" | "low";

export interface SuggestionEvidence {
	fileId: string;
	filename: string;
	page?: number;
	excerpt?: string;
	thumbnailUrl?: string;
}

export interface AISuggestion {
	id: string;
	fieldId: string;
	fieldLabel: string;
	sectionId: string;
	sectionTitle: string;
	value: string | number;
	unit?: string;
	confidence: number;
	status: SuggestionStatus;
	source: "notes" | "file" | "image" | "sds" | "lab";
	sourceFileId?: string | null;
	evidence?: SuggestionEvidence | null;
	conflictsWith?: string[];
}

export interface UnmappedNote {
	id: string;
	extractedText: string;
	confidence: number;
	sourceFile?: string | null;
	sourceFileId?: string | null;
}

export interface IntakeNote {
	id: string;
	projectId: string;
	text: string;
	createdAt: string;
	updatedAt: string;
	createdBy: string;
}

export type NotesSaveStatus = "idle" | "saving" | "saved" | "error";
