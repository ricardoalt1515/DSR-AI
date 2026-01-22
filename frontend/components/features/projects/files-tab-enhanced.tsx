"use client";

import {
	Bot,
	Clock,
	File,
	FileImage,
	FileSpreadsheet,
	FileText,
	HardDrive,
	Search,
	Sparkles,
	Upload,
	X,
} from "lucide-react";
import { memo, useMemo, useState } from "react";
import { FileUploader } from "@/components/shared/common/file-uploader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FilesListSkeleton } from "@/components/ui/files-grid-skeleton";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { formatFileSize, formatShortDateTime } from "@/lib/format";
import type { ProjectFile } from "@/lib/project-types";
import {
	useCurrentProject,
	useProjectLoading,
} from "@/lib/stores/project-store";
import { cn } from "@/lib/utils";

interface FilesTabEnhancedProps {
	projectId: string;
	onDataImported?: () => void;
}

function getFileIcon(fileType: string) {
	const type = fileType.toLowerCase();
	if (
		type.includes("image") ||
		type.includes("png") ||
		type.includes("jpg") ||
		type.includes("jpeg")
	) {
		return FileImage;
	}
	if (type.includes("pdf")) {
		return FileText;
	}
	if (
		type.includes("spreadsheet") ||
		type.includes("excel") ||
		type.includes("csv") ||
		type.includes("xlsx")
	) {
		return FileSpreadsheet;
	}
	return File;
}

