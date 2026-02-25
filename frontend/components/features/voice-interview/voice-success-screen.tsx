"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VoiceSuccessScreenProps {
	createdStreams: number;
	createdLocations: number;
	pendingSuggestions: number;
	targetProjectId: string | null;
	onReviewSuggestions: () => void;
	onClose: () => void;
}

export function VoiceSuccessScreen({
	createdStreams,
	createdLocations,
	pendingSuggestions,
	targetProjectId,
	onReviewSuggestions,
	onClose,
}: VoiceSuccessScreenProps) {
	const headline =
		createdStreams > 0
			? `${createdStreams} stream${createdStreams === 1 ? "" : "s"} imported to ${createdLocations} location${createdLocations === 1 ? "" : "s"}`
			: "Interview closed";

	return (
		<div className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-6 animate-in zoom-in-50 fade-in duration-500">
			{/* SVG animated checkmark */}
			<div className="relative">
				<svg className="h-20 w-20" viewBox="0 0 80 80">
					<title>Import success</title>
					<circle
						cx="40"
						cy="40"
						r="36"
						fill="none"
						stroke="currentColor"
						strokeWidth="3"
						className="text-emerald-200 dark:text-emerald-900"
					/>
					<circle
						cx="40"
						cy="40"
						r="36"
						fill="none"
						stroke="currentColor"
						strokeWidth="3"
						strokeLinecap="round"
						className="text-emerald-500"
						style={{
							strokeDasharray: "226",
							strokeDashoffset: "226",
							animation: "voice-draw-circle 0.6s ease-out forwards",
						}}
					/>
					<path
						d="M24 42 L35 53 L56 30"
						fill="none"
						stroke="currentColor"
						strokeWidth="3.5"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="text-emerald-500"
						style={{
							strokeDasharray: "50",
							strokeDashoffset: "50",
							animation: "voice-draw-check 0.4s ease-out 0.5s forwards",
						}}
					/>
				</svg>
				{/* Keyframe styles for SVG animation */}
				<style>{`
					@keyframes voice-draw-circle { to { stroke-dashoffset: 0; } }
					@keyframes voice-draw-check { to { stroke-dashoffset: 0; } }
				`}</style>
			</div>

			<div className="space-y-1">
				<h3
					className="text-lg font-semibold animate-in fade-in slide-in-from-bottom-2 duration-300"
					style={{ animationDelay: "0.7s", animationFillMode: "backwards" }}
				>
					{headline}
				</h3>
				{pendingSuggestions > 0 && (
					<p className="text-sm text-muted-foreground">
						{pendingSuggestions} suggestion
						{pendingSuggestions === 1 ? "" : "s"} pending review.
					</p>
				)}
			</div>

			{/* Stats */}
			<div className="flex items-center gap-4">
				<StatCard
					value={createdStreams}
					label={createdStreams === 1 ? "stream" : "streams"}
				/>
				<StatCard
					value={createdLocations}
					label={createdLocations === 1 ? "location" : "locations"}
				/>
				{pendingSuggestions > 0 && (
					<StatCard
						value={pendingSuggestions}
						label={pendingSuggestions === 1 ? "suggestion" : "suggestions"}
						accent
					/>
				)}
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
				"rounded-lg border px-5 py-3 text-center min-w-[100px]",
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
