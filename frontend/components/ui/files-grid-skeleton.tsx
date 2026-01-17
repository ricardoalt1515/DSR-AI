"use client";

/**
 * FilesGridSkeleton - Industrial-aesthetic loading skeleton for file grid
 *
 * Design: Technical precision with subtle depth
 * - Card-based layout matching FileCard component
 * - Varied sizes for visual rhythm (not uniform)
 * - Subtle border treatment for industrial feel
 */

import { cn } from "@/lib/utils";

interface FilesGridSkeletonProps {
	count?: number;
	className?: string;
}

function SkeletonPulse({ className }: { className?: string }) {
	return (
		<div
			className={cn(
				"animate-pulse rounded bg-gradient-to-r from-muted/60 via-muted/80 to-muted/60",
				"bg-[length:200%_100%] animate-shimmer",
				className,
			)}
		/>
	);
}

function FileCardSkeleton({ index }: { index: number }) {
	// Vary the preview height slightly for visual interest
	const previewHeights = ["h-28", "h-32", "h-24", "h-30"];
	const previewHeight = previewHeights[index % previewHeights.length];

	return (
		<div
			className={cn(
				"group relative rounded-lg border border-border/40 overflow-hidden",
				"bg-card/60 backdrop-blur-sm",
				"transition-opacity duration-300",
			)}
			style={{ animationDelay: `${index * 50}ms` }}
		>
			{/* File preview area */}
			<div className={cn("relative", previewHeight)}>
				<SkeletonPulse className="absolute inset-0" />
				{/* File type indicator in corner */}
				<div className="absolute top-2 right-2">
					<SkeletonPulse className="h-6 w-10 rounded" />
				</div>
			</div>

			{/* File info */}
			<div className="p-3 space-y-2 border-t border-border/30">
				{/* Filename */}
				<SkeletonPulse className="h-4 w-4/5" />
				{/* Metadata row */}
				<div className="flex items-center justify-between">
					<SkeletonPulse className="h-3 w-16" />
					<SkeletonPulse className="h-3 w-12" />
				</div>
			</div>
		</div>
	);
}

export function FilesGridSkeleton({
	count = 6,
	className,
}: FilesGridSkeletonProps) {
	return (
		<div
			className={cn(
				"grid gap-4",
				"grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
				className,
			)}
		>
			{Array.from({ length: count }).map((_, i) => (
				<FileCardSkeleton key={i} index={i} />
			))}
		</div>
	);
}

/**
 * List variant for table/list view loading
 */
export function FilesListSkeleton({ count = 5 }: { count?: number }) {
	return (
		<div className="space-y-2">
			{Array.from({ length: count }).map((_, i) => (
				<div
					key={i}
					className="flex items-center gap-4 p-3 rounded-lg border border-border/30 bg-muted/10"
					style={{ animationDelay: `${i * 40}ms` }}
				>
					{/* File icon */}
					<SkeletonPulse className="h-10 w-10 rounded-lg" />
					{/* File info */}
					<div className="flex-1 space-y-1">
						<SkeletonPulse className="h-4 w-48" />
						<SkeletonPulse className="h-3 w-24" />
					</div>
					{/* Size */}
					<SkeletonPulse className="h-4 w-16" />
					{/* Date */}
					<SkeletonPulse className="h-4 w-20" />
					{/* Actions */}
					<SkeletonPulse className="h-8 w-8 rounded" />
				</div>
			))}
		</div>
	);
}
