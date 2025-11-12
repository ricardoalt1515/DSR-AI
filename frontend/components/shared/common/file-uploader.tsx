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
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TIME_MS, UI_DELAYS } from "@/lib/constants";
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
}

interface UploadingFile {
	id: string;
	file: File;
	progress: number;
	status: "uploading" | "success" | "error";
	error?: string;
}

interface UploadedFileInfo {
	id: string;
	filename: string;
	file_size: number;
	file_type: string;
	category: string;
	uploaded_at: string;
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
	const [uploadedFiles, setUploadedFiles] = useState<UploadedFileInfo[]>([]);
	const [isLoadingFiles, setIsLoadingFiles] = useState(true);

	// ========================================================================
	// Fetch uploaded files from backend
	// ========================================================================

	const fetchUploadedFiles = useCallback(async () => {
		try {
			const response = await fetch(`/api/v1/projects/${projectId}/files`, {
				credentials: "include",
			});

			if (!response.ok) {
				throw new Error("Failed to fetch files");
			}

			const data = await response.json();
			setUploadedFiles(data.files || []);
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
			const formData = new FormData();
			formData.append("file", file);
			formData.append("category", "general");
			formData.append("process_with_ai", "false");

			try {
				// Simulate progress (since fetch doesn't support upload progress natively)
				const progressInterval = setInterval(() => {
					setUploadingFiles((prev) =>
						prev.map((f) =>
							f.id === fileId && f.progress < 90
								? { ...f, progress: f.progress + 10 }
								: f,
						),
					);
				}, 200);

				const response = await fetch(`/api/v1/projects/${projectId}/files`, {
					method: "POST",
					body: formData,
					credentials: "include",
				});

				clearInterval(progressInterval);

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.detail || "Upload failed");
				}

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
		try {
			const response = await fetch(
				`/api/v1/projects/${projectId}/files/${fileId}`,
				{
					method: "DELETE",
					credentials: "include",
				},
			);

			if (!response.ok) {
				throw new Error("Failed to delete file");
			}

			toast.success("File deleted");
			await fetchUploadedFiles();
		} catch (_error) {
			toast.error("Failed to delete file");
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

								return (
									<div
										key={file.id}
										className="flex items-center gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors"
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
										</div>

										<Button
											variant="ghost"
											size="sm"
											onClick={() => deleteFile(file.id)}
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
		</div>
	);
}
