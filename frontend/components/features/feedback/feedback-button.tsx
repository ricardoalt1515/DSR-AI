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
						variant="outline"
						size="sm"
						onClick={() => setOpen(true)}
						className="rounded-full gap-2 px-3 border-2 border-primary/50 hover:border-primary hover:bg-primary/10"
					>
						<MessageSquarePlus className="h-4 w-4 text-primary" />
						<span className="text-primary font-medium">Feedback</span>
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