const FileCard = memo(function FileCard({ file }: { file: ProjectFile }) {
	const Icon = getFileIcon(file.file_type);
	const isProcessing = file.processing_status === "processing";
	const isComplete = file.processing_status === "completed";

	return (
		<Card
			className={cn(
				"group hover:shadow-md transition-shadow duration-200",
				isProcessing && "border-primary/30 animate-pulse",
			)}
		>
			<CardContent className="p-4">
				<div className="flex items-start gap-3">
					<div
						className={cn(
							"p-2.5 rounded-lg shrink-0",
							isComplete ? "bg-success/10" : "bg-muted",
						)}
					>
						<Icon
							className={cn(
								"h-5 w-5",
								isComplete ? "text-success" : "text-muted-foreground",
							)}
						/>
					</div>
					<div className="flex-1 min-w-0 space-y-1">
						<p className="font-medium text-sm truncate" title={file.filename}>
							{file.filename}
						</p>
						<div className="flex items-center gap-2 text-xs text-muted-foreground">
							<span className="flex items-center gap-1">
								<HardDrive className="h-3 w-3" />
								{formatFileSize(file.file_size)}
							</span>
							<span className="flex items-center gap-1">
								<Clock className="h-3 w-3" />
								{formatShortDateTime(file.uploaded_at)}
							</span>
						</div>
						<div className="flex items-center gap-1.5 pt-1">
							{isProcessing && (
								<Badge
									variant="outline"
									className="text-xs h-5 gap-1 animate-pulse"
									title="AI is analyzing this file"
								>
									<Sparkles className="h-3 w-3" />
									Processing...
								</Badge>
							)}
							{file.processed_text && (
								<Badge
									variant="secondary"
									className="text-xs h-5 gap-1"
									title="Text extracted from file"
								>
									<FileText className="h-3 w-3" />
									Text
								</Badge>
							)}
							{file.ai_analysis && (
								<Badge
									variant="default"
									className="text-xs h-5 gap-1 bg-primary/90"
									title="AI analysis available"
								>
									<Bot className="h-3 w-3" />
									AI
								</Badge>
							)}
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
});

function EmptyFilesState() {
	return (
		<div className="flex flex-col items-center justify-center py-12 text-center">
			<div className="p-4 rounded-full bg-muted/50 mb-4">
				<Upload className="h-8 w-8 text-muted-foreground" />
			</div>
			<h3 className="font-medium text-lg mb-1">No files uploaded yet</h3>
			<p className="text-muted-foreground text-sm max-w-md">
				Upload laboratory analyses, technical reports, or documents above. Our
				AI will automatically extract relevant data.
			</p>
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
	const [searchTerm, setSearchTerm] = useState("");
	const [fileTypeFilter, setFileTypeFilter] = useState<string>("all");

	const files = useMemo(() => {
		if (!currentProject || currentProject.id !== projectId) return [];
		return currentProject.files ?? [];
	}, [currentProject, projectId]);

	// Filter files by search and type
	const filteredFiles = useMemo(() => {
		let result = files;

		// Filter by search term
		if (searchTerm) {
			const search = searchTerm.toLowerCase();
			result = result.filter((file) =>
				file.filename.toLowerCase().includes(search),
			);
		}

		// Filter by file type
		if (fileTypeFilter !== "all") {
			result = result.filter((file) => {
				if (fileTypeFilter === "document") {
					return file.file_type === "pdf" || file.file_type === "docx";
				}
				if (fileTypeFilter === "image") {
					return file.file_type === "jpg" || file.file_type === "png";
				}
				if (fileTypeFilter === "sds") {
					return file.category === "sds";
				}
				return true;
			});
		}

		return result;
	}, [files, searchTerm, fileTypeFilter]);

	const stats = useMemo(() => {
		const total = files.length;
		const withAI = files.filter((f) => f.ai_analysis).length;
		const processing = files.filter(
			(f) => f.processing_status === "processing",
		).length;
		return { total, withAI, processing };
	}, [files]);

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

			{/* Search and Filter */}
			{files.length > 0 && (
				<div className="flex flex-col sm:flex-row gap-3">
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder="Search files by name..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="pl-9 pr-9"
							autoComplete="off"
						/>
						{searchTerm && (
							<button
								type="button"
								onClick={() => setSearchTerm("")}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
								aria-label="Clear search"
							>
								<X className="h-4 w-4" />
							</button>
						)}
					</div>
					<Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
						<SelectTrigger className="w-full sm:w-[180px]">
							<SelectValue placeholder="File type" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All types</SelectItem>
							<SelectItem value="document">Documents</SelectItem>
							<SelectItem value="image">Images</SelectItem>
							<SelectItem value="sds">SDS</SelectItem>
						</SelectContent>
					</Select>
				</div>
			)}

			{/* Results counter */}
			{(searchTerm || fileTypeFilter !== "all") && files.length > 0 && (
				<p className="text-sm text-muted-foreground">
					Showing {filteredFiles.length} of {files.length} files
				</p>
			)}

			{isLoading && !isProjectLoaded ? (
				<div className="space-y-4">
					<h3 className="font-medium">Uploaded Files</h3>
					<FilesListSkeleton count={3} />
				</div>
			) : files.length > 0 ? (
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h3 className="font-medium">
							Uploaded Files
							<span className="text-muted-foreground ml-2">
								({stats.total})
							</span>
						</h3>
						{stats.withAI > 0 && (
							<Badge variant="secondary" className="gap-1">
								<Bot className="h-3 w-3" />
								{stats.withAI} analyzed
							</Badge>
						)}
					</div>
					{filteredFiles.length === 0 ? (
						<div className="text-center py-12">
							<Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
							<h3 className="text-lg font-semibold mb-2">
								No files match your filters
							</h3>
							<p className="text-muted-foreground mb-4">
								Try adjusting your search or filter settings
							</p>
							<div className="flex gap-2 justify-center">
								{searchTerm && (
									<Button variant="outline" onClick={() => setSearchTerm("")}>
										Clear search
									</Button>
								)}
								{fileTypeFilter !== "all" && (
									<Button
										variant="outline"
										onClick={() => setFileTypeFilter("all")}
									>
										Clear filter
									</Button>
								)}
							</div>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{filteredFiles.map((file) => (
								<FileCard key={file.id} file={file} />
							))}
						</div>
					)}
				</div>
			) : (
				<EmptyFilesState />
			)}
		</div>
	);
}
