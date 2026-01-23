"use client";

import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePendingSuggestionsCount } from "@/lib/stores/intake-store";
import type { TableSection } from "@/lib/types/technical-data";
import { cn } from "@/lib/utils";
import { IntakePanelContent } from "./intake-panel-content";

interface IntakePanelProps {
	projectId: string;
	sections: TableSection[];
	disabled?: boolean;
	onUploadComplete?: () => void;
	className?: string;
}

/**
 * IntakePanel - AI-powered intake panel for the questionnaire
 *
 * Desktop: Renders directly in the right panel of ResizableDataLayout
 * Mobile: Shows FAB that opens a Drawer with the same content
 */
export function IntakePanel({
	projectId,
	sections,
	disabled = false,
	onUploadComplete,
	className,
}: IntakePanelProps) {
	const pendingCount = usePendingSuggestionsCount();

	return (
		<>
			{/* Desktop: Direct render */}
			<div className={cn("hidden lg:block h-full", className)}>
				<ScrollArea className="h-full">
					<div className="px-5 py-5 surface-muted">
						<IntakePanelContent
							projectId={projectId}
							sections={sections}
							disabled={disabled}
							{...(onUploadComplete ? { onUploadComplete } : {})}
						/>
					</div>
				</ScrollArea>
			</div>

			{/* Mobile: FAB + Drawer */}
			<div className="lg:hidden">
				<Drawer>
					<DrawerTrigger asChild>
						<Button
							size="lg"
							className={cn(
								"fixed bottom-6 right-6 z-50",
								"h-14 w-14 rounded-full shadow-lg",
								"bg-primary hover:bg-primary/90",
							)}
							aria-label="Open intake panel"
						>
							<Sparkles className="h-6 w-6" />
							{pendingCount > 0 && (
								<Badge
									variant="destructive"
									className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px]"
								>
									{pendingCount}
								</Badge>
							)}
						</Button>
					</DrawerTrigger>
					<DrawerContent className="max-h-[85vh]">
						<DrawerHeader className="border-b">
							<DrawerTitle className="flex items-center gap-2">
								<Sparkles className="h-5 w-5 text-primary" />
								AI Intake Assistant
								{pendingCount > 0 && (
									<Badge variant="secondary" className="ml-2">
										{pendingCount} pending
									</Badge>
								)}
							</DrawerTitle>
						</DrawerHeader>
						<ScrollArea className="h-[calc(85vh-80px)]">
							<div className="p-4">
								<IntakePanelContent
									projectId={projectId}
									sections={sections}
									disabled={disabled}
									{...(onUploadComplete ? { onUploadComplete } : {})}
								/>
							</div>
						</ScrollArea>
					</DrawerContent>
				</Drawer>
			</div>
		</>
	);
}
