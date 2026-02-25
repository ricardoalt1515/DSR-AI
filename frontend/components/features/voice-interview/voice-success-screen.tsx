"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VoiceSuccessScreenProps {
	createdStreams: number;
	pendingSuggestions: number;
	targetProjectId: string | null;
	onReviewSuggestions: () => void;
	onClose: () => void;
}

export function VoiceSuccessScreen({
	createdStreams,
	pendingSuggestions,
	targetProjectId,
	onReviewSuggestions,
	onClose,
}: VoiceSuccessScreenProps) {
	return (
		<div className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-6">
			{/* Animated check */}
			<div className="relative">
				<div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
				<div className="relative flex items-center justify-center rounded-full bg-emerald-500/10 p-4">
					<CheckCircle2 className="h-10 w-10 text-emerald-400 animate-in zoom-in-50 duration-500" />
				</div>
			</div>

			<div className="space-y-1">
				<h3 className="text-lg font-semibold">Voice Interview Complete</h3>
				<p className="text-sm text-muted-foreground">
					All resolved groups have been finalized.
				</p>
			</div>

			{/* Stats */}
			<div className="flex items-center gap-4">
				<StatCard
					value={createdStreams}
					label={createdStreams === 1 ? "stream created" : "streams created"}
				/>
				<StatCard
					value={pendingSuggestions}
					label={
						pendingSuggestions === 1
							? "suggestion pending"
							: "suggestions pending"
					}
					accent={pendingSuggestions > 0}
				/>
			</div>

			{/* Actions */}
			<div className="flex flex-col items-center gap-3 w-full max-w-xs">
				{pendingSuggestions > 0 && targetProjectId && (
					<Button
						className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
						onClick={onReviewSuggestions}
					>
						Review suggestions now
						<ArrowRight className="ml-2 h-4 w-4" />
					</Button>
				)}
				<button
					type="button"
					onClick={onClose}
					className="text-sm text-muted-foreground hover:text-foreground transition-colors"
				>
					← Back to company
				</button>
			</div>
		</div>
	);
}

function StatCard({
	value,
	label,
	accent,
}: {
	value: number;
	label: string;
	accent?: boolean;
}) {
	return (
		<div
			className={cn(
				"rounded-lg border px-5 py-3 text-center min-w-[120px]",
				accent
					? "border-emerald-500/20 bg-emerald-500/[0.03]"
					: "border-border",
			)}
		>
			<p
				className={cn(
					"text-2xl font-bold",
					accent ? "text-emerald-400" : "text-foreground",
				)}
			>
				{value}
			</p>
			<p className="text-xs text-muted-foreground">{label}</p>
		</div>
	);
}
