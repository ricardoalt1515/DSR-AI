"use client";

import { AlertCircle, CheckCircle2, Circle } from "lucide-react";
import { getConfidenceLevel } from "@/lib/types/intake";
import { cn } from "@/lib/utils";

interface ConfidenceBadgeProps {
	confidence: number;
	className?: string;
}

/**
 * Compact confidence indicator with number + color + shape.
 * Shape indicators ensure accessibility for colorblind users:
 * - High (≥85%): Green checkmark
 * - Medium (70-84%): Yellow alert
 * - Low (<70%): Gray circle
 */
export function ConfidenceBadge({
	confidence,
	className,
}: ConfidenceBadgeProps) {
	const level = getConfidenceLevel(confidence);

	const config = {
		high: {
			Icon: CheckCircle2,
			colorClass: "text-success",
			label: "High confidence",
		},
		medium: {
			Icon: AlertCircle,
			colorClass: "text-warning",
			label: "Medium confidence",
		},
		low: {
			Icon: Circle,
			colorClass: "text-muted-foreground",
			label: "Low confidence",
		},
	}[level];

	const { Icon, colorClass, label } = config;

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 tabular-nums",
				colorClass,
				className,
			)}
		>
			<span className="text-xs font-semibold">{confidence}%</span>
			<Icon className="h-3 w-3" aria-hidden="true" />
			<span className="sr-only">{label}</span>
		</span>
	);
}
