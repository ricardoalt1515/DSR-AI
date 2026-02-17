"use client";

import { FileUp, Loader2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ACCEPTED_EXTENSIONS = [".xlsx", ".pdf", ".docx"];
const ACCEPTED_MIME_TYPES = [
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/pdf",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface InlineDropZoneProps {
	onFileSelected: (file: File) => void;
	disabled?: boolean;
	uploading?: boolean;
}

export function InlineDropZone({
	onFileSelected,
	disabled = false,
	uploading = false,
}: InlineDropZoneProps) {
	const [dragActive, setDragActive] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const dragCounterRef = useRef(0);

	const validateFile = useCallback((file: File): boolean => {
		const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
		if (!ACCEPTED_EXTENSIONS.includes(ext)) {
			toast.error("Unsupported file type", {
				description: `Accepted formats: ${ACCEPTED_EXTENSIONS.join(", ")}`,
			});
			return false;
		}
		if (file.size > MAX_FILE_SIZE) {
			toast.error("File too large", { description: "Maximum size is 10 MB" });
			return false;
		}
		return true;
	}, []);

	const handleFile = useCallback(
		(file: File) => {
			if (validateFile(file)) onFileSelected(file);
		},
		[validateFile, onFileSelected],
	);

	const handleDragEnter = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			if (disabled || uploading) return;
			dragCounterRef.current++;
			if (e.dataTransfer.types.includes("Files")) setDragActive(true);
		},
		[disabled, uploading],
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
			if (disabled || uploading) return;
			const file = e.dataTransfer.files?.[0];
			if (file) handleFile(file);
		},
		[disabled, uploading, handleFile],
	);

	const handleClick = useCallback(() => {
		if (!disabled && !uploading) inputRef.current?.click();
	}, [disabled, uploading]);

	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file) handleFile(file);
			if (inputRef.current) inputRef.current.value = "";
		},
		[handleFile],
	);

	const isInteractive = !disabled && !uploading;

	return (
		<button
			type="button"
			onClick={handleClick}
			onDragEnter={handleDragEnter}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
			disabled={!isInteractive}
			className={cn(
				"group relative w-full flex flex-col items-center justify-center gap-2.5",
				"overflow-hidden rounded-xl px-6 py-7 text-sm",
				"glass-liquid-subtle",
				"transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
				dragActive && [
					"ring-2 ring-primary/20 bg-primary/5",
					"motion-safe:scale-[1.005]",
				],
				isInteractive &&
					!dragActive && [
						"bg-gradient-to-r from-primary/[0.03] to-transparent",
						"active:scale-[0.995]",
						"cursor-pointer",
					],
				!isInteractive && "opacity-50 cursor-not-allowed",
			)}
		>
			<input
				ref={inputRef}
				type="file"
				accept={ACCEPTED_MIME_TYPES.join(",")}
				onChange={handleInputChange}
				className="hidden"
			/>

			{uploading ? (
				<>
					<div className="flex items-center justify-center rounded-full bg-primary/[0.08] p-2.5">
						<Loader2 className="h-5 w-5 motion-safe:animate-spin text-primary" />
					</div>
					<span className="font-medium text-foreground/80">Processing…</span>
					<div className="flex items-center gap-1.5 opacity-50">
						{FORMAT_BADGES}
					</div>
				</>
			) : (
				<>
					<div
						className={cn(
							"flex items-center justify-center rounded-full p-2.5 transition-colors duration-200",
							dragActive
								? "bg-primary/15"
								: "bg-primary/[0.06] group-hover:bg-primary/10",
						)}
					>
						<FileUp
							className={cn(
								"h-5 w-5 transition-colors duration-200",
								dragActive
									? "text-primary"
									: "text-muted-foreground group-hover:text-primary",
							)}
						/>
					</div>
					<span className="font-medium text-foreground/80">
						{dragActive
							? "Drop your file here"
							: "Import locations & waste streams from a file"}
					</span>
					<div className="flex items-center gap-1.5 text-muted-foreground">
						{FORMAT_BADGES}
						<span className="text-muted-foreground/40 text-xs">·</span>
						<span className="text-xs">
							{dragActive ? (
								"release to upload"
							) : (
								<>
									drop here or{" "}
									<span className="text-primary underline underline-offset-2 decoration-primary/40">
										browse
									</span>
								</>
							)}
						</span>
					</div>
				</>
			)}

			{uploading && (
				<div
					aria-hidden="true"
					className="absolute inset-x-0 bottom-0 h-px animate-shimmer"
					style={{
						background:
							"linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--primary) 40%, transparent) 50%, transparent 100%)",
						backgroundSize: "200% 100%",
					}}
				/>
			)}
		</button>
	);
}

const FORMAT_BADGES = ["xlsx", "pdf", "docx"].map((ext) => (
	<span
		key={ext}
		className="inline-flex items-center rounded-md bg-primary/[0.08] px-1.5 py-0 text-[10px] font-medium text-primary/60"
	>
		.{ext}
	</span>
));
