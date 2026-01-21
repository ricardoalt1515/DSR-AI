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
		container: "border-success/20 bg-success/5",
		icon: "bg-success/10 text-success",
		value: "text-success",
	},
	warning: {
		container: "border-warning/20 bg-warning/5",
		icon: "bg-warning/10 text-warning",
		value: "text-warning",
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
				"flex items-center gap-4 rounded-xl border p-4 transition-[box-shadow,transform] duration-200",
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
								trend.isPositive ? "text-success" : "text-destructive",
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
