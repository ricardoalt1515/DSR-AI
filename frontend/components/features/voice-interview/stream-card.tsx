"use client";

import { Check, Pencil, Play, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatTimestamp(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, "0")}`;
}

interface StreamCardProps {
	name: string;
	category?: string | undefined;
	description?: string | undefined;
	status: string;
	statusLabel?: string | undefined;
	reviewNotes?: string | undefined;
	confidence?: number | undefined;
	evidenceQuote?: string | undefined;
	evidenceStartSec?: number | null | undefined;
	evidenceEndSec?: number | null | undefined;
	onPlayEvidence?: (startSec: number) => void;
	onAccept?: () => void;
	onReject?: () => void;
	onEdit?: () => void;
	isPending: boolean;
	itemType: "location" | "project";
}

/** Pure helper — testable confidence chip label */
export function formatConfidenceLabel(value: number): string {
	const pct = Math.round(value * 100);
	return `${pct}% match · AI-suggested`;
}

function ConfidenceChip({ value }: { value: number }) {
	const pct = Math.round(value * 100);
	return (
		<Badge
			variant="outline"
			className={cn(
				"text-[10px] px-1.5 py-0 font-mono",
				pct >= 80 && "border-emerald-500/30 text-emerald-400",
				pct >= 50 && pct < 80 && "border-amber-500/30 text-amber-400",
				pct < 50 && "border-red-500/30 text-red-400",
			)}
		>
			{formatConfidenceLabel(value)}
		</Badge>
	);
}

export function StreamCard({
	name,
	category,
	description,
	status,
	statusLabel,
	reviewNotes,
	confidence,
	evidenceQuote,
	evidenceStartSec,
	evidenceEndSec,
	onPlayEvidence,
	onAccept,
	onReject,
	onEdit,
	isPending,
	itemType,
}: StreamCardProps) {
	const hasPlayableEvidence =
		evidenceStartSec != null &&
		evidenceEndSec != null &&
		evidenceEndSec >= evidenceStartSec;

	return (
		<div
			className={cn(
				"rounded-lg border p-3 space-y-2 transition-colors",
				status === "accepted" && "border-emerald-500/20 bg-emerald-500/[0.02]",
				status === "amended" && "border-emerald-500/20 bg-emerald-500/[0.02]",
				status === "rejected" && "border-muted-foreground/20 opacity-60",
				status === "invalid" && "border-amber-500/20 bg-amber-500/[0.02]",
				isPending && "border-border",
			)}
		>
			{/* Header */}
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2 min-w-0">
					<span className="text-sm font-medium truncate">
						{name || (itemType === "location" ? "Location" : "Waste stream")}
					</span>
					{category && (
						<span className="text-xs text-muted-foreground truncate">
							{category}
						</span>
					)}
				</div>
				<div className="flex items-center gap-1.5 shrink-0">
					{confidence != null && <ConfidenceChip value={confidence} />}
					<Badge
						variant="outline"
						className={cn(
							"text-[10px] px-1.5 py-0",
							(status === "accepted" || status === "amended") &&
								"border-emerald-500/30 text-emerald-400",
							status === "rejected" &&
								"border-muted-foreground/30 text-muted-foreground",
							status === "invalid" && "border-amber-500/30 text-amber-400",
						)}
					>
						{status === "amended" && <Pencil className="h-2.5 w-2.5 mr-0.5" />}
						{statusLabel ?? status}
					</Badge>
				</div>
			</div>

			{/* Review notes (invalid items) */}
			{status === "invalid" && reviewNotes && (
				<p className="text-xs text-amber-400/80 pl-0.5">{reviewNotes}</p>
			)}

			{/* Description */}
			{description && (
				<p className="text-xs text-muted-foreground line-clamp-2">
					{description}
				</p>
			)}

			{/* Evidence quote */}
			{evidenceQuote && (
				<div className="flex items-start gap-2 rounded-md bg-muted/40 px-2.5 py-1.5">
					<p className="text-xs text-muted-foreground italic line-clamp-2 flex-1 min-w-0">
						&ldquo;{evidenceQuote}&rdquo;
					</p>
					{hasPlayableEvidence ? (
						<button
							type="button"
							onClick={() => onPlayEvidence?.(evidenceStartSec)}
							className="flex items-center gap-1 text-[11px] text-emerald-400/80 hover:text-emerald-400 transition-colors shrink-0"
						>
							<Play className="h-3 w-3" />
							{formatTimestamp(evidenceStartSec)}
						</button>
					) : (
						<span className="text-[11px] text-muted-foreground/40 shrink-0">
							Evidence unavailable
						</span>
					)}
				</div>
			)}

			{/* Actions: Accept / Edit / Reject */}
			{isPending && (
				<div className="flex items-center gap-1 pt-1">
					<Button
						variant="ghost"
						size="sm"
						className="h-7 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
						onClick={onAccept}
					>
						<Check className="h-3 w-3 mr-1" />
						Accept
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className="h-7 text-xs"
						onClick={onEdit}
					>
						<Pencil className="h-3 w-3 mr-1" />
						Edit
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
						onClick={onReject}
					>
						<X className="h-3 w-3 mr-1" />
						Reject
					</Button>
				</div>
			)}
		</div>
	);
}
