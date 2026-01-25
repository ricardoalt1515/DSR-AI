"use client";

import { FileText, Loader2, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { FILE_UPLOAD } from "@/lib/constants";
import { formatFileSize } from "@/lib/format";
import { cn } from "@/lib/utils";

interface UploadingFile {
	id: string;
	file: File;
	progress: number;
	status: "uploading" | "success" | "error";
	error?: string;
}

interface QuickUploadSectionProps {
	projectId: string;
	disabled?: boolean;
	onUpload?: (file: File, category: string) => Promise<void>;
	maxSize?: number;
}

const ACCEPTED_FILE_TYPES = {
	"application/pdf": [".pdf"],
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
		".docx",
	],
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
		".xlsx",
	],
	"application/vnd.ms-excel": [".xls"],
	"text/csv": [".csv"],
	"image/jpeg": [".jpg", ".jpeg"],
	"image/png": [".png"],
};

const DEFAULT_MAX_SIZE = FILE_UPLOAD.MAX_SIZE_MB * 1024 * 1024;

export function QuickUploadSection({
	projectId: _projectId,
	disabled = false,
	onUpload,
	maxSize = DEFAULT_MAX_SIZE,
}: QuickUploadSectionProps) {
	const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
	const [category, setCategory] = useState("general");

	const uploadFile = useCallback(
		async (file: File, fileId: string) => {
			let progressInterval: ReturnType<typeof setInterval> | null = null;
			try {
				// Simulate progress
				progressInterval = setInterval(() => {
					setUploadingFiles((prev) =>
						prev.map((f) =>
							f.id === fileId && f.progress < 90
								? { ...f, progress: f.progress + 10 }
								: f,
						),
					);
				}, 150);

				if (onUpload) {
					await onUpload(file, category);
				}

				// Mark as complete
				setUploadingFiles((prev) =>
					prev.map((f) =>
						f.id === fileId
							? { ...f, progress: 100, status: "success" as const }
							: f,
					),
				);

				toast.success(`${file.name} uploaded`);

				// Remove after delay
				setTimeout(() => {
					setUploadingFiles((prev) => prev.filter((f) => f.id !== fileId));
				}, 1500);
			} catch (error) {
				setUploadingFiles((prev) =>
					prev.map((f) =>
						f.id === fileId
							? {
									...f,
									status: "error" as const,
									error:
										error instanceof Error ? error.message : "Upload failed",
								}
							: f,
					),
				);
				toast.error(`Failed to upload ${file.name}`);
			} finally {
				if (progressInterval) {
					clearInterval(progressInterval);
				}
			}
		},
		[category, onUpload],
	);

	const onDrop = useCallback(
		(acceptedFiles: File[]) => {
			if (disabled) {
				toast.info("Uploads disabled for archived projects");
				return;
			}

			for (const file of acceptedFiles) {
				if (file.size > maxSize) {
					toast.error(
						`${file.name} is too large. Max: ${formatFileSize(maxSize)}`,
					);
					continue;
				}

				const fileId = `${file.name}-${Date.now()}-${Math.random()}`;
				const newFile: UploadingFile = {
					id: fileId,
					file,
					progress: 0,
					status: "uploading",
				};

				setUploadingFiles((prev) => [...prev, newFile]);
				void uploadFile(file, fileId);
			}
		},
		[disabled, maxSize, uploadFile],
	);

	const cancelUpload = (fileId: string) => {
		setUploadingFiles((prev) => prev.filter((f) => f.id !== fileId));
		toast.info("Upload cancelled");
	};

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: ACCEPTED_FILE_TYPES,
		maxSize,
		multiple: true,
		disabled,
	});

	return (
		<Card className="rounded-3xl border-none bg-card/80">
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-base">
					<Upload className="h-4 w-4 text-primary" />
					Quick Upload
				</CardTitle>
				<CardDescription>Upload documents for AI analysis.</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
					<span className="text-xs font-medium text-foreground">Tag as</span>
					<Select
						value={category}
						onValueChange={setCategory}
						disabled={disabled}
					>
						<SelectTrigger className="h-8 w-[180px] rounded-xl text-xs">
							<SelectValue placeholder="Select type" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="general">General document</SelectItem>
							<SelectItem value="analysis">Lab report</SelectItem>
							<SelectItem value="regulatory">SDS</SelectItem>
							<SelectItem value="photos">Photo</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Compact dropzone */}
				<div
					{...getRootProps()}
					className={cn(
						"relative cursor-pointer rounded-2xl border-2 border-dashed p-4 text-center transition-all duration-200",
						isDragActive && !disabled
							? "border-primary bg-primary/10 scale-[1.02]"
							: "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/25",
						disabled &&
							"cursor-not-allowed opacity-60 hover:border-muted-foreground/25 hover:bg-transparent",
					)}
					aria-disabled={disabled}
				>
					<input {...getInputProps()} />
					<div className="flex items-center justify-center gap-3">
						<div
							className={cn(
								"rounded-full bg-primary/10 p-2 transition-transform duration-200",
								isDragActive && "scale-110",
							)}
						>
							<Upload className="h-5 w-5 text-primary" />
						</div>
						<div className="text-left">
							<p className="text-sm font-medium">
								{isDragActive && !disabled
									? "Drop files here"
									: "Drop or click to upload"}
							</p>
							<p className="text-xs text-muted-foreground">
								PDF, DOCX, Excel, Images (max {formatFileSize(maxSize)})
							</p>
						</div>
					</div>
				</div>

				{/* Uploading files */}
				{uploadingFiles.length > 0 && (
					<div className="space-y-2">
						{uploadingFiles.map((uploadingFile) => (
							<div
								key={uploadingFile.id}
								className="flex items-center gap-2 rounded-xl bg-muted/30 p-2"
							>
								<FileText className="h-4 w-4 shrink-0 text-primary" />
								<div className="flex-1 min-w-0">
									<p className="truncate text-xs font-medium">
										{uploadingFile.file.name}
									</p>
									{uploadingFile.status === "uploading" && (
										<Progress
											value={uploadingFile.progress}
											className="mt-1 h-1"
										/>
									)}
									{uploadingFile.status === "error" && (
										<p className="text-[10px] text-destructive">
											{uploadingFile.error}
										</p>
									)}
								</div>
								{uploadingFile.status === "uploading" && (
									<div className="flex items-center gap-1">
										<Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
										<span className="text-[10px] text-muted-foreground">
											{uploadingFile.progress}%
										</span>
										<Button
											variant="ghost"
											size="sm"
											className="h-6 w-6 p-0"
											onClick={() => cancelUpload(uploadingFile.id)}
										>
											<X className="h-3 w-3" />
										</Button>
									</div>
								)}
								{uploadingFile.status === "success" && (
									<span className="text-[10px] text-success">✓</span>
								)}
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
