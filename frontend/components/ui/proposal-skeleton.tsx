"use client";

/**
 * ProposalSkeleton - Industrial-aesthetic loading skeleton for proposal cards
 * 
 * Design: Refined industrial with subtle shimmer animation
 * - Asymmetric layout mirrors actual ProposalCard structure
 * - Staggered reveal timing for visual interest
 * - Subtle grain texture on dark mode
 */

import { cn } from "@/lib/utils";

interface ProposalSkeletonProps {
    count?: number;
    className?: string;
}

function SkeletonPulse({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                "animate-pulse rounded bg-gradient-to-r from-muted/60 via-muted/80 to-muted/60",
                "bg-[length:200%_100%] animate-shimmer",
                className
            )}
        />
    );
}

function SingleProposalSkeleton({ index }: { index: number }) {
    return (
        <div
            className={cn(
                "group relative rounded-xl border border-border/50 p-5",
                "bg-card/50 backdrop-blur-sm",
                "transition-all duration-300"
            )}
            style={{ animationDelay: `${index * 75}ms` }}
        >
            {/* Header row - status + version + date */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    {/* Status badge skeleton */}
                    <SkeletonPulse className="h-6 w-20 rounded-full" />
                    {/* Version badge */}
                    <SkeletonPulse className="h-5 w-12 rounded" />
                </div>
                {/* Date */}
                <SkeletonPulse className="h-4 w-24" />
            </div>

            {/* Title area */}
            <div className="space-y-2 mb-4">
                <SkeletonPulse className="h-6 w-3/4" />
                <SkeletonPulse className="h-4 w-1/2" />
            </div>

            {/* Metrics row - asymmetric widths for industrial feel */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="space-y-1">
                    <SkeletonPulse className="h-3 w-12" />
                    <SkeletonPulse className="h-5 w-16" />
                </div>
                <div className="space-y-1">
                    <SkeletonPulse className="h-3 w-10" />
                    <SkeletonPulse className="h-5 w-20" />
                </div>
                <div className="space-y-1">
                    <SkeletonPulse className="h-3 w-14" />
                    <SkeletonPulse className="h-5 w-12" />
                </div>
            </div>

            {/* Action buttons row */}
            <div className="flex items-center justify-between pt-3 border-t border-border/30">
                <div className="flex gap-2">
                    <SkeletonPulse className="h-8 w-20 rounded-md" />
                    <SkeletonPulse className="h-8 w-8 rounded-md" />
                </div>
                <SkeletonPulse className="h-8 w-24 rounded-md" />
            </div>
        </div>
    );
}

export function ProposalSkeleton({ count = 3, className }: ProposalSkeletonProps) {
    return (
        <div className={cn("space-y-4", className)}>
            {Array.from({ length: count }).map((_, i) => (
                <SingleProposalSkeleton key={i} index={i} />
            ))}
        </div>
    );
}

/**
 * Compact variant for inline loading states
 */
export function ProposalSkeletonCompact() {
    return (
        <div className="flex items-center gap-4 p-4 rounded-lg border border-border/30 bg-muted/20">
            <SkeletonPulse className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
                <SkeletonPulse className="h-4 w-48" />
                <SkeletonPulse className="h-3 w-32" />
            </div>
            <SkeletonPulse className="h-8 w-20 rounded-md" />
        </div>
    );
}
