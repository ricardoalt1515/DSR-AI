"use client";

import { AlertTriangle } from "lucide-react";
import { type MouseEvent, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface OrgPurgeForcePayload {
	confirmName: string;
	confirmPhrase: string;
	reason: string;
	ticketId: string;
}

interface ConfirmOrgPurgeForceDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: (payload: OrgPurgeForcePayload) => void | Promise<void>;
	orgName: string;
	orgSlug: string;
	loading?: boolean;
}

export function ConfirmOrgPurgeForceDialog({
	open,
	onOpenChange,
	onConfirm,
	orgName,
	orgSlug,
	loading = false,
}: ConfirmOrgPurgeForceDialogProps) {
	const [confirmName, setConfirmName] = useState("");
	const [confirmPhrase, setConfirmPhrase] = useState("");
	const [reason, setReason] = useState("");
	const [ticketId, setTicketId] = useState("");

	const requiredPhrase = `PURGE ${orgSlug}`;
	const isConfirmNameValid = confirmName.trim() === orgName;
	const isConfirmPhraseValid = confirmPhrase === requiredPhrase;
	const isReasonValid = reason.trim().length >= 20;
	const isTicketIdValid = ticketId.trim().length >= 3;

	const canSubmit =
		isConfirmNameValid &&
		isConfirmPhraseValid &&
		isReasonValid &&
		isTicketIdValid;

	const resetState = () => {
		setConfirmName("");
		setConfirmPhrase("");
		setReason("");
		setTicketId("");
	};

	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen) {
			resetState();
		}
		onOpenChange(nextOpen);
	};

	const handleConfirm = async (event: MouseEvent<HTMLButtonElement>) => {
		event.preventDefault();
		if (!canSubmit) return;
		await onConfirm({
			confirmName: confirmName.trim(),
			confirmPhrase,
			reason: reason.trim(),
			ticketId: ticketId.trim(),
		});
	};

	return (
		<AlertDialog open={open} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
							<AlertTriangle className="h-5 w-5 text-destructive" />
						</div>
						<AlertDialogTitle>Purge organization permanently?</AlertDialogTitle>
					</div>
					<AlertDialogDescription className="mt-4 space-y-2">
						<span className="block font-medium text-destructive">
							This action cannot be undone.
						</span>
						<span className="block">
							This will permanently delete organization data and linked
							resources.
						</span>
					</AlertDialogDescription>
				</AlertDialogHeader>

				<div className="space-y-3 py-2">
					<div className="space-y-2">
						<Label htmlFor="org-purge-confirm-name">
							Type organization name exactly:{" "}
							<span className="font-semibold">{orgName}</span>
						</Label>
						<Input
							id="org-purge-confirm-name"
							value={confirmName}
							onChange={(e) => setConfirmName(e.target.value)}
							disabled={loading}
							autoComplete="off"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="org-purge-confirm-phrase">
							Type phrase exactly:{" "}
							<span className="font-mono font-semibold">{requiredPhrase}</span>
						</Label>
						<Input
							id="org-purge-confirm-phrase"
							value={confirmPhrase}
							onChange={(e) => setConfirmPhrase(e.target.value)}
							disabled={loading}
							autoComplete="off"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="org-purge-reason">Reason (min 20 chars)</Label>
						<Textarea
							id="org-purge-reason"
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							disabled={loading}
							rows={3}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="org-purge-ticket">Ticket ID</Label>
						<Input
							id="org-purge-ticket"
							value={ticketId}
							onChange={(e) => setTicketId(e.target.value)}
							disabled={loading}
							autoComplete="off"
						/>
					</div>
				</div>

				<AlertDialogFooter>
					<AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleConfirm}
						disabled={loading || !canSubmit}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{loading ? "Purging..." : "Purge Permanently"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
