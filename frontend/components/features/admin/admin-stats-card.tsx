"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminStatsCardProps {
	label: string;
	value: number | string;
	icon: LucideIcon;
	trend?: {
		value: number;
		isPositive: boolean;
	};
	variant?: "default" | "success" | "warning" | "muted";
}

const variantStyles = {
	default: {
		container: "border-primary/20 bg-primary/5",
		icon: "bg-primary/10 text-primary",
		value: "text-foreground",
	},
	success: {
		container: "border-green-500/20 bg-green-500/5",
		icon: "bg-green-500/10 text-green-600 dark:text-green-400",
		value: "text-green-600 dark:text-green-400",
	},
	warning: {
		container: "border-yellow-500/20 bg-yellow-500/5",
		icon: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
		value: "text-yellow-600 dark:text-yellow-400",
	},
	muted: {
		container: "border-muted-foreground/20 bg-muted/50",
		icon: "bg-muted text-muted-foreground",
		value: "text-muted-foreground",
	},
};

export function AdminStatsCard({
	label,
	value,
	icon: Icon,
	trend,
	variant = "default",
}: AdminStatsCardProps) {
	const styles = variantStyles[variant];

	return (
		<div
			className={cn(
				"flex items-center gap-4 rounded-xl border p-4 transition-all duration-200",
				"hover:shadow-md hover:-translate-y-0.5",
				styles.container,
			)}
		>
			<div
				className={cn(
					"flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
					styles.icon,
				)}
			>
				<Icon className="h-5 w-5" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-xs font-medium text-muted-foreground">{label}</p>
				<div className="flex items-baseline gap-2">
					<p
						className={cn("text-2xl font-semibold tabular-nums", styles.value)}
					>
						{value}
					</p>
					{trend && (
						<span
							className={cn(
								"text-xs font-medium",
								trend.isPositive ? "text-green-600" : "text-red-600",
							)}
						>
							{trend.isPositive ? "+" : "-"}
							{trend.value}%
						</span>
					)}
				</div>
			</div>
		</div>
	);
}
