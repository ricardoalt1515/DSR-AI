"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import type { UploadingFile } from "@/components/shared/common/file-uploader-sections";
import {
	FileDetailPanel,
	UploadDropZone,
	UploadedFilesCard,
	UploadingFilesCard,
} from "@/components/shared/common/file-uploader-sections";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { projectsAPI } from "@/lib/api/projects";
import { UI_DELAYS } from "@/lib/constants";
import { formatFileSize } from "@/lib/format";
import type { ProjectFile, ProjectFileDetail } from "@/lib/project-types";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface FileUploaderProps {
	projectId: string;
	onUploadComplete?: (() => void) | undefined;
	maxFiles?: number;
	maxSize?: number; // in bytes
	className?: string;
	readOnly?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const ACCEPTED_FILE_TYPES = {
	"application/pdf": [".pdf"],
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
		".xlsx",
	],
	"application/vnd.ms-excel": [".xls"],
	"text/csv": [".csv"],
	"application/json": [".json"],
	"text/plain": [".txt"],
	"image/jpeg": [".jpg", ".jpeg"],
	"image/png": [".png"],
};

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_MAX_FILES = 5;
const STATUS_POLL_INTERVAL_MS = 5000;

// ============================================================================
// Main Component
// ============================================================================

export function FileUploader({
	projectId,
	onUploadComplete,
	maxFiles = DEFAULT_MAX_FILES,
	maxSize = DEFAULT_MAX_SIZE,
	className,
	readOnly = false,
}: FileUploaderProps) {
	const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
	const [uploadedFiles, setUploadedFiles] = useState<ProjectFile[]>([]);
	const [isLoadingFiles, setIsLoadingFiles] = useState(true);
	const [selectedFile, setSelectedFile] = useState<ProjectFileDetail | null>(
		null,
	);
	const [isLoadingDetail, setIsLoadingDetail] = useState(false);
	const [showRawAnalysis, setShowRawAnalysis] = useState(false);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [fileToDelete, setFileToDelete] = useState<{
		id: string;
		name: string;
	} | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const statusPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
		null,
	);

	// ========================================================================
	// Fetch uploaded files from backend
	// ========================================================================

	const fetchUploadedFiles = useCallback(async () => {
		try {
			const files = await projectsAPI.getFiles(projectId);
			setUploadedFiles(files);
		} catch (_error) {
			toast.error("Error loading files");
		} finally {
			setIsLoadingFiles(false);
		}
	}, [projectId]);

	useEffect(() => {
		fetchUploadedFiles();
	}, [fetchUploadedFiles]);

	// ========================================================================
	// Upload file to backend
	// ========================================================================

	const uploadFile = useCallback(
		async (file: File, fileId: string) => {
			const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
			const isImage =
				extension === "jpg" || extension === "jpeg" || extension === "png";

			const category = isImage ? "photos" : "general";
			const processWithAi = isImage;

			try {
				// Simulate progress (since underlying fetch doesn't support upload progress natively)
				const progressInterval = setInterval(() => {
					setUploadingFiles((prev) =>
						prev.map((f) =>
							f.id === fileId && f.progress < 90
								? { ...f, progress: f.progress + 10 }
								: f,
						),
					);
				}, 200);

				await projectsAPI.uploadFile(projectId, file, {
					category,
					process_with_ai: processWithAi,
				});

				clearInterval(progressInterval);

				// Mark as complete
				setUploadingFiles((prev) =>
					prev.map((f) =>
						f.id === fileId
							? { ...f, progress: 100, status: "success" as const }
							: f,
					),
				);

				toast.success(`${file.name} uploaded successfully`);

				// Refresh file list
				await fetchUploadedFiles();
				onUploadComplete?.();

				// Remove from uploading list after a delay
				setTimeout(() => {
					setUploadingFiles((prev) => prev.filter((f) => f.id !== fileId));
				}, UI_DELAYS.SUCCESS_INDICATOR);
			} catch (_error) {
				setUploadingFiles((prev) =>
					prev.map((f) =>
						f.id === fileId
							? {
									...f,
									status: "error" as const,
									error:
										_error instanceof Error ? _error.message : "Upload failed",
								}
							: f,
					),
				);
				toast.error(`Failed to upload ${file.name}`);
			}
		},
		[projectId, fetchUploadedFiles, onUploadComplete],
	);

	// ========================================================================
	// Handle file drop
	// ========================================================================

	const onDrop = useCallback(
		(acceptedFiles: File[]) => {
			if (readOnly) {
				toast.info("Uploads are disabled for archived projects");
				return;
			}

			const totalFiles = uploadedFiles.length + uploadingFiles.length;

			if (totalFiles + acceptedFiles.length > maxFiles) {
				toast.error(`Maximum ${maxFiles} files allowed`);
				return;
			}

			acceptedFiles.forEach((file) => {
				if (file.size > maxSize) {
					toast.error(
						`${file.name} is too large. Max size: ${formatFileSize(maxSize)}`,
					);
					return;
				}

				const fileId = `${file.name}-${Date.now()}-${Math.random()}`;
				const newUploadingFile: UploadingFile = {
					id: fileId,
					file,
					progress: 0,
					status: "uploading",
				};

				setUploadingFiles((prev) => [...prev, newUploadingFile]);
				uploadFile(file, fileId);
			});
		},
		[
			maxFiles,
			maxSize,
			readOnly,
			uploadedFiles.length,
			uploadingFiles.length,
			uploadFile,
		],
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: ACCEPTED_FILE_TYPES,
		maxSize,
		multiple: true,
		disabled: readOnly,
	});

	// ========================================================================
	// Delete file
	// ========================================================================

	const deleteFile = async (fileId: string) => {
		if (readOnly) {
			toast.info("File deletion is disabled for archived projects");
			return;
		}

		setIsDeleting(true);
		try {
			await projectsAPI.deleteFile(projectId, fileId);
			toast.success("File deleted");
			await fetchUploadedFiles();
			// Close detail panel if deleted file was selected
			if (selectedFile?.id === fileId) {
				setSelectedFile(null);
			}
		} catch (_error) {
			toast.error("Failed to delete file");
		} finally {
			setIsDeleting(false);
		}
	};

	// ========================================================================
	// File detail
	// ========================================================================

	const handleSelectFile = async (fileId: string) => {
		setShowRawAnalysis(false);
		setIsLoadingDetail(true);
		try {
			const detail = await projectsAPI.getFileDetail(projectId, fileId);
			setSelectedFile(detail);
			// Load image preview only for photos; errors here shouldn't block details
			if (
				detail.file_type &&
				["jpg", "jpeg", "png"].includes(detail.file_type.toLowerCase())
			) {
				try {
					// Cleanup previous URL if exists
					if (previewUrl) {
						URL.revokeObjectURL(previewUrl);
					}
					const blob = await projectsAPI.downloadFileBlob(detail.id);
					const url = URL.createObjectURL(blob);
					setPreviewUrl(url);
				} catch (_error) {
					toast.error("Error loading image preview");
				}
			} else if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
				setPreviewUrl(null);
			}
		} catch (_error) {
			toast.error("Error loading file details");
		} finally {
			setIsLoadingDetail(false);
		}
	};

	// ========================================================================
	// Cancel uploading file
	// ========================================================================

	const cancelUpload = (fileId: string) => {
		setUploadingFiles((prev) => prev.filter((f) => f.id !== fileId));
		toast.info("Upload cancelled");
	};

	// ========================================================================
	// Auto-refresh files while photos are processing
	// ========================================================================

	useEffect(() => {
		const hasPendingPhoto = uploadedFiles.some(
			(file) =>
				file.category === "photos" && file.processing_status !== "completed",
		);

		if (hasPendingPhoto && !statusPollIntervalRef.current) {
			statusPollIntervalRef.current = setInterval(() => {
				void fetchUploadedFiles();
			}, STATUS_POLL_INTERVAL_MS);
		}

		if (!hasPendingPhoto && statusPollIntervalRef.current) {
			clearInterval(statusPollIntervalRef.current);
			statusPollIntervalRef.current = null;
		}
	}, [uploadedFiles, fetchUploadedFiles]);

	useEffect(() => {
		return () => {
			if (statusPollIntervalRef.current) {
				clearInterval(statusPollIntervalRef.current);
				statusPollIntervalRef.current = null;
			}
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	}, [previewUrl]);

	// ========================================================================
	// Render
	// ========================================================================

	return (
		<div className={cn("space-y-6", className)}>
			<UploadDropZone
				rootProps={getRootProps()}
				inputProps={getInputProps()}
				isDragActive={isDragActive}
				maxSize={maxSize}
				disabled={readOnly}
			/>

			<UploadingFilesCard
				files={uploadingFiles}
				onCancelUpload={cancelUpload}
			/>

			<UploadedFilesCard
				files={uploadedFiles}
				isLoading={isLoadingFiles}
				maxFiles={maxFiles}
				onSelectFile={handleSelectFile}
				onDeleteClick={(file) =>
					setFileToDelete({ id: file.id, name: file.filename })
				}
				readOnly={readOnly}
			/>

			<FileDetailPanel
				file={selectedFile}
				isLoading={isLoadingDetail}
				previewUrl={previewUrl}
				showRawAnalysis={showRawAnalysis}
				onToggleRawAnalysis={() => setShowRawAnalysis((prev) => !prev)}
			/>

			{/* Delete confirmation dialog */}
			<ConfirmDeleteDialog
				open={fileToDelete !== null}
				onOpenChange={(open) => !open && setFileToDelete(null)}
				onConfirm={async () => {
					if (fileToDelete) {
						await deleteFile(fileToDelete.id);
						setFileToDelete(null);
					}
				}}
				title="Delete file?"
				description="This action cannot be undone. The file will be permanently removed from the project."
				itemName={fileToDelete?.name}
				loading={isDeleting}
			/>
		</div>
	);
}
