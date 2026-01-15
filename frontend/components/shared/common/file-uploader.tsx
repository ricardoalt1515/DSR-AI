"use client";

import {
	AlertCircle,
	CheckCircle,
	Clock,
	FileImage,
	FileSpreadsheet,
	FileText,
	Globe,
	Loader2,
	Upload,
	X,
	XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { projectsAPI } from "@/lib/api/projects";
import { TIME_MS, UI_DELAYS } from "@/lib/constants";
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

// Quality grade badge styles - semantic colors for quick scanning
const QUALITY_BADGE_STYLES = {
	High: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
	Medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
	Low: "bg-rose-500/15 text-rose-400 border-rose-500/30",
} as const;

// Processing status badge configuration - uses Lucide icon components
const PROCESSING_STATUS_CONFIG = {
	queued: {
		label: "Queued",
		IconComponent: Clock,
		iconClassName: "",
		style: "bg-muted text-muted-foreground border-muted",
	},
	processing: {
		label: "Processing",
		IconComponent: Loader2,
		iconClassName: "animate-spin",
		style: "bg-primary/15 text-primary border-primary/30",
	},
	completed: {
		label: "Ready",
		IconComponent: CheckCircle,
		iconClassName: "",
		style: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
	},
	failed: {
		label: "Failed",
		IconComponent: XCircle,
		iconClassName: "",
		style: "bg-rose-500/15 text-rose-400 border-rose-500/30",
	},
	not_processed: null,
} as const;

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

/**
 * Get processing status badge configuration.
 */
function getProcessingBadge(status: string, hasAiCapability: boolean) {
	if (!hasAiCapability) return null;

	const config =
		PROCESSING_STATUS_CONFIG[status as keyof typeof PROCESSING_STATUS_CONFIG];
	return config ?? null;
}

type ImageAnalysisQuality = "High" | "Medium" | "Low";
type ImageAnalysisLifecycleStatus =
	| "Like-new"
	| "Good"
	| "Used"
	| "Degraded"
	| "End-of-life";
type ImageAnalysisConfidence = "High" | "Medium" | "Low";
type DisposalPathway =
	| "Landfill"
	| "Incineration"
	| "Stockpiling"
	| "Open burning"
	| "Unknown";

type ImageCompositionItem = {
	component: string;
	proportion: string;
};

type ImageAnalysisOutput = {
	material_type: string;
	quality_grade: ImageAnalysisQuality;
	lifecycle_status: ImageAnalysisLifecycleStatus;
	confidence: ImageAnalysisConfidence;
	estimated_composition: ImageCompositionItem[];
	current_disposal_pathway: DisposalPathway;
	co2_if_disposed: number;
	co2_if_diverted: number;
	co2_savings: number;
	esg_statement: string;
	lca_assumptions: string;
	ppe_requirements: string[];
	storage_requirements: string[];
	degradation_risks: string[];
	visible_hazards: string[];
	summary: string;
};

function asImageAnalysisOutput(
	analysis: Record<string, unknown>,
): ImageAnalysisOutput | null {
	const materialType = analysis.material_type;
	const qualityGrade = analysis.quality_grade;
	const lifecycleStatus = analysis.lifecycle_status;
	const confidence = analysis.confidence;
	const summary = analysis.summary;

	if (
		typeof materialType !== "string" ||
		typeof qualityGrade !== "string" ||
		typeof lifecycleStatus !== "string" ||
		typeof confidence !== "string" ||
		typeof summary !== "string"
	) {
		return null;
	}

	return analysis as unknown as ImageAnalysisOutput;
}

function formatTco2(value: number): string {
	if (!Number.isFinite(value)) return "—";
	return value.toFixed(1);
}

function NonEmptyList({ items }: { items: string[] }) {
	if (items.length === 0)
		return <p className="text-xs text-muted-foreground">—</p>;
	return (
		<ul className="list-disc pl-4 space-y-1">
			{items.map((item) => (
				<li key={item} className="text-xs text-muted-foreground">
					{item}
				</li>
			))}
		</ul>
	);
}

function ImageAnalysisDetails({
	analysis,
}: {
	analysis: Record<string, unknown>;
}) {
	const data = asImageAnalysisOutput(analysis);
	if (!data) {
		return (
			<p className="text-xs text-muted-foreground">
				No structured analysis available. View raw JSON for details.
			</p>
		);
	}

	return (
		<Accordion type="multiple" className="w-full">
			<AccordionItem value="summary">
				<AccordionTrigger>Summary</AccordionTrigger>
				<AccordionContent className="space-y-3">
					<p className="text-xs text-muted-foreground">{data.summary}</p>
					<div className="flex flex-wrap gap-2">
						<Badge variant="secondary" className="text-[10px]">
							{data.material_type}
						</Badge>
						<Badge variant="outline" className="text-[10px]">
							Quality: {data.quality_grade}
						</Badge>
						<Badge variant="outline" className="text-[10px]">
							Lifecycle: {data.lifecycle_status}
						</Badge>
						<Badge variant="outline" className="text-[10px]">
							Confidence: {data.confidence}
						</Badge>
					</div>
				</AccordionContent>
			</AccordionItem>

			<AccordionItem value="composition">
				<AccordionTrigger>Estimated composition</AccordionTrigger>
				<AccordionContent>
					{data.estimated_composition.length === 0 ? (
						<p className="text-xs text-muted-foreground">—</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Component</TableHead>
									<TableHead>Proportion</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.estimated_composition.map((item) => (
									<TableRow key={`${item.component}-${item.proportion}`}>
										<TableCell className="text-xs">{item.component}</TableCell>
										<TableCell className="text-xs text-muted-foreground">
											{item.proportion}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</AccordionContent>
			</AccordionItem>

			<AccordionItem value="impact">
				<AccordionTrigger>Environmental impact</AccordionTrigger>
				<AccordionContent className="space-y-3">
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
						<div className="rounded-md border bg-card/50 p-3">
							<p className="text-xs font-semibold">Disposal pathway</p>
							<p className="text-xs text-muted-foreground">
								{data.current_disposal_pathway}
							</p>
						</div>
						<div className="rounded-md border bg-card/50 p-3">
							<p className="text-xs font-semibold">CO₂ savings</p>
							<p className="text-xs text-muted-foreground">
								{formatTco2(data.co2_savings)} tCO₂e/year
							</p>
						</div>
						<div className="rounded-md border bg-card/50 p-3">
							<p className="text-xs font-semibold">CO₂ if disposed</p>
							<p className="text-xs text-muted-foreground">
								{formatTco2(data.co2_if_disposed)} tCO₂e/year
							</p>
						</div>
						<div className="rounded-md border bg-card/50 p-3">
							<p className="text-xs font-semibold">CO₂ if diverted</p>
							<p className="text-xs text-muted-foreground">
								{formatTco2(data.co2_if_diverted)} tCO₂e/year
							</p>
						</div>
					</div>

					<div className="space-y-1">
						<p className="text-xs font-semibold">ESG statement</p>
						<div className="max-h-40 overflow-y-auto rounded-md border bg-card/50 p-3">
							<p className="text-xs text-muted-foreground whitespace-pre-wrap">
								{data.esg_statement}
							</p>
						</div>
					</div>

					{data.lca_assumptions.trim() && (
						<div className="space-y-1">
							<p className="text-xs font-semibold">LCA assumptions</p>
							<p className="text-xs text-muted-foreground whitespace-pre-wrap">
								{data.lca_assumptions}
							</p>
						</div>
					)}
				</AccordionContent>
			</AccordionItem>

			<AccordionItem value="safety">
				<AccordionTrigger>Handling & safety</AccordionTrigger>
				<AccordionContent className="space-y-4">
					<div className="space-y-1">
						<p className="text-xs font-semibold">PPE requirements</p>
						<NonEmptyList items={data.ppe_requirements} />
					</div>
					<div className="space-y-1">
						<p className="text-xs font-semibold">Storage requirements</p>
						<NonEmptyList items={data.storage_requirements} />
					</div>
					<div className="space-y-1">
						<p className="text-xs font-semibold">Degradation risks</p>
						<NonEmptyList items={data.degradation_risks} />
					</div>
					<div className="space-y-1">
						<p className="text-xs font-semibold">Visible hazards</p>
						<NonEmptyList items={data.visible_hazards} />
					</div>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
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
			{/* Upload Drop Zone */}
			<Card className="aqua-panel">
				<CardContent className="p-6">
					<div
						{...getRootProps()}
						className={cn(
							"relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-all duration-200",
							isDragActive
								? "border-primary bg-primary/10 scale-[1.02] shadow-lg shadow-primary/20"
								: "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/25",
						)}
					>
						<input {...getInputProps()} />

						<div className="mx-auto flex flex-col items-center space-y-4">
							<div
								className={cn(
									"rounded-full bg-primary/10 p-4 transition-transform duration-200",
									isDragActive && "scale-110 animate-bounce",
								)}
							>
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
								// Use capability flags from file data
								const hasAiCapability =
									file.category === "photos" || file.ai_analysis;
								const processingBadge = getProcessingBadge(
									file.processing_status,
									hasAiCapability,
								);

								return (
									<div
										key={file.id}
										role="button"
										tabIndex={0}
										className="group flex items-start gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card hover:border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer w-full text-left"
										onClick={() => handleSelectFile(file.id)}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												handleSelectFile(file.id);
											}
										}}
									>
										<div className="rounded-lg bg-primary/10 p-2.5 group-hover:bg-primary/15 transition-colors">
											<FileIcon className="h-5 w-5 text-primary" />
										</div>

										<div className="flex-1 min-w-0 space-y-1">
											<div className="flex items-center gap-2">
												<p className="text-sm font-medium truncate">
													{file.filename}
												</p>
												{/* Processing status badge with Lucide icons */}
												{processingBadge && (
													<Badge
														variant="outline"
														className={cn(
															"text-[10px] shrink-0 border flex items-center gap-1",
															processingBadge.style,
														)}
													>
														<processingBadge.IconComponent
															className={cn(
																"h-3 w-3",
																processingBadge.iconClassName,
															)}
														/>
														{processingBadge.label}
													</Badge>
												)}
											</div>
											<div className="flex items-center gap-2 text-xs text-muted-foreground">
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
											aria-label={`Delete ${file.filename}`}
											onClick={(event) => {
												event.stopPropagation();
												setFileToDelete({ id: file.id, name: file.filename });
											}}
											className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
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
					<CardContent className="p-6 space-y-4">
						{/* Header with filename and loading state */}
						<div className="flex items-center justify-between">
							<div className="flex-1 min-w-0">
								<h4 className="text-base font-semibold truncate">
									{selectedFile.filename}
								</h4>
								<p className="text-xs text-muted-foreground">
									{formatFileSize(selectedFile.file_size)} •{" "}
									{selectedFile.file_type.toUpperCase()}
								</p>
							</div>
							{isLoadingDetail && (
								<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
							)}
						</div>

						{/* Image Preview - Larger */}
						{previewUrl && (
							<div className="relative rounded-lg overflow-hidden border bg-black/10">
								<img
									src={previewUrl}
									alt={selectedFile.filename}
									className="max-h-80 w-full object-contain"
								/>
							</div>
						)}

						{/* Quick Insights - Always visible when AI analysis exists */}
						{selectedFile.ai_analysis &&
							(() => {
								const analysis = asImageAnalysisOutput(
									selectedFile.ai_analysis,
								);
								if (!analysis) return null;

								const qualityStyle =
									QUALITY_BADGE_STYLES[analysis.quality_grade] || "";

								return (
									<div className="space-y-3 p-4 rounded-lg bg-muted/30 border">
										{/* Material + Quality badges row */}
										<div className="flex flex-wrap items-center gap-2">
											<Badge
												variant="secondary"
												className="text-xs font-medium"
											>
												{analysis.material_type}
											</Badge>
											<Badge
												variant="outline"
												className={cn("text-xs border", qualityStyle)}
											>
												{analysis.quality_grade} Quality
											</Badge>
											<Badge variant="outline" className="text-xs">
												{analysis.lifecycle_status}
											</Badge>
										</div>

										{/* CO₂ Savings - Prominent */}
										{analysis.co2_savings > 0 && (
											<div className="flex items-center gap-3 p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20">
												<Globe className="h-6 w-6 text-emerald-400" />
												<div>
													<p className="text-sm font-semibold text-emerald-400">
														~{analysis.co2_savings.toFixed(1)} tCO₂e
													</p>
													<p className="text-xs text-muted-foreground">
														Estimated CO₂ savings
													</p>
												</div>
											</div>
										)}

										{/* ESG Statement - Preview */}
										{analysis.esg_statement && (
											<div className="space-y-1">
												<p className="text-xs font-medium text-muted-foreground">
													ESG Statement
												</p>
												<p className="text-xs text-muted-foreground line-clamp-2 italic">
													"{analysis.esg_statement}"
												</p>
											</div>
										)}
									</div>
								);
							})()}

						{/* Processed Text for documents */}
						{selectedFile.processed_text && (
							<div className="space-y-2">
								<p className="text-xs font-semibold">Extracted Content</p>
								<div className="max-h-32 overflow-y-auto rounded-md border bg-card/50 p-3">
									<p className="text-xs text-muted-foreground whitespace-pre-wrap">
										{selectedFile.processed_text}
									</p>
								</div>
							</div>
						)}

						{/* Expandable full details */}
						{selectedFile.ai_analysis && (
							<Accordion type="single" collapsible className="w-full">
								<AccordionItem value="details" className="border-none">
									<AccordionTrigger className="text-xs font-medium py-2 hover:no-underline">
										View full analysis details
									</AccordionTrigger>
									<AccordionContent>
										<div className="max-h-[400px] overflow-y-auto pr-2">
											<ImageAnalysisDetails
												analysis={selectedFile.ai_analysis}
											/>

											{/* Raw JSON toggle */}
											<div className="mt-4 pt-4 border-t">
												<Button
													variant="ghost"
													size="sm"
													className="h-7 px-2 text-[10px]"
													onClick={() => setShowRawAnalysis((prev) => !prev)}
												>
													{showRawAnalysis ? "Hide raw JSON" : "View raw JSON"}
												</Button>
												{showRawAnalysis && (
													<pre className="text-[10px] mt-2 max-h-40 overflow-y-auto bg-muted rounded-md p-2 whitespace-pre-wrap">
														{JSON.stringify(selectedFile.ai_analysis, null, 2)}
													</pre>
												)}
											</div>
										</div>
									</AccordionContent>
								</AccordionItem>
							</Accordion>
						)}

						{/* No analysis available message */}
						{!selectedFile.processed_text && !selectedFile.ai_analysis && (
							<p className="text-xs text-muted-foreground text-center py-4">
								No analysis available for this file.
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
