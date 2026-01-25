"use client";

import { Suspense, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { FileUploader } from "@/components/shared/common/file-uploader";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { projectsAPI } from "@/lib/api/projects";
import type { ProjectFile } from "@/lib/project-types";
import {
	useCurrentProject,
	useProjectLoading,
} from "@/lib/stores/project-store";
import { FileList } from "./files-tab-enhanced/file-list";
import type { EnhancedProjectFile } from "./files-tab-enhanced/types";
import {
	getFileCategory,
	parseProcessingStatus,
} from "./files-tab-enhanced/types";

interface FilesTabEnhancedProps {
	projectId: string;
	onDataImported?: () => void;
}

/**
 * Convert backend ProjectFile to EnhancedProjectFile.
 *
 * Note: ProjectFile only has ai_analysis as boolean flag.
 * Full AI analysis data is fetched lazily when expanding a file.
 * This enables fast list rendering without loading all analysis data upfront.
 */
function toEnhancedFile(file: ProjectFile): EnhancedProjectFile {
	return {
		id: file.id,
		filename: file.filename,
		fileSize: file.file_size,
		fileType: file.file_type,
		category: getFileCategory(file.file_type, file.category),
		uploadedAt: file.uploaded_at,
		hasProcessedText: Boolean(file.processed_text),
		hasAIAnalysis: Boolean(file.ai_analysis),
		processingStatus: parseProcessingStatus(file.processing_status),
		// AI analysis is fetched lazily on expand - see FileListItem
		aiAnalysis: null,
	};
}

function FileListSkeleton() {
	return (
		<div className="space-y-2">
			{[1, 2, 3].map((i) => (
				<div key={i} className="flex items-center gap-3 p-4 border rounded-lg">
					<Skeleton className="h-6 w-16" />
					<Skeleton className="h-5 w-1/3" />
					<Skeleton className="h-4 w-2/3" />
				</div>
			))}
		</div>
	);
}

export function FilesTabEnhanced({
	projectId,
	onDataImported,
}: FilesTabEnhancedProps) {
	const currentProject = useCurrentProject();
	const isLoading = useProjectLoading();
	const isProjectLoaded = currentProject?.id === projectId;
	const isArchived =
		currentProject?.id === projectId && Boolean(currentProject.archivedAt);

	// Convert files to enhanced format
	const enhancedFiles = useMemo(() => {
		if (!currentProject || currentProject.id !== projectId) return [];
		return (currentProject.files ?? []).map(toEnhancedFile);
	}, [currentProject, projectId]);

	const handleDeleteFile = useCallback(
		async (fileId: string) => {
			try {
				await projectsAPI.deleteFile(projectId, fileId);
				onDataImported?.();
				toast.success("File deleted");
			} catch (error) {
				console.error("Delete failed:", error);
				toast.error("Failed to delete file");
			}
		},
		[onDataImported, projectId],
	);

	const handleRetryProcessing = useCallback(() => {
		toast.info("Retry processing is not available yet");
	}, []);

	const handleDownload = useCallback(
		async (fileId: string, filename: string) => {
			try {
				const blob = await projectsAPI.downloadFileBlob(fileId);
				const url = URL.createObjectURL(blob);
				const link = document.createElement("a");
				link.href = url;
				link.download = filename;
				link.rel = "noopener";
				link.click();
				setTimeout(() => URL.revokeObjectURL(url), 100);
			} catch (error) {
				console.error("Download failed:", error);
				toast.error("Failed to download file");
			}
		},
		[],
	);

	const handleView = useCallback(async (fileId: string) => {
		try {
			const blob = await projectsAPI.downloadFileBlob(fileId);
			const url = URL.createObjectURL(blob);
			window.open(url, "_blank", "noopener,noreferrer");
			setTimeout(() => URL.revokeObjectURL(url), 60_000);
		} catch (error) {
			console.error("Open failed:", error);
			toast.error("Failed to open file");
		}
	}, []);

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<h2 className="text-2xl font-semibold text-gradient">
					File Management
				</h2>
				<p className="text-muted-foreground">
					Upload laboratory analyses, technical reports or documents to
					automatically extract data with AI.
				</p>
			</div>

			{isArchived && (
				<Card className="border-warning/40 bg-warning/10">
					<CardContent className="p-4 text-sm text-muted-foreground">
						This project is archived. File uploads and deletions are disabled.
					</CardContent>
				</Card>
			)}

			<FileUploader
				projectId={projectId}
				onUploadComplete={onDataImported}
				readOnly={isArchived}
			/>

			<div className="space-y-4">
				<h3 className="font-medium">Uploaded Files</h3>

				{isLoading && !isProjectLoaded ? (
					<FileListSkeleton />
				) : (
					<Suspense fallback={<FileListSkeleton />}>
						<FileList
							projectId={projectId}
							files={enhancedFiles}
							isLoading={isLoading && !isProjectLoaded}
							onDelete={handleDeleteFile}
							onRetry={handleRetryProcessing}
							onDownload={handleDownload}
							onView={handleView}
							disabled={isArchived}
						/>
					</Suspense>
				)}
			</div>
		</div>
	);
}
