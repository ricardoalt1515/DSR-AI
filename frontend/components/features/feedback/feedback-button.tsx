"use client";

import { MessageSquarePlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { FeedbackDialog } from "./feedback-dialog";

export function FeedbackButton() {
	const [open, setOpen] = useState(false);

	return (
		<>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setOpen(true)}
						className="h-9 w-9 rounded-full border border-border/40 bg-card/60 text-foreground transition-colors duration-300 hover:bg-card/80"
					>
						<MessageSquarePlus className="h-4 w-4" />
						<span className="sr-only">Send feedback</span>
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>Send feedback</p>
				</TooltipContent>
			</Tooltip>

			<FeedbackDialog open={open} onOpenChange={setOpen} />
		</>
	);
}
