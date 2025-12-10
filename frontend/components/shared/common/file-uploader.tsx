"use client";

import {
	AlertCircle,
	CheckCircle,
	FileImage,
	FileSpreadsheet,
	FileText,
	Loader2,
	Upload,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { TIME_MS, UI_DELAYS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { projectsAPI } from "@/lib/api/projects";
import type { ProjectFile, ProjectFileDetail } from "@/lib/project-types";

// ============================================================================
// Types
// ============================================================================

interface FileUploaderProps {
	projectId: string;
	onUploadComplete?: (() => void) | undefined;
	maxFiles?: number;
	maxSize?: number; // in bytes
	className?: string;
}

interface UploadingFile {
	id: string;
	file: File;
	progress: number;
	status: "uploading" | "success" | "error";
	error?: string;
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

const FILE_TYPE_ICONS: Record<string, typeof FileText> = {
	pdf: FileText,
	xlsx: FileSpreadsheet,
	xls: FileSpreadsheet,
	csv: FileSpreadsheet,
	json: FileText,
	txt: FileText,
	jpg: FileImage,
	jpeg: FileImage,
	png: FileImage,
};

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_MAX_FILES = 5;
const STATUS_POLL_INTERVAL_MS = 5000;
const MAX_ANALYSIS_INSIGHTS = 5;

// ============================================================================
// Helper Functions
// ============================================================================

function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffDays = Math.floor(diffMs / TIME_MS.DAY);

	if (diffDays === 0) return "Today";
	if (diffDays === 1) return "Yesterday";
	if (diffDays < 7) return `${diffDays} days ago`;

	return date.toLocaleDateString();
}

function getFileIcon(fileType: string): typeof FileText {
	return FILE_TYPE_ICONS[fileType.toLowerCase()] || FileText;
}

function extractPhotoInsights(
	analysis: Record<string, unknown> | null | undefined,
): string[] {
	if (!analysis || typeof analysis !== "object") {
		return [];
	}

	// Use snake_case to match backend schema
	const data = analysis as {
		summary?: string;
		confidence?: string;
		material_type?: string;
		quality_grade?: string;
		lifecycle_status?: string;
		co2_savings?: number;
		esg_statement?: string;
	};

	const insights: string[] = [];

	// Summary first (most important)
	if (typeof data.summary === "string" && data.summary.trim()) {
		insights.push(data.summary.trim());
	}

	// Core identification
	if (data.material_type && insights.length < MAX_ANALYSIS_INSIGHTS) {
		insights.push(`Material: ${data.material_type}`);
	}
	if (data.quality_grade && insights.length < MAX_ANALYSIS_INSIGHTS) {
		insights.push(`Quality: ${data.quality_grade}`);
	}
	if (data.lifecycle_status && insights.length < MAX_ANALYSIS_INSIGHTS) {
		insights.push(`Lifecycle: ${data.lifecycle_status}`);
	}

	// LCA data (key differentiator)
	if (typeof data.co2_savings === "number" && data.co2_savings > 0 && insights.length < MAX_ANALYSIS_INSIGHTS) {
		insights.push(`CO₂ savings: ${data.co2_savings} tCO₂e/year`);
	}

	return insights.slice(0, MAX_ANALYSIS_INSIGHTS);
}

// ============================================================================
// Main Component
// ============================================================================

export function FileUploader({
	projectId,
	onUploadComplete,
	maxFiles = DEFAULT_MAX_FILES,
	maxSize = DEFAULT_MAX_SIZE,
	className,
}: FileUploaderProps) {
	const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
	const [uploadedFiles, setUploadedFiles] = useState<ProjectFile[]>([]);
	const [isLoadingFiles, setIsLoadingFiles] = useState(true);
	const [selectedFile, setSelectedFile] = useState<ProjectFileDetail | null>(null);
	const [isLoadingDetail, setIsLoadingDetail] = useState(false);
	const [showRawAnalysis, setShowRawAnalysis] = useState(false);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [fileToDelete, setFileToDelete] = useState<{ id: string; name: string } | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const statusPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
				extension === "jpg" ||
				extension === "jpeg" ||
				extension === "png";

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
	});

	// ========================================================================
	// Delete file
	// ========================================================================

	const deleteFile = async (fileId: string) => {
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
			(file) => file.category === "photos" && file.processing_status !== "completed",
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
			{/* Upload Drop Zone */}
			<Card className="aqua-panel">
				<CardContent className="p-6">
					<div
						{...getRootProps()}
						className={cn(
							"relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
							isDragActive
								? "border-primary bg-primary/5"
								: "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/25",
						)}
					>
						<input {...getInputProps()} />

						<div className="mx-auto flex flex-col items-center space-y-4">
							<div className="rounded-full bg-primary/10 p-4">
								<Upload className="h-8 w-8 text-primary" />
							</div>

							<div className="space-y-2">
								<h3 className="text-lg font-semibold">
									{isDragActive ? "Drop files here" : "Upload files"}
								</h3>
								<p className="text-sm text-muted-foreground">
									Drag files or click to select
								</p>
								<p className="text-xs text-muted-foreground">
									Supports PDF, Excel, CSV, JSON, TXT, Images (max{" "}
									{formatFileSize(maxSize)})
								</p>
							</div>

							<Button variant="outline">Select Files</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Uploading Files */}
			{uploadingFiles.length > 0 && (
				<Card className="aqua-panel">
					<CardContent className="p-6">
						<h3 className="text-lg font-semibold mb-4">Uploading...</h3>
						<div className="space-y-3">
							{uploadingFiles.map((uploadingFile) => {
								const FileIcon = getFileIcon(
									uploadingFile.file.name.split(".").pop() || "",
								);

								return (
									<div
										key={uploadingFile.id}
										className="flex items-center gap-3 p-3 rounded-lg border bg-card/50"
									>
										<div className="rounded-lg bg-primary/10 p-2">
											<FileIcon className="h-5 w-5 text-primary" />
										</div>

										<div className="flex-1 min-w-0 space-y-1">
											<div className="flex items-center justify-between">
												<p className="text-sm font-medium truncate">
													{uploadingFile.file.name}
												</p>
												<span className="text-xs text-muted-foreground ml-2">
													{formatFileSize(uploadingFile.file.size)}
												</span>
											</div>

											{uploadingFile.status === "uploading" && (
												<div className="space-y-1">
													<Progress
														value={uploadingFile.progress}
														className="h-1.5"
													/>
													<p className="text-xs text-muted-foreground">
														{uploadingFile.progress}%
													</p>
												</div>
											)}

											{uploadingFile.status === "success" && (
												<div className="flex items-center gap-1 text-success">
													<CheckCircle className="h-3 w-3" />
													<span className="text-xs">Uploaded successfully</span>
												</div>
											)}

											{uploadingFile.status === "error" && (
												<div className="flex items-center gap-1 text-destructive">
													<AlertCircle className="h-3 w-3" />
													<span className="text-xs">
														{uploadingFile.error || "Upload failed"}
													</span>
												</div>
											)}
										</div>

										{uploadingFile.status === "uploading" && (
											<Button
												variant="ghost"
												size="sm"
												onClick={() => cancelUpload(uploadingFile.id)}
											>
												<X className="h-4 w-4" />
											</Button>
										)}
									</div>
								);
							})}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Uploaded Files List */}
			{isLoadingFiles ? (
				<Card className="aqua-panel">
					<CardContent className="p-6">
						<div className="flex items-center justify-center gap-2">
							<Loader2 className="h-5 w-5 animate-spin" />
							<span className="text-sm text-muted-foreground">
								Loading files...
							</span>
						</div>
					</CardContent>
				</Card>
			) : uploadedFiles.length > 0 ? (
				<Card className="aqua-panel">
					<CardContent className="p-6">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-semibold">Uploaded Files</h3>
							<span className="text-sm text-muted-foreground">
								{uploadedFiles.length} / {maxFiles} files
							</span>
						</div>

						<div className="space-y-3">
							{uploadedFiles.map((file) => {
								const FileIcon = getFileIcon(file.file_type);
								const isPhoto = file.category === "photos";
								const status = file.processing_status;
								let statusLabel: string | null = null;
								if (status === "completed") {
									statusLabel = "Analyzed";
								} else if (status === "queued" || status === "processing") {
									statusLabel = "Processing...";
								} else if (status === "not_processed" && isPhoto) {
									statusLabel = "Processing...";
								}

								return (
									<div
										key={file.id}
										className="flex items-center gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors cursor-pointer"
										onClick={() => handleSelectFile(file.id)}
									>
										<div className="rounded-lg bg-primary/10 p-2">
											<FileIcon className="h-5 w-5 text-primary" />
										</div>

										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium truncate">
												{file.filename}
											</p>
											<div className="flex items-center gap-3 text-xs text-muted-foreground">
												<span>{formatFileSize(file.file_size)}</span>
												<span>•</span>
												<span className="uppercase">{file.file_type}</span>
												<span>•</span>
												<span>{formatDate(file.uploaded_at)}</span>
											</div>
											{statusLabel && (
												<Badge variant="outline" className="mt-1 text-[10px]">
													{statusLabel}
												</Badge>
											)}
										</div>

										<Button
											variant="ghost"
											size="sm"
											onClick={(event) => {
												event.stopPropagation();
												setFileToDelete({ id: file.id, name: file.filename });
											}}
											className="text-destructive hover:text-destructive"
										>
											<X className="h-4 w-4" />
										</Button>
									</div>
								);
							})}
						</div>
					</CardContent>
				</Card>
			) : (
				<Card className="aqua-panel">
					<CardContent className="p-6">
						<p className="text-sm text-muted-foreground text-center">
							No files uploaded yet
						</p>
					</CardContent>
				</Card>
			)}

			{/* File detail panel */}
			{selectedFile && (
				<Card className="aqua-panel">
					<CardContent className="p-6 space-y-3">
						<div className="flex items-center justify-between">
							<h4 className="text-sm font-semibold">File analysis</h4>
							{isLoadingDetail && (
								<span className="text-xs text-muted-foreground">
									Loading...
								</span>
							)}
						</div>
						<p className="text-xs text-muted-foreground break-words">
							{selectedFile.filename}
						</p>
						{previewUrl && (
							<div className="mt-2">
								<img
									src={previewUrl}
									alt={selectedFile.filename}
									className="max-h-64 w-full object-contain rounded-md border bg-black/20"
								/>
							</div>
						)}
						{selectedFile.processed_text && (
							<div className="space-y-1">
								<p className="text-xs font-semibold">Extracted text</p>
								<p className="text-xs max-h-40 overflow-y-auto whitespace-pre-wrap">
									{selectedFile.processed_text}
								</p>
							</div>
						)}
						{selectedFile.ai_analysis && (
							<div className="space-y-2">
								{extractPhotoInsights(selectedFile.ai_analysis).length > 0 && (
									<div className="space-y-1">
										<p className="text-xs font-semibold">Key insights</p>
										<ul className="list-disc pl-4 space-y-1">
											{extractPhotoInsights(selectedFile.ai_analysis).map(
												(insight) => (
													<li
														key={insight}
														className="text-xs text-muted-foreground"
													>
														{insight}
													</li>
												),
											)}
										</ul>
									</div>
								)}
								<div className="space-y-1">
									<Button
										variant="ghost"
										size="sm"
										className="h-7 px-2 text-[10px]"
										onClick={() => setShowRawAnalysis((prev) => !prev)}
									>
										{showRawAnalysis ? "Hide raw JSON" : "View raw JSON"}
									</Button>
									{showRawAnalysis && (
										<pre className="text-[10px] max-h-40 overflow-y-auto bg-muted rounded-md p-2 whitespace-pre-wrap">
											{JSON.stringify(selectedFile.ai_analysis, null, 2)}
										</pre>
									)}
								</div>
							</div>
						)}
						{!selectedFile.processed_text && !selectedFile.ai_analysis && (
							<p className="text-xs text-muted-foreground">
								No analysis available for this file yet.
							</p>
						)}
					</CardContent>
				</Card>
			)}

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
