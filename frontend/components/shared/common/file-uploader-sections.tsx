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
import type { HTMLAttributes, InputHTMLAttributes } from "react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatFileSize, formatRelativeDate } from "@/lib/format";
import type { ProjectFile, ProjectFileDetail } from "@/lib/project-types";
import { cn } from "@/lib/utils";

export interface UploadingFile {
	id: string;
	file: File;
	progress: number;
	status: "uploading" | "success" | "error";
	error?: string;
}

interface UploadDropZoneProps {
	rootProps: HTMLAttributes<HTMLDivElement>;
	inputProps: InputHTMLAttributes<HTMLInputElement>;
	isDragActive: boolean;
	maxSize: number;
	disabled?: boolean;
}

interface UploadingFilesCardProps {
	files: UploadingFile[];
	onCancelUpload: (fileId: string) => void;
}

interface UploadedFilesCardProps {
	files: ProjectFile[];
	isLoading: boolean;
	maxFiles: number;
	onSelectFile: (fileId: string) => void;
	onDeleteClick: (file: ProjectFile) => void;
	readOnly?: boolean;
}

interface FileDetailPanelProps {
	file: ProjectFileDetail | null;
	isLoading: boolean;
	previewUrl: string | null;
	showRawAnalysis: boolean;
	onToggleRawAnalysis: () => void;
}

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
} as const;

const QUALITY_BADGE_STYLES = {
	High: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
	Medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
	Low: "bg-rose-500/15 text-rose-400 border-rose-500/30",
} as const;

function getFileIcon(fileType: string): typeof FileText {
	return FILE_TYPE_ICONS[fileType.toLowerCase()] || FileText;
}

function getProcessingBadge(status: string, hasAiCapability: boolean) {
	if (!hasAiCapability) return null;

	const config =
		PROCESSING_STATUS_CONFIG[status as keyof typeof PROCESSING_STATUS_CONFIG];
	return config ?? null;
}

