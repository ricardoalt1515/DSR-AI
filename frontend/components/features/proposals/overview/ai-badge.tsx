"use client";

import { Bot, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

export function AIBadge() {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Badge
						variant="secondary"
						className="gap-1.5 px-2.5 py-0.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-help"
					>
						<Sparkles className="h-3 w-3" />
						AI-Assisted Analysis
					</Badge>
				</TooltipTrigger>
				<TooltipContent side="bottom" className="max-w-xs">
					<div className="space-y-2 p-1">
						<div className="flex items-center gap-2 font-semibold text-sm">
							<Bot className="h-4 w-4" />
							Analysis Source
						</div>
						<p className="text-xs text-muted-foreground">
							Generated based on site photos, technical data sheets, and market
							intelligence databases. Reviewed by human experts.
						</p>
					</div>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
