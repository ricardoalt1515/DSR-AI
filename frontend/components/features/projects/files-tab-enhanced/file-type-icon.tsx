"use client";

import { File, FileImage, FileSpreadsheet, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileTypeIconProps {
	filename: string;
	fileType: string;
	className?: string;
}

/**
 * Simple monochrome file type icon based on file extension/MIME type.
 * Replaces colorful category badges with format-focused representation.
 */
export function FileTypeIcon({
	filename,
	fileType,
	className,
}: FileTypeIconProps) {
	const Icon = getIconForFile(filename, fileType);

	return (
		<div
			className={cn(
				"flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/50",
				className,
			)}
		>
			<Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
		</div>
	);
}

function getIconForFile(filename: string, fileType: string): typeof File {
	const extension = filename.split(".").pop()?.toLowerCase() ?? "";
	const mimeType = fileType.toLowerCase();

	// Images
	if (
		mimeType.startsWith("image/") ||
		["jpg", "jpeg", "png", "gif", "webp", "svg", "heic"].includes(extension)
	) {
		return FileImage;
	}

	// PDFs
	if (mimeType === "application/pdf" || extension === "pdf") {
		return FileText;
	}

	// Spreadsheets
	if (
		mimeType.includes("spreadsheet") ||
		mimeType.includes("excel") ||
		["xlsx", "xls", "csv"].includes(extension)
	) {
		return FileSpreadsheet;
	}

	// Text/documents
	if (
		mimeType.startsWith("text/") ||
		mimeType.includes("document") ||
		["doc", "docx", "txt", "rtf", "md"].includes(extension)
	) {
		return FileText;
	}

	// Default
	return File;
}
