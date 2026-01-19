"use client";

import { useForm } from "@tanstack/react-form";
import { MapPin } from "lucide-react";
import { useState } from "react";
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
import { isForbiddenError } from "@/lib/api/client";
import { locationSchema } from "@/lib/forms/schemas";
import { useToast } from "@/lib/hooks/use-toast";
import { useLocationStore } from "@/lib/stores/location-store";
import type { LocationSummary } from "@/lib/types/company";

interface CreateLocationDialogProps {
	companyId: string;
	onSuccess?: (location: LocationSummary) => void;
	trigger?: React.ReactNode;
}

/**
 * CreateLocationDialog - Modal for creating locations
 * Uses TanStack Form + Zod for type-safe validation
 */
export function CreateLocationDialog({
	companyId,
	onSuccess,
	trigger,
}: CreateLocationDialogProps) {
	const [open, setOpen] = useState(false);
	const { createLocation } = useLocationStore();
	const { toast } = useToast();

	const form = useForm({
		defaultValues: {
			name: "",
			city: "",
			state: "",
			address: "",
			notes: "",
		},
		onSubmit: async ({ value }) => {
			// Validate with Zod before submit
			const result = locationSchema.safeParse(value);
			if (!result.success) {
				toast({
					title: "Validation Error",
					description:
						result.error.errors[0]?.message || "Please check your input",
					variant: "destructive",
				});
				return;
			}

			try {
				const location = await createLocation(companyId, {
					...result.data,
					companyId,
				});

				toast({
					title: "Location created",
					description: `${result.data.name} has been created successfully.`,
				});
				setOpen(false);
				form.reset();
				onSuccess?.(location);
			} catch (error) {
				if (!isForbiddenError(error)) {
					toast({
						title: "Error",
						description:
							error instanceof Error
								? error.message
								: "Failed to create location",
						variant: "destructive",
					});
				}
			}
		},
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{trigger || (
					<Button>
						<MapPin className="mr-2 h-4 w-4" />
						New Location
					</Button>
				)}
			</DialogTrigger>

			<DialogContent className="sm:max-w-[500px]">
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
				>
					<DialogHeader>
						<DialogTitle>Create New Location</DialogTitle>
						<DialogDescription>
							Add a new location/site for this company.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						{/* Location Name */}
						<form.Field name="name">
							{(field) => (
								<div className="grid gap-2">
									<Label htmlFor={field.name}>
										Location Name <span className="text-destructive">*</span>
									</Label>
									<Input
										id={field.name}
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
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

						{/* City & State */}
						<div className="grid grid-cols-2 gap-4">
							<form.Field name="city">
								{(field) => (
									<div className="grid gap-2">
										<Label htmlFor={field.name}>
											City <span className="text-destructive">*</span>
										</Label>
										<Input
											id={field.name}
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
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

							<form.Field name="state">
								{(field) => (
									<div className="grid gap-2">
										<Label htmlFor={field.name}>
											State <span className="text-destructive">*</span>
										</Label>
										<Input
											id={field.name}
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
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
						</div>

						{/* Address */}
						<form.Field name="address">
							{(field) => (
								<div className="grid gap-2">
									<Label htmlFor={field.name}>Address</Label>
									<Input
										id={field.name}
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
									/>
								</div>
							)}
						</form.Field>

						{/* Notes */}
						<form.Field name="notes">
							{(field) => (
								<div className="grid gap-2">
									<Label htmlFor={field.name}>Notes</Label>
									<Textarea
										id={field.name}
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
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
								canSubmit: Boolean(
									state.values.name?.trim() &&
										state.values.city?.trim() &&
										state.values.state?.trim(),
								),
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
										Create Location
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
