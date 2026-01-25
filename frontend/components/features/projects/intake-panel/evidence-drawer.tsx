"use client";

import { ChevronDown, FileText } from "lucide-react";
import Image from "next/image";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { SuggestionEvidence } from "@/lib/types/intake";
import { cn } from "@/lib/utils";

interface EvidenceDrawerProps {
	evidence?: SuggestionEvidence | null;
	className?: string;
}

export function EvidenceDrawer({ evidence, className }: EvidenceDrawerProps) {
	if (!evidence || (!evidence.excerpt && !evidence.thumbnailUrl)) {
		return null;
	}

	return (
		<Collapsible className={cn("mt-2", className)}>
			<CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors data-[state=open]:text-foreground [&>svg]:data-[state=open]:rotate-180">
				<ChevronDown className="h-3 w-3 transition-transform duration-200" />
				View source
			</CollapsibleTrigger>
			<CollapsibleContent>
				<section
					className="mt-2 rounded-xl bg-muted/40 p-3 space-y-2"
					aria-label="Source evidence"
				>
					{/* File info */}
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<FileText className="h-3.5 w-3.5" />
						<span className="truncate font-medium">{evidence.filename}</span>
						{evidence.page && (
							<span className="shrink-0">(p. {evidence.page})</span>
						)}
					</div>

					{/* Thumbnail preview */}
					{evidence.thumbnailUrl && (
						<div className="relative h-20 w-full overflow-hidden rounded-lg">
							<Image
								src={evidence.thumbnailUrl}
								alt={`Preview from ${evidence.filename}`}
								fill
								className="object-cover"
								unoptimized
							/>
						</div>
					)}

					{/* Excerpt */}
					{evidence.excerpt && (
						<blockquote className="border-l-2 border-primary/30 pl-3 text-xs italic text-muted-foreground">
							"{evidence.excerpt}"
						</blockquote>
					)}
				</section>
			</CollapsibleContent>
		</Collapsible>
	);
}
