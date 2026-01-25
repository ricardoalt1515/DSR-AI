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

interface ConfirmReplaceDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	fieldLabel: string;
	sectionTitle: string;
	currentValue: string;
	newValue: string;
	onConfirm: () => void;
}

export function ConfirmReplaceDialog({
	open,
	onOpenChange,
	fieldLabel,
	sectionTitle,
	currentValue,
	newValue,
	onConfirm,
}: ConfirmReplaceDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Replace existing value?</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div className="text-sm text-muted-foreground">
							<div className="mt-3 space-y-3">
								<div>
									This suggestion will overwrite a field that already has data.
								</div>
								<div className="space-y-2">
									<div className="text-sm font-medium text-foreground">
										{fieldLabel}
									</div>
									<div className="text-xs text-muted-foreground">
										{sectionTitle}
									</div>
									<div className="rounded-md border border-border/60 p-3 space-y-2 text-sm">
										<div>
											<div className="text-xs uppercase text-muted-foreground">
												Current
											</div>
											<div className="text-foreground">{currentValue}</div>
										</div>
										<div>
											<div className="text-xs uppercase text-muted-foreground">
												New
											</div>
											<div className="text-foreground">{newValue}</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction onClick={onConfirm}>
						Replace Value
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
