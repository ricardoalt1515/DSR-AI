"use client";

import { Archive } from "lucide-react";
import type { MouseEvent } from "react";
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

interface ConfirmArchiveDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void | Promise<void>;
	entityType: "project" | "company" | "location" | "organization";
	entityName: string;
	loading?: boolean;
}

export function ConfirmArchiveDialog({
	open,
	onOpenChange,
	onConfirm,
	entityType,
	entityName,
	loading = false,
}: ConfirmArchiveDialogProps) {
	const handleConfirm = async (event: MouseEvent<HTMLButtonElement>) => {
		event.preventDefault();
		await onConfirm();
	};

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
							<Archive className="h-5 w-5 text-amber-500" />
						</div>
						<AlertDialogTitle>Archive {entityType}?</AlertDialogTitle>
					</div>
					<AlertDialogDescription className="mt-4">
						Are you sure you want to archive this {entityType}? It will become
						read-only and hidden from active lists.
						<br />
						<br />
						<span className="font-semibold text-foreground">{entityName}</span>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleConfirm}
						disabled={loading}
						className="bg-amber-500 text-white hover:bg-amber-600"
					>
						{loading ? "Archiving…" : "Archive"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
