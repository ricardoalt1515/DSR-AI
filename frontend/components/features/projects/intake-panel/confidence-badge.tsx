"use client";

import { Badge } from "@/components/ui/badge";
import {
	getConfidenceBadgeVariant,
	getConfidenceLevel,
} from "@/lib/types/intake";
import { cn } from "@/lib/utils";

interface ConfidenceBadgeProps {
	confidence: number;
	className?: string;
}

export function ConfidenceBadge({
	confidence,
	className,
}: ConfidenceBadgeProps) {
	const level = getConfidenceLevel(confidence);
	const variant = getConfidenceBadgeVariant(confidence);

	const levelLabel = level.charAt(0).toUpperCase() + level.slice(1);

	return (
		<Badge
			variant={variant}
			className={cn("text-[10px] font-medium", className)}
			aria-label={`${confidence}% confidence`}
		>
			{levelLabel} {confidence}%
		</Badge>
	);
}
