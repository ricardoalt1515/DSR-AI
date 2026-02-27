"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { CompanyContact } from "@/lib/types/company";

interface CompanyContactDialogProps {
	contact?: CompanyContact;
	trigger: React.ReactNode;
	onSubmit: (data: {
		name?: string;
		email?: string;
		phone?: string;
		title?: string;
		notes?: string;
		isPrimary: boolean;
	}) => Promise<void>;
}

interface FormState {
	name: string;
	email: string;
	phone: string;
	title: string;
	notes: string;
	isPrimary: boolean;
}

const EMPTY_FORM: FormState = {
	name: "",
	email: "",
	phone: "",
	title: "",
	notes: "",
	isPrimary: false,
};

export function CompanyContactDialog({
	contact,
	trigger,
	onSubmit,
}: CompanyContactDialogProps) {
	const [open, setOpen] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [form, setForm] = useState<FormState>(EMPTY_FORM);
	const [error, setError] = useState<string | null>(null);
	const isEditMode = Boolean(contact);

	useEffect(() => {
		if (!open) return;
		if (!contact) {
			setForm(EMPTY_FORM);
			setError(null);
			return;
		}
		setForm({
			name: contact.name ?? "",
			email: contact.email ?? "",
			phone: contact.phone ?? "",
			title: contact.title ?? "",
			notes: contact.notes ?? "",
			isPrimary: contact.isPrimary,
		});
		setError(null);
	}, [open, contact]);

	const trimmed = useMemo(
		() => ({
			name: form.name.trim(),
			email: form.email.trim(),
			phone: form.phone.trim(),
			title: form.title.trim(),
			notes: form.notes.trim(),
		}),
		[form],
	);

	const emailValid =
		trimmed.email.length === 0 ||
		/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed.email);
	const phoneValid =
		trimmed.phone.length === 0 ||
		(trimmed.phone.length >= 3 &&
			trimmed.phone.length <= 50 &&
			/[0-9]/.test(trimmed.phone));
	const hasIdentity =
		trimmed.name.length > 0 ||
		trimmed.email.length > 0 ||
		trimmed.phone.length > 0;

	const canSubmit = hasIdentity && emailValid && phoneValid && !submitting;

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!hasIdentity) {
			setError("At least one of name, email, or phone is required.");
			return;
		}
		if (!emailValid) {
			setError("Please provide a valid email.");
			return;
		}
		if (!phoneValid) {
			setError("Phone must be 3-50 chars and include at least one digit.");
			return;
		}

		setSubmitting(true);
		setError(null);
		try {
			await onSubmit({
				...(trimmed.name ? { name: trimmed.name } : {}),
				...(trimmed.email ? { email: trimmed.email } : {}),
				...(trimmed.phone ? { phone: trimmed.phone } : {}),
				...(trimmed.title ? { title: trimmed.title } : {}),
				...(trimmed.notes ? { notes: trimmed.notes } : {}),
				isPrimary: form.isPrimary,
			});
			setOpen(false);
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: "Failed to save contact",
			);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent className="sm:max-w-[560px]">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>
							{isEditMode ? "Edit Contact" : "Add Contact"}
						</DialogTitle>
						<DialogDescription>
							{isEditMode
								? "Update company contact details."
								: "Add a new contact to this company."}
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="company-contact-name">Name</Label>
							<Input
								id="company-contact-name"
								value={form.name}
								onChange={(event) =>
									setForm((prev) => ({ ...prev, name: event.target.value }))
								}
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="company-contact-title">Title</Label>
							<Input
								id="company-contact-title"
								value={form.title}
								onChange={(event) =>
									setForm((prev) => ({ ...prev, title: event.target.value }))
								}
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="company-contact-email">Email</Label>
							<Input
								id="company-contact-email"
								type="email"
								value={form.email}
								onChange={(event) =>
									setForm((prev) => ({ ...prev, email: event.target.value }))
								}
							/>
							{trimmed.email.length > 0 && !emailValid && (
								<p className="text-xs text-destructive">
									Enter a valid email address.
								</p>
							)}
						</div>

						<div className="grid gap-2">
							<Label htmlFor="company-contact-phone">Phone</Label>
							<Input
								id="company-contact-phone"
								type="tel"
								value={form.phone}
								onChange={(event) =>
									setForm((prev) => ({ ...prev, phone: event.target.value }))
								}
							/>
							{trimmed.phone.length > 0 && !phoneValid && (
								<p className="text-xs text-destructive">
									Phone must be 3-50 chars and include at least one digit.
								</p>
							)}
						</div>

						<div className="grid gap-2">
							<Label htmlFor="company-contact-notes">Notes</Label>
							<Textarea
								id="company-contact-notes"
								rows={3}
								value={form.notes}
								onChange={(event) =>
									setForm((prev) => ({ ...prev, notes: event.target.value }))
								}
							/>
						</div>

						<div className="flex items-center justify-between rounded-md border p-3">
							<div>
								<p className="text-sm font-medium">Primary contact</p>
								<p className="text-xs text-muted-foreground">
									Only one primary contact is allowed.
								</p>
							</div>
							<Switch
								checked={form.isPrimary}
								onCheckedChange={(checked) =>
									setForm((prev) => ({ ...prev, isPrimary: checked }))
								}
							/>
						</div>

						{!hasIdentity && (
							<p className="text-xs text-destructive">
								Provide at least one of name, email, or phone.
							</p>
						)}
						{error && <p className="text-xs text-destructive">{error}</p>}
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={submitting}
						>
							Cancel
						</Button>
						<LoadingButton
							type="submit"
							loading={submitting}
							disabled={!canSubmit}
						>
							{isEditMode ? "Save Changes" : "Add Contact"}
						</LoadingButton>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
