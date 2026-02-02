import { cn } from "@/lib/utils";

interface ConfidenceIndicatorProps {
	confidence: number;
	size?: "sm" | "md";
	/** Show subtle pulse animation for high confidence */
	showPulse?: boolean;
}

export function ConfidenceIndicator({
	confidence,
	size = "md",
	showPulse = false,
}: ConfidenceIndicatorProps) {
	const isHigh = confidence >= 85;
	const isMedium = confidence >= 70 && confidence < 85;
	const isLow = confidence < 70;

	const sizeClasses =
		size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1";

	// Check for reduced motion
	const shouldPulse =
		showPulse &&
		isHigh &&
		typeof window !== "undefined" &&
		!window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 rounded-full border font-medium tabular-nums",
				sizeClasses,
				// High confidence: green
				isHigh && "bg-success/15 text-success border-success/30",
				// Medium confidence: amber/warning
				isMedium && "bg-warning/15 text-warning border-warning/30",
				// Low confidence: red/destructive
				isLow && "bg-destructive/15 text-destructive border-destructive/30",
				// Subtle pulse for high confidence
				shouldPulse && "animate-pulse-subtle",
			)}
		>
			<span
				className={cn(
					"inline-block rounded-full bg-current",
					size === "sm" ? "h-1 w-1" : "h-1.5 w-1.5",
				)}
			/>
			{confidence}%
		</span>
	);
}
