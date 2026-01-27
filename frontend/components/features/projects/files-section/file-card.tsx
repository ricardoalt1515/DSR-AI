"use client";

import { Sparkles } from "lucide-react";
import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { formatFileSize, formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FileThumbnail } from "./file-thumbnail";
import type { EnhancedProjectFile } from "./types";
import { CATEGORY_CONFIG } from "./types";

interface FileCardProps {
	file: EnhancedProjectFile;
	isSelected: boolean;
	onClick: () => void;
}

export const FileCard = memo(function FileCard({
	file,
	isSelected,
	onClick,
}: FileCardProps) {
	const categoryConfig = CATEGORY_CONFIG[file.category];
	const hasAI = file.hasAIAnalysis || file.processingStatus === "completed";

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"group relative flex flex-col w-full rounded-xl border bg-card p-3 text-left",
				// Enhanced transitions
				"transition-all duration-200 ease-out",
				// Enhanced hover: scale, lift, shadow, border glow
				"hover:scale-[1.02] hover:-translate-y-1 hover:shadow-md hover:border-primary/30",
				// Focus states
				"focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
				// Selected state
				isSelected &&
					"ring-2 ring-primary border-primary/50 shadow-md scale-[1.02] -translate-y-1",
			)}
		>
			{/* Thumbnail area - aspect-[16/10] for better PDF preview */}
			<div className="relative aspect-[16/10] w-full mb-3 rounded-lg overflow-hidden bg-muted/30">
				<div className="absolute inset-0 flex items-center justify-center">
					<FileThumbnail
						filename={file.filename}
						fileType={file.fileType}
						category={file.category}
						processingStatus={file.processingStatus}
						thumbnailUrl={file.thumbnailUrl}
						size="lg"
						className="h-full w-full"
					/>
				</div>

				{/* Category badge - top right, larger and more visible */}
				<Badge
					variant="secondary"
					className={cn(
						"absolute top-2 right-2",
						"px-2 py-1 text-[10px] uppercase font-semibold",
						"backdrop-blur-sm",
						categoryConfig.bgColor,
						categoryConfig.textColor,
					)}
				>
					{categoryConfig.label}
				</Badge>

				{/* AI indicator - top left */}
				{hasAI && (
					<div
						className={cn(
							"absolute top-2 left-2",
							"flex items-center justify-center h-6 w-6",
							"rounded-full bg-primary/15 backdrop-blur-sm",
						)}
						title="AI processed"
					>
						<Sparkles className="h-3.5 w-3.5 text-primary" />
					</div>
				)}
			</div>

			{/* File info */}
			<div className="space-y-1 min-w-0">
				<p className="text-sm font-medium truncate" title={file.filename}>
					{file.filename}
				</p>
				<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
					<span>{formatFileSize(file.fileSize)}</span>
					<span className="opacity-50">·</span>
					<span>{formatRelativeDate(file.uploadedAt)}</span>
				</div>
			</div>
		</button>
	);
});
