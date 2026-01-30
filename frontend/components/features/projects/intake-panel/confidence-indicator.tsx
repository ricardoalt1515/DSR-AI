import { cn } from "@/lib/utils";

interface ConfidenceIndicatorProps {
	confidence: number;
	size?: "sm" | "md";
}

export function ConfidenceIndicator({
	confidence,
	size = "md",
}: ConfidenceIndicatorProps) {
	const sizeClasses =
		size === "sm" ? "text-xs gap-1" : "text-sm font-medium gap-1.5";
	const dotSize = size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";

	return (
		<span
			className={cn(
				"tabular-nums flex items-center",
				sizeClasses,
				confidence >= 85 && "text-success",
				confidence >= 70 && confidence < 85 && "text-warning",
				confidence < 70 && "text-destructive",
			)}
		>
			<span className={cn("inline-block rounded-full bg-current", dotSize)} />
			{confidence}%
		</span>
	);
}
