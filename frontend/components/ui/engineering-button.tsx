"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Calculator, CheckCircle2, FileText, Play, Zap } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "./loading-states";

const engineeringButtonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
	{
		variants: {
			variant: {
				// Standard variants
				default: "bg-primary text-primary-foreground hover:bg-primary/90",
				destructive:
					"bg-destructive text-destructive-foreground hover:bg-destructive/90",
				outline:
					"border border-input bg-background hover:bg-accent hover:text-accent-foreground",
				secondary:
					"bg-secondary text-secondary-foreground hover:bg-secondary/80",
				ghost: "hover:bg-accent hover:text-accent-foreground",
				link: "text-primary underline-offset-4 hover:underline",

				// Engineering-specific variants
				calculate:
					"bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md transition-[box-shadow,background-color]",
				generate:
					"bg-gradient-to-r from-treatment-primary via-treatment-secondary to-primary text-primary-foreground hover:from-treatment-primary/90 hover:to-primary/90 shadow-sm hover:shadow-md",
				technical:
					"border border-border/60 bg-card/70 text-foreground hover:bg-card shadow-sm",
				success: "bg-success text-success-foreground hover:bg-success/90",
				critical:
					"bg-warning text-warning-foreground hover:bg-warning/90 animate-pulse",
				quick:
					"bg-gradient-to-r from-success/80 via-success to-treatment-secondary text-success-foreground hover:from-success/90 hover:to-treatment-secondary/90 shadow-lg hover:shadow-xl transform hover:scale-105 transition-[box-shadow,transform]",
			},
			size: {
				default: "h-10 px-4 py-2",
				sm: "h-9 rounded-md px-3",
				lg: "h-11 rounded-md px-8",
				xl: "h-12 rounded-lg px-10 text-base",
				icon: "h-10 w-10",
			},
			loading: {
				true: "cursor-not-allowed",
				false: "",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
			loading: false,
		},
	},
);

export interface EngineeringButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof engineeringButtonVariants> {
	asChild?: boolean;
	loading?: boolean;
	loadingText?: string;
	icon?: "calculate" | "generate" | "technical" | "play" | "check";
	estimatedTime?: string;
}

const iconMap = {
	calculate: Calculator,
	generate: Zap,
	technical: FileText,
	play: Play,
	check: CheckCircle2,
};

const EngineeringButton = React.forwardRef<
	HTMLButtonElement,
	EngineeringButtonProps
>(
	(
		{
			className,
			variant,
			size,
			asChild = false,
			loading = false,
			loadingText,
			icon,
			estimatedTime,
			children,
			disabled,
			...props
		},
		ref,
	) => {
		const Comp = asChild ? Slot : "button";
		const IconComponent = icon ? iconMap[icon] : null;

		const isDisabled = disabled || loading;

		return (
			<Comp
				className={cn(
					engineeringButtonVariants({ variant, size, loading, className }),
				)}
				ref={ref}
				disabled={isDisabled}
				{...props}
			>
				{loading ? (
					<>
						<LoadingSpinner size="sm" />
						{loadingText || "Procesando..."}
					</>
				) : (
					<>
						{IconComponent && <IconComponent className="h-4 w-4" />}
						{children}
						{estimatedTime && (
							<span className="text-xs opacity-75 ml-1">
								(~{estimatedTime})
							</span>
						)}
					</>
				)}
			</Comp>
		);
	},
);
EngineeringButton.displayName = "EngineeringButton";

// Quick Action Button for common engineering tasks
interface QuickActionButtonProps
	extends Omit<EngineeringButtonProps, "variant"> {
	action:
		| "calculate-capex"
		| "generate-proposal"
		| "validate-parameters"
		| "export-pdf"
		| "quick-start";
}

export function QuickActionButton({
	action,
	...props
}: QuickActionButtonProps) {
	const actionConfig = {
		"calculate-capex": {
			variant: "calculate" as const,
			icon: "calculate" as const,
			children: "Calculate CAPEX",
			estimatedTime: "15s",
		},
		"generate-proposal": {
			variant: "generate" as const,
			icon: "generate" as const,
			children: "Generate proposal",
			estimatedTime: "2-3min",
		},
		"validate-parameters": {
			variant: "technical" as const,
			icon: "check" as const,
			children: "Validate parameters",
			estimatedTime: "5s",
		},
		"export-pdf": {
			variant: "outline" as const,
			icon: "technical" as const,
			children: "PDF export",
		},
		"quick-start": {
			variant: "quick" as const,
			icon: "play" as const,
			children: "Quick start",
			estimatedTime: "30s",
		},
	};

	const config = actionConfig[action];

	return <EngineeringButton {...config} {...props} />;
}

// Button Group for related engineering actions
interface EngineeringButtonGroupProps {
	children: React.ReactNode;
	className?: string;
	orientation?: "horizontal" | "vertical";
}

export function EngineeringButtonGroup({
	children,
	className,
	orientation = "horizontal",
}: EngineeringButtonGroupProps) {
	return (
		<div
			className={cn(
				"flex",
				orientation === "horizontal" ? "flex-row gap-2" : "flex-col gap-2",
				className,
			)}
		>
			{children}
		</div>
	);
}

export { EngineeringButton, engineeringButtonVariants };
