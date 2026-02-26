"use client";

import { ChevronRight, Lock, Mic, Upload } from "lucide-react";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { voiceInterviewsApi } from "@/lib/api/voice-interviews";
import { cn } from "@/lib/utils";

const MAX_UPLOAD_BYTES = 25_000_000;
const ACCEPTED_EXTENSIONS = ["mp3", "wav", "m4a"];
const ACCEPTED_MIME = ".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4";

const FORMAT_BADGES = ACCEPTED_EXTENSIONS.map((ext) => (
	<span
		key={ext}
		className="inline-flex items-center rounded-md bg-emerald-500/[0.08] px-1.5 py-0 text-[10px] font-medium text-emerald-400/60"
	>
		.{ext}
	</span>
));

interface VoiceInterviewLauncherProps {
	companyId: string;
	locationId?: string;
	disabled?: boolean;
	onUploaded: (payload: {
		voiceInterviewId: string;
		bulkImportRunId: string;
	}) => void;
}

export function VoiceInterviewLauncher({
	companyId,
	locationId,
	disabled,
	onUploaded,
}: VoiceInterviewLauncherProps) {
	const [open, setOpen] = useState(false);
	const [consentGiven, setConsentGiven] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [dragActive, setDragActive] = useState(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const dragCounterRef = useRef(0);
	const consentCheckboxId = useId();

	const reset = useCallback(() => {
		setConsentGiven(false);
		setUploading(false);
		setSelectedFile(null);
		setDragActive(false);
		dragCounterRef.current = 0;
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	}, []);

	const validateFile = useCallback((file: File): string | null => {
		const extension = file.name.split(".").pop()?.toLowerCase();
		if (!extension || !ACCEPTED_EXTENSIONS.includes(extension)) {
			return `Unsupported format. Accepted: ${ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(", ")}`;
		}
		if (file.size > MAX_UPLOAD_BYTES) {
			return "File too large. Maximum size is 25 MB.";
		}
		return null;
	}, []);

	const handleFile = useCallback(
		(file: File) => {
			const error = validateFile(file);
			if (error) {
				toast.error(error);
				return;
			}
			setSelectedFile(file);
		},
		[validateFile],
	);

	/* ── Drop zone handlers ── */
	const handleDragEnter = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			if (uploading) return;
			dragCounterRef.current++;
			if (e.dataTransfer.types.includes("Files")) setDragActive(true);
		},
		[uploading],
	);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		dragCounterRef.current--;
		if (dragCounterRef.current === 0) setDragActive(false);
	}, []);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setDragActive(false);
			dragCounterRef.current = 0;
			if (uploading) return;
			const file = e.dataTransfer.files?.[0];
			if (file) handleFile(file);
		},
		[uploading, handleFile],
	);

	const handleUpload = useCallback(async () => {
		if (!selectedFile) {
			toast.error("Select an audio file");
			return;
		}
		if (!consentGiven) {
			toast.error("Consent is required before uploading");
			return;
		}
		setUploading(true);
		try {
			const created = await voiceInterviewsApi.create({
				audioFile: selectedFile,
				companyId,
				consentGiven: true,
				...(locationId ? { locationId } : {}),
			});
			onUploaded({
				voiceInterviewId: created.voiceInterviewId,
				bulkImportRunId: created.bulkImportRunId,
			});
			setOpen(false);
			reset();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Voice upload failed",
			);
		} finally {
			setUploading(false);
		}
	}, [selectedFile, consentGiven, companyId, locationId, onUploaded, reset]);

	const fileSizeLabel = useMemo(() => {
		if (!selectedFile) return null;
		const mb = selectedFile.size / (1024 * 1024);
		return `${selectedFile.name} (${mb.toFixed(1)} MB)`;
	}, [selectedFile]);

	return (
		<>
			{/* ── CTA Card (mirrors InlineDropZone styling) ── */}
			<button
				type="button"
				onClick={() => setOpen(true)}
				disabled={disabled || uploading}
				className={cn(
					"group relative w-full flex flex-col items-center justify-center gap-2.5",
					"overflow-hidden rounded-xl px-6 py-7 text-sm",
					"glass-liquid-subtle",
					"transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
					"bg-gradient-to-r from-emerald-500/[0.03] to-transparent",
					"active:scale-[0.995]",
					"cursor-pointer",
					disabled && "opacity-50 cursor-not-allowed",
				)}
			>
				<div
					className={cn(
						"flex items-center justify-center rounded-full p-2.5 transition-colors duration-200",
						"bg-emerald-500/[0.06] group-hover:bg-emerald-500/10",
					)}
				>
					<Mic
						className={cn(
							"h-5 w-5 transition-colors duration-200",
							"text-emerald-400/70 group-hover:text-emerald-400",
						)}
					/>
				</div>
				<span className="font-medium text-foreground/80">
					Capture waste streams from a voice interview
				</span>
				<div className="flex items-center gap-1.5 text-muted-foreground">
					{FORMAT_BADGES}
					<span className="text-muted-foreground/40 text-xs">·</span>
					<span className="text-xs">
						upload a{" "}
						<span className="text-emerald-400/80 underline underline-offset-2 decoration-emerald-400/30">
							recording
						</span>
					</span>
				</div>
			</button>

			{/* ── Upload Dialog ── */}
			<Dialog
				open={open}
				onOpenChange={(nextOpen) => {
					if (!uploading) {
						setOpen(nextOpen);
						if (!nextOpen) reset();
					}
				}}
			>
				<DialogContent className="sm:max-w-[520px]">
					<DialogHeader>
						<div className="flex items-center gap-2">
							<div className="flex items-center justify-center rounded-full bg-emerald-500/10 p-1.5">
								<Mic className="h-4 w-4 text-emerald-400" />
							</div>
							<DialogTitle>Voice Interview</DialogTitle>
						</div>
						<DialogDescription>
							Upload an interview recording to extract waste stream data.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						{/* Consent */}
						<div className="flex items-start gap-3 group/consent">
							<Checkbox
								id={consentCheckboxId}
								checked={consentGiven}
								onCheckedChange={(checked) => setConsentGiven(checked === true)}
								className="mt-0.5 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
							/>
							<label
								htmlFor={consentCheckboxId}
								className="cursor-pointer text-sm leading-snug text-muted-foreground group-hover/consent:text-foreground transition-colors"
							>
								I confirm this recording was made with consent of all
								participants.
							</label>
						</div>

						{/* Retention notice */}
						<div className="flex items-start gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
							<Lock className="h-3.5 w-3.5 mt-0.5 text-muted-foreground/60 shrink-0" />
							<p className="text-xs text-muted-foreground">
								Audio retained 180 days · Transcript 24 months · Audit events 24
								months
							</p>
						</div>

						{/* Drop zone */}
						<button
							type="button"
							onDragEnter={handleDragEnter}
							onDragOver={handleDragOver}
							onDragLeave={handleDragLeave}
							onDrop={handleDrop}
							onClick={() => !uploading && fileInputRef.current?.click()}
							disabled={uploading}
							className={cn(
								"flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8",
								"transition-all duration-200 cursor-pointer",
								dragActive
									? "border-emerald-500/40 bg-emerald-500/5"
									: "border-muted-foreground/20 hover:border-emerald-500/30 hover:bg-emerald-500/[0.02]",
								uploading && "opacity-50",
							)}
						>
							{selectedFile ? (
								<>
									<div className="flex items-center justify-center rounded-full bg-emerald-500/10 p-2">
										<Mic className="h-4 w-4 text-emerald-400" />
									</div>
									<p className="text-sm font-medium text-foreground/80">
										{fileSizeLabel}
									</p>
									<span className="text-xs text-muted-foreground/80">
										click to change file
									</span>
								</>
							) : (
								<>
									<div className="flex items-center justify-center rounded-full bg-muted/80 p-2">
										<Upload className="h-4 w-4 text-muted-foreground" />
									</div>
									<p className="text-sm text-muted-foreground">
										{dragActive
											? "Drop your audio file here"
											: "Drop audio file here or browse"}
									</p>
									<div className="flex items-center gap-1.5">
										{FORMAT_BADGES}
										<span className="text-muted-foreground/40 text-xs">·</span>
										<span className="text-xs text-muted-foreground">
											Max 25 MB
										</span>
									</div>
									<span className="text-xs text-emerald-400/90 underline underline-offset-2 decoration-emerald-400/40">
										browse files
									</span>
								</>
							)}
						</button>
						<input
							ref={fileInputRef}
							type="file"
							accept={ACCEPTED_MIME}
							onChange={(event) => {
								const file = event.target.files?.[0];
								if (file) handleFile(file);
								if (fileInputRef.current) fileInputRef.current.value = "";
							}}
							className="hidden"
						/>

						{/* Device helpers */}
						<div className="space-y-1">
							<DeviceHelper
								label="Recording from iPhone or iPad?"
								steps="Open Voice Memos → tap the recording → Share → Save to Files → upload here"
							/>
							<DeviceHelper
								label="Recording from Android?"
								steps="Open Recorder → tap the recording → Share → Save to Files → upload here"
							/>
						</div>
					</div>

					<DialogFooter className="gap-2 sm:gap-0">
						<Button
							type="button"
							variant="ghost"
							disabled={uploading}
							onClick={() => {
								setOpen(false);
								reset();
							}}
						>
							Cancel
						</Button>
						<Button
							type="button"
							disabled={uploading || !selectedFile || !consentGiven}
							onClick={() => void handleUpload()}
							className="bg-emerald-600 hover:bg-emerald-700 text-white"
						>
							{uploading ? (
								<>
									<span className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
									Uploading…
								</>
							) : (
								<>
									<Upload className="mr-2 h-4 w-4" />
									Upload & Process
								</>
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

/* ── Device Helper (collapsible) ── */
function DeviceHelper({ label, steps }: { label: string; steps: string }) {
	return (
		<Collapsible>
			<CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group/helper">
				<ChevronRight className="h-3 w-3 transition-transform group-data-[state=open]/helper:rotate-90" />
				{label}
			</CollapsibleTrigger>
			<CollapsibleContent className="pl-4 pt-1">
				<p className="text-xs text-muted-foreground/70 leading-relaxed">
					{steps}
				</p>
			</CollapsibleContent>
		</Collapsible>
	);
}
