"use client";

import { ChevronUp, FileText, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileActionsBar } from "./file-actions-bar";
import type { EnhancedProjectFile } from "./types";

interface FileRowExpandedProps {
	file: EnhancedProjectFile;
	onCollapse: () => void;
	onDelete: () => Promise<void>;
	onDownload?: (() => Promise<void>) | undefined;
	onView?: (() => Promise<void>) | undefined;
	disabled?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Determine file preview type based on file type and name.
 */
function getPreviewType(file: EnhancedProjectFile): "image" | "pdf" | "none" {
	const type = file.fileType.toLowerCase();
	const name = file.filename.toLowerCase();

	if (
		type.startsWith("image/") ||
		name.endsWith(".png") ||
		name.endsWith(".jpg") ||
		name.endsWith(".jpeg") ||
		name.endsWith(".gif") ||
		name.endsWith(".webp")
	) {
		return "image";
	}

	if (type === "application/pdf" || name.endsWith(".pdf")) {
		return "pdf";
	}

	return "none";
}

/**
 * File preview component for images and PDFs.
 */
function FilePreview({
	file,
	onView,
}: {
	file: EnhancedProjectFile;
	onView?: (() => Promise<void>) | undefined;
}) {
	const [imageError, setImageError] = useState(false);
	const previewType = useMemo(() => getPreviewType(file), [file]);

	// Use thumbnailUrl if available, otherwise no inline preview
	const previewUrl = file.thumbnailUrl;

	if (previewType === "image" && previewUrl && !imageError) {
		return (
			<button
				type="button"
				className="flex justify-center w-full cursor-pointer bg-transparent border-none p-0"
				onClick={() => onView?.()}
			>
				<Image
					src={previewUrl}
					alt={file.filename}
					width={300}
					height={300}
					className="max-h-[300px] w-auto rounded-lg object-contain border border-border/30"
					onError={() => setImageError(true)}
					unoptimized
				/>
			</button>
		);
	}

	if (previewType === "pdf") {
		if (onView) {
			return (
				<button
					type="button"
					className={cn(
						"flex flex-col items-center justify-center gap-2 py-6 w-full",
						"rounded-lg bg-muted/30 border border-dashed border-border/50",
						"cursor-pointer hover:bg-muted/50 transition-colors",
					)}
					onClick={() => onView()}
				>
					<FileText className="h-10 w-10 text-muted-foreground/60" />
					<span className="text-sm text-muted-foreground">
						Click to view PDF
					</span>
				</button>
			);
		}
		return (
			<div
				className={cn(
					"flex flex-col items-center justify-center gap-2 py-6",
					"rounded-lg bg-muted/30 border border-dashed border-border/50",
				)}
			>
				<FileText className="h-10 w-10 text-muted-foreground/60" />
				<span className="text-sm text-muted-foreground">PDF document</span>
			</div>
		);
	}

	if (previewType === "image" && !previewUrl) {
		if (onView) {
			return (
				<button
					type="button"
					className={cn(
						"flex flex-col items-center justify-center gap-2 py-6 w-full",
						"rounded-lg bg-muted/30 border border-dashed border-border/50",
						"cursor-pointer hover:bg-muted/50 transition-colors",
					)}
					onClick={() => onView()}
				>
					<ImageIcon className="h-10 w-10 text-muted-foreground/60" />
					<span className="text-sm text-muted-foreground">
						Click to view image
					</span>
				</button>
			);
		}
		return (
			<div
				className={cn(
					"flex flex-col items-center justify-center gap-2 py-6",
					"rounded-lg bg-muted/30 border border-dashed border-border/50",
				)}
			>
				<ImageIcon className="h-10 w-10 text-muted-foreground/60" />
				<span className="text-sm text-muted-foreground">Image file</span>
			</div>
		);
	}

	return null;
}

/**
 * Simplified expanded file view with preview and actions.
 * AI content (summary, key facts, unmapped notes) belongs in Intake Panel.
 */
export function FileRowExpanded({
	file,
	onCollapse,
	onDelete,
	onDownload,
	onView,
	disabled = false,
	className,
}: FileRowExpandedProps) {
	const previewType = useMemo(() => getPreviewType(file), [file]);
	const showPreview = previewType !== "none";

	return (
		<div className={cn("rounded-lg border border-border bg-card", className)}>
			{/* Collapse header */}
			<div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
				<span className="text-sm font-medium truncate">{file.filename}</span>
				<Button
					variant="ghost"
					size="sm"
					className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5"
					onClick={onCollapse}
				>
					<ChevronUp className="h-3.5 w-3.5" />
					Collapse
				</Button>
			</div>

			{/* Preview section */}
			{showPreview && (
				<div className="px-4 pt-4">
					<FilePreview file={file} onView={onView} />
				</div>
			)}

			{/* Actions */}
			<div className="p-4">
				<FileActionsBar
					filename={file.filename}
					onDownload={onDownload}
					onView={onView}
					onDelete={onDelete}
					disabled={disabled}
				/>
			</div>
		</div>
	);
}