export function UploadDropZone({
	rootProps,
	inputProps,
	isDragActive,
	maxSize,
	disabled = false,
}: UploadDropZoneProps) {
	const { className, ...restRootProps } = rootProps;

	return (
		<Card className="aqua-panel">
			<CardContent className="p-6">
				<div
					{...restRootProps}
					className={cn(
						"relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-[border-color,background-color,transform,box-shadow] duration-200",
						isDragActive && !disabled
							? "border-primary bg-primary/10 scale-[1.02] shadow-lg shadow-primary/20"
							: "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/25",
						disabled &&
							"cursor-not-allowed opacity-60 hover:border-muted-foreground/25 hover:bg-transparent",
						className,
					)}
					aria-disabled={disabled}
				>
					<input {...inputProps} />

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
								{isDragActive && !disabled ? "Drop files here" : "Upload files"}
							</h3>
							<p className="text-sm text-muted-foreground">
								{disabled
									? "Uploads disabled for archived projects"
									: "Drag files or click to select"}
							</p>
							<p className="text-xs text-muted-foreground">
								Supports PDF, Excel, CSV, JSON, TXT, Images (max{" "}
								{formatFileSize(maxSize)})
							</p>
						</div>

						<Button variant="outline" disabled={disabled}>
							Select Files
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
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

export function FileDetailPanel({
	file,
	isLoading,
	previewUrl,
	showRawAnalysis,
	onToggleRawAnalysis,
}: FileDetailPanelProps) {
	if (!file) return null;

	const analysis = file.ai_analysis
		? asImageAnalysisOutput(file.ai_analysis)
		: null;
	const qualityStyle = analysis
		? (QUALITY_BADGE_STYLES[analysis.quality_grade] ?? "")
		: "";

	return (
		<Card className="aqua-panel">
			<CardContent className="p-6 space-y-4">
				<div className="flex items-center justify-between">
					<div className="flex-1 min-w-0">
						<h4 className="text-base font-semibold truncate">
							{file.filename}
						</h4>
						<p className="text-xs text-muted-foreground">
							{formatFileSize(file.file_size)} • {file.file_type.toUpperCase()}
						</p>
					</div>
					{isLoading && (
						<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
					)}
				</div>

				{previewUrl && (
					<div className="relative rounded-lg overflow-hidden border bg-black/10">
						<img
							src={previewUrl}
							alt={file.filename}
							className="max-h-80 w-full object-contain"
						/>
					</div>
				)}

				{analysis && (
					<div className="space-y-3 p-4 rounded-lg bg-muted/30 border">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="secondary" className="text-xs font-medium">
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
				)}

				{file.processed_text && (
					<div className="space-y-2">
						<p className="text-xs font-semibold">Extracted Content</p>
						<div className="max-h-32 overflow-y-auto rounded-md border bg-card/50 p-3">
							<p className="text-xs text-muted-foreground whitespace-pre-wrap">
								{file.processed_text}
							</p>
						</div>
					</div>
				)}

				{file.ai_analysis && (
					<Accordion type="single" collapsible className="w-full">
						<AccordionItem value="details" className="border-none">
							<AccordionTrigger className="text-xs font-medium py-2 hover:no-underline">
								View full analysis details
							</AccordionTrigger>
							<AccordionContent>
								<div className="max-h-[400px] overflow-y-auto pr-2">
									<ImageAnalysisDetails analysis={file.ai_analysis} />

									<div className="mt-4 pt-4 border-t">
										<Button
											variant="ghost"
											size="sm"
											className="h-7 px-2 text-[10px]"
											onClick={onToggleRawAnalysis}
										>
											{showRawAnalysis ? "Hide raw JSON" : "View raw JSON"}
										</Button>
										{showRawAnalysis && (
											<pre className="text-[10px] mt-2 max-h-40 overflow-y-auto bg-muted rounded-md p-2 whitespace-pre-wrap">
												{JSON.stringify(file.ai_analysis, null, 2)}
											</pre>
										)}
									</div>
								</div>
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				)}

				{!file.processed_text && !file.ai_analysis && (
					<p className="text-xs text-muted-foreground text-center py-4">
						No analysis available for this file.
					</p>
				)}
			</CardContent>
		</Card>
	);
}

export function UploadingFilesCard({
	files,
	onCancelUpload,
}: UploadingFilesCardProps) {
	if (files.length === 0) return null;

	return (
		<Card className="aqua-panel">
			<CardContent className="p-6">
				<h3 className="text-lg font-semibold mb-4">Uploading...</h3>
				<div className="space-y-3">
					{files.map((uploadingFile) => {
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
										onClick={() => onCancelUpload(uploadingFile.id)}
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
	);
}

export function UploadedFilesCard({
	files,
	isLoading,
	maxFiles,
	onSelectFile,
	onDeleteClick,
	readOnly = false,
}: UploadedFilesCardProps) {
	if (isLoading) {
		return (
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
		);
	}

	if (files.length === 0) {
		return (
			<Card className="aqua-panel">
				<CardContent className="p-6">
					<p className="text-sm text-muted-foreground text-center">
						No files uploaded yet
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="aqua-panel">
			<CardContent className="p-6">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-semibold">Uploaded Files</h3>
					<span className="text-sm text-muted-foreground">
						{files.length} / {maxFiles} files
					</span>
				</div>

				<div className="space-y-3">
					{files.map((file) => {
						const FileIcon = getFileIcon(file.file_type);
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
								className="group flex items-start gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card hover:border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors cursor-pointer w-full text-left"
								onClick={() => onSelectFile(file.id)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										onSelectFile(file.id);
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
										<span>{formatRelativeDate(file.uploaded_at)}</span>
									</div>
								</div>

								<Button
									variant="ghost"
									size="sm"
									aria-label={`Delete ${file.filename}`}
									onClick={(event) => {
										event.stopPropagation();
										if (!readOnly) {
											onDeleteClick(file);
										}
									}}
									className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
									disabled={readOnly}
								>
									<X className="h-4 w-4" />
								</Button>
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
