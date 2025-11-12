/**
 * StatsCard Component - Liquid Glass Edition (Phase 2 Optimized)
 *
 * Displays key metrics in floating glass bubbles with static numbers.
 *
 * Features:
 * - Liquid glass aesthetic (translucent, depth, refraction)
 * - Floating animation (organic motion)
 * - Static numbers (Phase 2: removed animation for cleaner feel)
 * - Dark/light mode adaptive styling
 */

"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface StatItem {
	/** Display value (can include units like "7min", "98%", "500+") */
	value: string;
	/** Stat label/description */
	label: string;
}

/**
 * Single Stats Card - Liquid Glass Bubble
 */
export interface StatsCardProps {
	stat: StatItem;
	delay?: number;
	className?: string;
}

export function StatsCard({ stat, delay = 0, className }: StatsCardProps) {
	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.9, y: 20 }}
			animate={{
				opacity: 1,
				scale: 1,
				y: [20, 0],
			}}
			transition={{
				delay,
				duration: 0.6,
				type: "spring",
				stiffness: 100,
			}}
			className={cn("glass-bubble p-5", className)}
		>
			{/* Static number - Phase 2 optimization (removed animation) */}
			<div className="text-3xl font-bold text-primary tabular-nums">
				{stat.value}
			</div>

			{/* Label */}
			<div className="text-xs text-muted-foreground mt-1.5 leading-tight font-medium">
				{stat.label}
			</div>
		</motion.div>
	);
}

/**
 * Stats Grid - Container for multiple stats
 */
export interface StatsGridProps {
	stats: StatItem[];
	className?: string;
}

export function StatsGrid({ stats, className }: StatsGridProps) {
	return (
		<div className={cn("grid grid-cols-3 gap-4", className)}>
			{stats.map((stat, index) => (
				<StatsCard key={stat.label} stat={stat} delay={0.4 + index * 0.1} />
			))}
		</div>
	);
}
