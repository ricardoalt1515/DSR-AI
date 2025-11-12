import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DecisionActionButtonProps {
	icon: LucideIcon;
	label: string;
	description: string;
	onAction?: () => void;
	disabled?: boolean;
}

/**
 * Reusable action button for decision sidebar
 * Shows icon, label, and description in a card-like button
 */
export function DecisionActionButton({
	icon: Icon,
	label,
	description,
	onAction,
	disabled,
}: DecisionActionButtonProps) {
	return (
		<button
			type="button"
			onClick={onAction}
			disabled={disabled}
			className={cn(
				"w-full rounded-lg border border-border/70 bg-card/50 p-3 text-left transition hover:border-primary/50 hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
				disabled &&
					"cursor-not-allowed opacity-60 hover:border-border/70 hover:bg-card/50",
			)}
		>
			<div className="flex items-start gap-3">
				<div className="mt-1 rounded-full bg-primary/10 p-2">
					<Icon className="h-4 w-4 text-primary" />
				</div>
				<div className="space-y-1">
					<p className="text-sm font-medium">{label}</p>
					<p className="text-xs text-muted-foreground leading-snug">
						{description}
					</p>
				</div>
			</div>
		</button>
	);
}
