"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { FileRowCollapsed } from "./file-row-collapsed";
import { FileRowExpanded } from "./file-row-expanded";
import type { EnhancedProjectFile } from "./types";

interface FileListItemProps {
	file: EnhancedProjectFile;
	isExpanded: boolean;
	onToggleExpand: (fileId: string) => void;
	onDelete: (fileId: string) => Promise<void>;
	onRetry?: ((fileId: string) => void) | undefined;
	onDownload?: (() => Promise<void>) | undefined;
	onView?: (() => Promise<void>) | undefined;
	disabled?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Orchestrator component for file row states.
 * Handles expand/collapse, keyboard navigation, and ARIA attributes.
 */
export function FileListItem({
	file,
	isExpanded,
	onToggleExpand,
	onDelete,
	onRetry,
	onDownload,
	onView,
	disabled = false,
	className,
}: FileListItemProps) {
	const handleToggle = useCallback(() => {
		onToggleExpand(file.id);
	}, [file.id, onToggleExpand]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			// Escape closes expanded view
			if (e.key === "Escape" && isExpanded) {
				e.preventDefault();
				onToggleExpand(file.id);
			}
		},
		[isExpanded, file.id, onToggleExpand],
	);

	const handleDelete = useCallback(
		() => onDelete(file.id),
		[file.id, onDelete],
	);

	const handleRetry = onRetry ? () => onRetry(file.id) : undefined;

	return (
		<article
			aria-labelledby={`file-${file.id}-name`}
			className={cn(
				"rounded-lg border border-border/50",
				"transition-shadow duration-150",
				"hover:shadow-md hover:border-border",
				"focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
				isExpanded ? "bg-card shadow-md" : "bg-card/50",
				className,
			)}
			onKeyDown={handleKeyDown}
		>
			<div id={`file-${file.id}-name`} className="sr-only" aria-hidden="false">
				{file.filename}
			</div>

			{/* Collapsed state */}
			<div className={cn("p-3", isExpanded && "hidden")}>
				<FileRowCollapsed
					file={file}
					isExpanded={isExpanded}
					onToggleExpand={handleToggle}
					onRetry={handleRetry}
				/>
			</div>

			{/* Expanded state */}
			{isExpanded && (
				<section
					id={`file-${file.id}-content`}
					aria-label={`Details for ${file.filename}`}
				>
					<FileRowExpanded
						file={file}
						onCollapse={handleToggle}
						onDelete={handleDelete}
						onDownload={onDownload}
						onView={onView}
						disabled={disabled}
					/>
				</section>
			)}
		</article>
	);
}
