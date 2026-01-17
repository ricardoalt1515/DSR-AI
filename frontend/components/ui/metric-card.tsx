import type { LucideIcon } from "lucide-react";
import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
	icon: LucideIcon;
	label: string;
	value: string | number;
	subtitle?: string | undefined;
	variant?: "primary" | "success" | "warning" | "chart-2" | "chart-4";
	className?: string;
	onClick?: (() => void) | undefined;
}

/**
 * Reusable metric card component
 * Following DRY principle - single source of truth for metric display
 *
 * @example
 * <MetricCard
 *   icon={DollarSign}
 *   label="Capital Investment"
 *   value={formatCurrency(capex)}
 *   subtitle="Total CAPEX"
 *   variant="primary"
 * />
 */
export const MetricCard = memo(function MetricCard({
	icon: Icon,
	label,
	value,
	subtitle,
	variant = "primary",
	className,
	onClick,
}: MetricCardProps) {
	const isClickable = !!onClick;
	const ariaLabel = isClickable
		? `${label}: ${value}. ${subtitle || ""}. Click to view details.`
		: `${label}: ${value}. ${subtitle || ""}`;

	return (
		<Card
			className={cn(
				"hover:shadow-lg transition-[box-shadow,transform] duration-300 hover:scale-[1.03] backdrop-blur-sm bg-gradient-to-br from-card to-card/80",
				variant === "primary" && "hover:border-primary/40",
				variant === "success" && "hover:border-success/40",
				variant === "warning" && "hover:border-warning/40",
				variant === "chart-2" && "hover:border-chart-2/40",
				variant === "chart-4" && "hover:border-chart-4/40",
				onClick && "cursor-pointer",
				className,
			)}
			onClick={onClick}
			role={isClickable ? "button" : undefined}
			aria-label={ariaLabel}
			tabIndex={isClickable ? 0 : undefined}
			onKeyDown={
				isClickable
					? (e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								onClick?.();
							}
						}
					: undefined
			}
		>
			<CardHeader className="pb-2">
				<div className="flex items-center gap-2">
					<div
						className={cn(
							"p-2 rounded-lg",
							variant === "primary" && "bg-primary/10",
							variant === "success" && "bg-success/10",
							variant === "warning" && "bg-warning/10",
							variant === "chart-2" && "bg-chart-2/10",
							variant === "chart-4" && "bg-chart-4/10",
						)}
					>
						<Icon
							className={cn(
								"h-4 w-4",
								variant === "primary" && "text-primary",
								variant === "success" && "text-success",
								variant === "warning" && "text-warning",
								variant === "chart-2" && "text-[hsl(var(--chart-2))]",
								variant === "chart-4" && "text-[hsl(var(--chart-4))]",
							)}
						/>
					</div>
					<CardTitle className="text-sm font-medium">{label}</CardTitle>
				</div>
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-bold">{value}</div>
				{subtitle && (
					<p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
				)}
			</CardContent>
		</Card>
	);
});
