"use client";

import { Archive, Users } from "lucide-react";
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
	hasActiveUsers?: boolean;
	onForceConfirm?: () => void | Promise<void>;
}

export function ConfirmArchiveDialog({
	open,
	onOpenChange,
	onConfirm,
	entityType,
	entityName,
	loading = false,
	hasActiveUsers = false,
	onForceConfirm,
}: ConfirmArchiveDialogProps) {
	const isForceMode = hasActiveUsers && onForceConfirm;

	const handleConfirm = async (event: MouseEvent<HTMLButtonElement>) => {
		event.preventDefault();
		await onConfirm();
	};

	const handleForceConfirm = async (event: MouseEvent<HTMLButtonElement>) => {
		event.preventDefault();
		await onForceConfirm?.();
	};

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
							{isForceMode ? (
								<Users className="h-5 w-5 text-amber-500" />
							) : (
								<Archive className="h-5 w-5 text-amber-500" />
							)}
						</div>
						<AlertDialogTitle>
							{isForceMode
								? `Archive ${entityType} with active users?`
								: `Archive ${entityType}?`}
						</AlertDialogTitle>
					</div>
					<AlertDialogDescription className="mt-4 space-y-2">
						{isForceMode ? (
							<>
								<span className="block">
									This {entityType} has active users. Archiving will deactivate
									all members and make the {entityType} read-only.
								</span>
								<span className="block">
									<span className="font-semibold text-foreground">
										{entityName}
									</span>
								</span>
							</>
						) : (
							<>
								<span className="block">
									Are you sure you want to archive this {entityType}? It will
									become read-only and hidden from active lists.
								</span>
								<span className="block">
									<span className="font-semibold text-foreground">
										{entityName}
									</span>
								</span>
							</>
						)}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
					{isForceMode ? (
						<AlertDialogAction
							onClick={handleForceConfirm}
							disabled={loading}
							className="bg-amber-500 text-white hover:bg-amber-600"
						>
							{loading ? "Archiving…" : "Archive & Deactivate Users"}
						</AlertDialogAction>
					) : (
						<AlertDialogAction
							onClick={handleConfirm}
							disabled={loading}
							className="bg-amber-500 text-white hover:bg-amber-600"
						>
							{loading ? "Archiving…" : "Archive"}
						</AlertDialogAction>
					)}
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
