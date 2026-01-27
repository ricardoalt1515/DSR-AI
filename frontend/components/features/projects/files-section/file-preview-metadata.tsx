"use client";

import {
	Download,
	ExternalLink,
	Loader2,
	Sparkles,
	Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatFileSize, formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EnhancedProjectFile, KeyFact } from "./types";
import { CATEGORY_CONFIG } from "./types";

interface FilePreviewMetadataProps {
	file: EnhancedProjectFile;
	onDownload: () => void;
	onView: () => void;
	onDelete: () => void;
	disabled?: boolean;
}

function KeyFactsList({ facts }: { facts: KeyFact[] }) {
	if (facts.length === 0) return null;

	return (
		<ul className="space-y-2">
			{facts.map((fact) => (
				<li key={fact.id} className="flex items-start gap-2 text-sm">
					<span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0" />
					<span>
						<span className="font-medium text-foreground">{fact.label}:</span>{" "}
						<span className="text-muted-foreground">{fact.value}</span>
					</span>
				</li>
			))}
		</ul>
	);
}

/**
 * Right pane of the file preview modal.
 * Shows file metadata, AI analysis summary, key facts, and action buttons.
 */
export function FilePreviewMetadata({
	file,
	onDownload,
	onView,
	onDelete,
	disabled = false,
}: FilePreviewMetadataProps) {
	const categoryConfig = CATEGORY_CONFIG[file.category];
	const hasAI = file.hasAIAnalysis && file.aiAnalysis;

	return (
		<div className="h-full flex flex-col">
			{/* File info header */}
			<div className="space-y-3 pb-4 border-b">
				<h2 className="text-lg font-semibold break-all leading-tight">
					{file.filename}
				</h2>
				<div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
					<Badge
						variant="secondary"
						className={cn(
							"px-2 py-1 text-xs uppercase font-medium",
							categoryConfig.bgColor,
							categoryConfig.textColor,
						)}
					>
						{categoryConfig.label}
					</Badge>
					<span>{formatFileSize(file.fileSize)}</span>
					<span className="opacity-50">·</span>
					<span>{formatRelativeDate(file.uploadedAt)}</span>
				</div>
			</div>

			{/* Scrollable content area */}
			<div className="flex-1 overflow-y-auto py-4 space-y-4">
				{/* AI Summary section */}
				{hasAI && file.aiAnalysis?.summary && (
					<div className="glass-liquid-subtle rounded-xl p-4 space-y-2">
						<div className="flex items-center gap-2 text-sm font-medium text-primary">
							<Sparkles className="h-4 w-4" />
							<span>AI Summary</span>
						</div>
						<p className="text-sm text-muted-foreground leading-relaxed">
							{file.aiAnalysis.summary}
						</p>
					</div>
				)}

				{/* Key Facts section */}
				{hasAI &&
					file.aiAnalysis?.keyFacts &&
					file.aiAnalysis.keyFacts.length > 0 && (
						<div className="space-y-3">
							<h4 className="text-sm font-medium flex items-center gap-2">
								<span className="text-lg">📋</span>
								Key Facts
							</h4>
							<KeyFactsList facts={file.aiAnalysis.keyFacts} />
						</div>
					)}

				{/* Processing state */}
				{file.processingStatus === "processing" && (
					<div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border">
						<Loader2 className="h-5 w-5 animate-spin text-primary" />
						<div className="space-y-0.5">
							<span className="text-sm font-medium">Processing file...</span>
							<p className="text-xs text-muted-foreground">
								AI analysis in progress
							</p>
						</div>
					</div>
				)}

				{/* No AI analysis message */}
				{!hasAI && file.processingStatus === "completed" && (
					<div className="text-center py-6 text-muted-foreground">
						<p className="text-sm">No AI analysis available for this file.</p>
					</div>
				)}
			</div>

			{/* Action buttons - fixed at bottom */}
			<div className="pt-4 border-t flex flex-wrap gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={onDownload}
					className="flex-1 min-w-[100px] gap-2"
				>
					<Download className="h-4 w-4" />
					Download
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={onView}
					className="flex-1 min-w-[100px] gap-2"
				>
					<ExternalLink className="h-4 w-4" />
					View
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={onDelete}
					disabled={disabled}
					className="flex-1 min-w-[100px] gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
				>
					<Trash2 className="h-4 w-4" />
					Delete
				</Button>
			</div>
		</div>
	);
}
