"use client";

import { useForm } from "@tanstack/react-form";
import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/lib/hooks/use-toast";
import type { LocationContact } from "@/lib/types/company";

interface LocationContactDialogProps {
	contact?: LocationContact;
	trigger: React.ReactNode;
	onSubmit: (data: {
		name: string;
		email?: string;
		phone?: string;
		title?: string;
		notes?: string;
	}) => Promise<void>;
}

const EMPTY_CONTACT = {
	name: "",
	email: "",
	phone: "",
	title: "",
	notes: "",
};

export function LocationContactDialog({
	contact,
	trigger,
	onSubmit,
}: LocationContactDialogProps) {
	const [open, setOpen] = useState(false);
	const { toast } = useToast();
	const isEditMode = Boolean(contact);

	const form = useForm({
		defaultValues: EMPTY_CONTACT,
		onSubmit: async ({ value }) => {
			if (!value.name.trim()) {
				toast({
					title: "Validation Error",
					description: "Contact name is required",
					variant: "destructive",
				});
				return;
			}

			try {
				await onSubmit({
					name: value.name.trim(),
					email: value.email?.trim() || undefined,
					phone: value.phone?.trim() || undefined,
					title: value.title?.trim() || undefined,
					notes: value.notes?.trim() || undefined,
				});
				setOpen(false);
			} catch (error) {
				toast({
					title: "Error",
					description:
						error instanceof Error ? error.message : "Failed to save contact",
					variant: "destructive",
				});
			}
		},
	});

	useEffect(() => {
		if (!open) return;
		if (contact) {
			form.setFieldValue("name", contact.name || "");
			form.setFieldValue("email", contact.email || "");
			form.setFieldValue("phone", contact.phone || "");
			form.setFieldValue("title", contact.title || "");
			form.setFieldValue("notes", contact.notes || "");
		} else {
			form.reset();
		}
	}, [open, contact, form]);

	const dialogTitle = isEditMode ? "Edit Contact" : "Add Contact";
	const dialogDescription = isEditMode
		? "Update contact details for this location."
		: "Add a new contact for this location.";

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent className="sm:max-w-[520px]">
				<form
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						form.handleSubmit();
					}}
				>
					<DialogHeader>
						<DialogTitle>{dialogTitle}</DialogTitle>
						<DialogDescription>{dialogDescription}</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						<form.Field name="name">
							{(field) => (
								<div className="grid gap-2">
									<Label htmlFor={field.name}>
										Name <span className="text-destructive">*</span>
									</Label>
									<Input
										id={field.name}
										value={field.state.value}
										onChange={(event) => field.handleChange(event.target.value)}
										onBlur={field.handleBlur}
									/>
									{field.state.meta.errors.length > 0 && (
										<p className="text-xs text-destructive">
											{field.state.meta.errors.join(", ")}
										</p>
									)}
								</div>
							)}
						</form.Field>

						<form.Field name="title">
							{(field) => (
								<div className="grid gap-2">
									<Label htmlFor={field.name}>Title</Label>
									<Input
										id={field.name}
										value={field.state.value}
										onChange={(event) => field.handleChange(event.target.value)}
										onBlur={field.handleBlur}
									/>
								</div>
							)}
						</form.Field>

						<form.Field name="email">
							{(field) => (
								<div className="grid gap-2">
									<Label htmlFor={field.name}>Email</Label>
									<Input
										type="email"
										id={field.name}
										value={field.state.value}
										onChange={(event) => field.handleChange(event.target.value)}
										onBlur={field.handleBlur}
									/>
								</div>
							)}
						</form.Field>

						<form.Field name="phone">
							{(field) => (
								<div className="grid gap-2">
									<Label htmlFor={field.name}>Phone</Label>
									<Input
										type="tel"
										id={field.name}
										value={field.state.value}
										onChange={(event) => field.handleChange(event.target.value)}
										onBlur={field.handleBlur}
									/>
								</div>
							)}
						</form.Field>

						<form.Field name="notes">
							{(field) => (
								<div className="grid gap-2">
									<Label htmlFor={field.name}>Notes</Label>
									<Textarea
										id={field.name}
										value={field.state.value}
										onChange={(event) => field.handleChange(event.target.value)}
										onBlur={field.handleBlur}
										rows={3}
									/>
								</div>
							)}
						</form.Field>
					</div>

					<DialogFooter>
						<form.Subscribe
							selector={(state) => ({
								canSubmit: Boolean(state.values.name?.trim()),
								isSubmitting: state.isSubmitting,
							})}
						>
							{({ canSubmit, isSubmitting }) => (
								<>
									<Button
										type="button"
										variant="outline"
										onClick={() => setOpen(false)}
										disabled={isSubmitting}
									>
										Cancel
									</Button>
									<LoadingButton
										type="submit"
										loading={isSubmitting}
										disabled={!canSubmit}
									>
										{isEditMode ? "Save Changes" : "Add Contact"}
									</LoadingButton>
								</>
							)}
						</form.Subscribe>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
