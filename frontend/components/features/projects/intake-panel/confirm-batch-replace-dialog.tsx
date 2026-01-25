"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BatchReplaceItem {
	id: string;
	fieldLabel: string;
	sectionTitle: string;
	currentValue: string;
	newValue: string;
}

interface ConfirmBatchReplaceDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	items: BatchReplaceItem[];
	totalCount: number;
	onConfirm: () => void;
}

export function ConfirmBatchReplaceDialog({
	open,
	onOpenChange,
	items,
	totalCount,
	onConfirm,
}: ConfirmBatchReplaceDialogProps) {
	const directCount = Math.max(totalCount - items.length, 0);

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Some fields already have values</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div className="text-sm text-muted-foreground">
							<div className="mt-3 space-y-3">
								<div>
									The following fields will be replaced if you continue.
								</div>
								<div className="max-h-64 overflow-y-auto space-y-3 pr-2">
									{items.map((item) => (
										<div
											key={item.id}
											className="rounded-md border border-border/60 p-3 space-y-2 text-sm"
										>
											<div className="text-sm font-medium text-foreground">
												{item.fieldLabel}
											</div>
											<div className="text-xs text-muted-foreground">
												{item.sectionTitle}
											</div>
											<div className="space-y-2">
												<div>
													<div className="text-xs uppercase text-muted-foreground">
														Current
													</div>
													<div className="text-foreground">
														{item.currentValue}
													</div>
												</div>
												<div>
													<div className="text-xs uppercase text-muted-foreground">
														New
													</div>
													<div className="text-foreground">{item.newValue}</div>
												</div>
											</div>
										</div>
									))}
								</div>
								{directCount > 0 && (
									<div className="text-sm text-muted-foreground">
										{directCount} other field
										{directCount === 1 ? "" : "s"} will be applied directly (no
										existing data).
									</div>
								)}
							</div>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction onClick={onConfirm}>
						Apply All ({totalCount})
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
