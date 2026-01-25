"use client";

import { AlertCircle, ChevronDown, Clock, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFileSize, formatShortDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FileTypeIcon } from "./file-type-icon";
import type { EnhancedProjectFile } from "./types";

interface FileRowCollapsedProps {
	file: EnhancedProjectFile;
	isExpanded: boolean;
	onToggleExpand: () => void;
	onRetry?: (() => void) | undefined;
	className?: string;
}

/**
 * Simplified collapsed file row: icon, filename, metadata, expand toggle.
 * No AI content - that belongs in the Intake Panel.
 */
export function FileRowCollapsed({
	file,
	isExpanded,
	onToggleExpand,
	onRetry,
	className,
}: FileRowCollapsedProps) {
	const isProcessing = file.processingStatus === "processing";
	const isFailed = file.processingStatus === "failed";

	return (
		<div className={cn("flex items-center gap-3", className)}>
			{/* File type icon */}
			<FileTypeIcon filename={file.filename} fileType={file.fileType} />

			{/* Content */}
			<div className="flex-1 min-w-0">
				{/* Filename */}
				<p className="font-medium text-sm truncate" title={file.filename}>
					{file.filename}
				</p>

				{/* Metadata row */}
				<div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
					<span className="flex items-center gap-1">
						<HardDrive className="h-3 w-3" />
						{formatFileSize(file.fileSize)}
					</span>
					<span className="flex items-center gap-1">
						<Clock className="h-3 w-3" />
						{formatShortDateTime(file.uploadedAt)}
					</span>

					{/* Processing status */}
					{isProcessing && (
						<span className="text-primary" aria-live="polite">
							Processing...
						</span>
					)}

					{/* Failed status */}
					{isFailed && (
						<span className="flex items-center gap-1 text-destructive">
							<AlertCircle className="h-3 w-3" />
							Failed
						</span>
					)}
				</div>
			</div>

			{/* Retry button for failed files */}
			{isFailed && onRetry && (
				<Button size="sm" variant="outline" onClick={onRetry}>
					Retry
				</Button>
			)}

			{/* Expand toggle */}
			<Button
				variant="ghost"
				size="sm"
				className="shrink-0 h-8 w-8 p-0"
				onClick={onToggleExpand}
				aria-expanded={isExpanded}
				aria-label={`${isExpanded ? "Collapse" : "Expand"} ${file.filename}`}
			>
				<ChevronDown
					className={cn(
						"h-4 w-4 transition-transform duration-200",
						isExpanded && "rotate-180",
					)}
				/>
			</Button>
		</div>
	);
}
