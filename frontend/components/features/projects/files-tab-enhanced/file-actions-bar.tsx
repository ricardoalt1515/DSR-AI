"use client";

import { Download, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileActionsBarProps {
	filename: string;
	onDownload?: (() => Promise<void>) | undefined;
	onView?: (() => Promise<void>) | undefined;
	onDelete: () => Promise<void>;
	disabled?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Action buttons for file: Download, View Original, Delete.
 * Delete shows confirmation modal per Vercel Guidelines.
 */
export function FileActionsBar({
	filename,
	onDownload,
	onView,
	onDelete,
	disabled = false,
	className,
}: FileActionsBarProps) {
	const [isDeleting, setIsDeleting] = useState(false);
	const [isDownloading, setIsDownloading] = useState(false);
	const [isViewing, setIsViewing] = useState(false);

	const handleDelete = async () => {
		if (disabled || isDeleting) return;

		setIsDeleting(true);
		try {
			await onDelete();
		} finally {
			setIsDeleting(false);
		}
	};

	const handleDownload = async () => {
		if (disabled || isDownloading || !onDownload) return;

		setIsDownloading(true);
		try {
			await onDownload();
		} finally {
			setIsDownloading(false);
		}
	};

	const handleView = async () => {
		if (disabled || isViewing || !onView) return;

		setIsViewing(true);
		try {
			await onView();
		} finally {
			setIsViewing(false);
		}
	};

	return (
		<div
			className={cn(
				"flex items-center gap-2 pt-3 border-t border-border/50",
				className,
			)}
		>
			{onDownload && (
				<Button
					variant="outline"
					size="sm"
					className="h-8 text-xs"
					onClick={handleDownload}
					disabled={disabled || isDownloading}
				>
					{isDownloading ? (
						<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
					) : (
						<Download className="mr-1.5 h-3.5 w-3.5" />
					)}
					Download
				</Button>
			)}

			{onView && (
				<Button
					variant="outline"
					size="sm"
					className="h-8 text-xs"
					onClick={handleView}
					disabled={disabled || isViewing}
				>
					{isViewing ? (
						<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
					) : (
						<ExternalLink className="mr-1.5 h-3.5 w-3.5" />
					)}
					View Original
				</Button>
			)}

			<div className="flex-1" />

			<AlertDialog>
				<AlertDialogTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
						disabled={disabled || isDeleting}
					>
						{isDeleting ? (
							<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
						) : (
							<Trash2 className="mr-1.5 h-3.5 w-3.5" />
						)}
						Delete
					</Button>
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete {filename}?</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone. AI analysis will be permanently
							removed.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
