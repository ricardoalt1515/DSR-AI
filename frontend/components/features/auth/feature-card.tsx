/**
 * FeatureCard Component - Liquid Glass Edition
 *
 * Simplified feature display for auth pages.
 * Uses subtle glass effect with clean icon + text layout.
 *
 * Features:
 * - Minimalist design (no heavy cards)
 * - Liquid glass icon container
 * - Smooth entrance animations
 * - Dark/light mode adaptive
 */

"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FeatureCardProps {
	/** Icon component from lucide-react */
	icon: LucideIcon;
	/** Feature title */
	title: string;
	/** Feature description */
	description: string;
	/** Animation delay for staggered entrance */
	delay?: number;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Simplified feature display with liquid glass icon
 */
export function FeatureCard({
	icon: Icon,
	title,
	description,
	delay = 0,
	className,
}: FeatureCardProps) {
	return (
		<motion.div
			initial={{ opacity: 0, x: -15 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{
				delay,
				duration: 0.5,
				type: "spring",
				stiffness: 100,
			}}
			className={cn("flex items-start gap-3 group", className)}
		>
			{/* Icon in small glass bubble */}
			<div
				className={cn(
					"flex-shrink-0 p-2.5 rounded-xl",
					"glass-liquid-subtle",
					"group-hover:scale-105 transition-transform duration-300",
				)}
			>
				<Icon className="w-4 h-4 text-primary" />
			</div>

			{/* Content - Direct text, no card wrapper */}
			<div className="flex-1 pt-0.5">
				<h3 className="font-semibold text-sm text-foreground leading-tight mb-1">
					{title}
				</h3>
				<p className="text-xs text-muted-foreground leading-relaxed">
					{description}
				</p>
			</div>
		</motion.div>
	);
}

/**
 * FeatureList - Container for multiple FeatureCards with staggered animation
 */
export interface FeatureListProps {
	features: Omit<FeatureCardProps, "delay">[];
	className?: string;
}

export function FeatureList({ features, className }: FeatureListProps) {
	return (
		<div className={cn("space-y-3", className)}>
			{features.map((feature, index) => (
				<FeatureCard
					key={feature.title}
					{...feature}
					delay={0.6 + index * 0.1}
				/>
			))}
		</div>
	);
}
