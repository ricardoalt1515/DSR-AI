"use client";

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
	icon: LucideIcon;
	title: string;
	description: string;
	action?: {
		label: string;
		onClick: () => void;
		variant?: "default" | "outline" | "secondary";
	};
	className?: string;
}

export function EmptyState({
	icon: Icon,
	title,
	description,
	action,
	className,
}: EmptyStateProps) {
	return (
		<Card className={cn("border-dashed", className)}>
			<CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
				<div className="rounded-full bg-muted p-4">
					<Icon className="h-10 w-10 text-muted-foreground" />
				</div>
				<div className="space-y-2">
					<h3 className="text-lg font-semibold text-foreground">{title}</h3>
					<p className="text-sm text-muted-foreground max-w-sm mx-auto">
						{description}
					</p>
				</div>
				{action && (
					<Button
						onClick={action.onClick}
						variant={action.variant || "default"}
						className="mt-2"
					>
						{action.label}
					</Button>
				)}
			</CardContent>
		</Card>
	);
}
