"use client";

import { Keyboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface KeyboardShortcutsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const shortcuts = [
	{
		category: "Selection",
		items: [
			{ keys: ["⌘", "A"], description: "Select all visible suggestions" },
			{ keys: ["Esc"], description: "Clear selection" },
		],
	},
	{
		category: "Actions",
		items: [
			{ keys: ["A"], description: "Apply selected suggestions" },
			{ keys: ["R"], description: "Reject selected suggestions" },
		],
	},
	{
		category: "Help",
		items: [{ keys: ["?"], description: "Show this help dialog" }],
	},
];

function Kbd({ children }: { children: React.ReactNode }) {
	return (
		<kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
			{children}
		</kbd>
	);
}

export function KeyboardShortcutsDialog({
	open,
	onOpenChange,
}: KeyboardShortcutsDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="sm:max-w-md"
				onOpenAutoFocus={(e) => e.preventDefault()}
			>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Keyboard className="h-4 w-4" />
						Keyboard Shortcuts
					</DialogTitle>
					<DialogDescription>
						Quick actions for reviewing AI suggestions
					</DialogDescription>
				</DialogHeader>

				<div className="mt-4 space-y-4">
					{shortcuts.map((group) => (
						<div key={group.category}>
							<h4 className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
								{group.category}
							</h4>
							<div className="space-y-2">
								{group.items.map((shortcut) => (
									<div
										key={shortcut.description}
										className="flex items-center justify-between py-1"
									>
										<span className="text-sm">{shortcut.description}</span>
										<div className="flex items-center gap-1">
											{shortcut.keys.map((key, i) => (
												<span key={key} className="flex items-center gap-1">
													<Kbd>{key}</Kbd>
													{i < shortcut.keys.length - 1 && (
														<span className="text-muted-foreground text-xs">
															+
														</span>
													)}
												</span>
											))}
										</div>
									</div>
								))}
							</div>
						</div>
					))}
				</div>

				<div className="mt-6 flex justify-end">
					<Button
						variant="secondary"
						size="sm"
						onClick={() => onOpenChange(false)}
						autoFocus
					>
						<X className="h-3 w-3 mr-1" />
						Close
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
