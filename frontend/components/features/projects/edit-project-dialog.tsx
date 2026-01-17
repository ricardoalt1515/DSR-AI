"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PROJECT_STATUS_FLOW } from "@/lib/project-status";
import type { ProjectStatus, ProjectSummary } from "@/lib/project-types";
import { useProjectActions } from "@/lib/stores";

const PROJECT_STATUS_OPTIONS = PROJECT_STATUS_FLOW as [
	ProjectStatus,
	...ProjectStatus[],
];

// Validation schema - fail fast with clear error messages
const editProjectSchema = z.object({
	name: z
		.string()
		.min(3, "Project name must be at least 3 characters")
		.max(100, "Project name must be less than 100 characters"),
	client: z
		.string()
		.min(2, "Client name must be at least 2 characters")
		.max(100, "Client name must be less than 100 characters"),
	location: z
		.string()
		.min(2, "Location must be at least 2 characters")
		.max(200, "Location must be less than 200 characters"),
	status: z.enum(PROJECT_STATUS_OPTIONS),
	description: z
		.string()
		.max(1000, "Description must be less than 1000 characters")
		.optional(),
});

type EditProjectFormValues = z.infer<typeof editProjectSchema>;

interface EditProjectDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	project: Pick<
		ProjectSummary,
		"id" | "name" | "client" | "location" | "status" | "description"
	>;
}

/**
 * EditProjectDialog - Allows users to edit project information
 *
 * Clean code principles:
 * - Single responsibility: Only handles project editing
 * - DRY: Reuses form components and validation
 * - Good names: Clear variable and function names
 * - Fail fast: Validates input before submission
 * - No magic numbers/strings: Uses constants
 */
export function EditProjectDialog({
	open,
	onOpenChange,
	project,
}: EditProjectDialogProps) {
	const { updateProject } = useProjectActions();
	const [statusOpen, setStatusOpen] = useState(false);

	const handleDialogOpenChange = (nextOpen: boolean) => {
		if (!nextOpen) {
			setStatusOpen(false);
		}
		onOpenChange(nextOpen);
	};

	// Initialize form with current project values
	const form = useForm<EditProjectFormValues>({
		resolver: zodResolver(editProjectSchema),
		defaultValues: {
			name: project.name,
			client: project.client,
			location: project.location,
			status: project.status,
			description: project.description ?? "",
		},
	});

	// Reset form only when dialog opens (not on every prop change)
	// This prevents losing user edits when the store updates
	const prevOpenRef = useRef(false);
	const prevProjectIdRef = useRef(project.id);

	useEffect(() => {
		const wasOpen = prevOpenRef.current;
		const prevProjectId = prevProjectIdRef.current;
		prevOpenRef.current = open;
		prevProjectIdRef.current = project.id;

		// If project changed while dialog is open, close it to prevent stale data
		if (open && wasOpen && prevProjectId !== project.id) {
			setStatusOpen(false);
			onOpenChange(false);
			return;
		}

		// Reset form only when transitioning from closed to open
		if (open && !wasOpen) {
			form.reset({
				name: project.name,
				client: project.client,
				location: project.location,
				status: project.status,
				description: project.description ?? "",
			});
		}
	}, [open, project, form, onOpenChange]);

	// Handle form submission - returns result, doesn't print
	const handleSubmit = async (values: EditProjectFormValues) => {
		try {
			// Prepare update payload - only include changed values
			const updates: Partial<ProjectSummary> = {};

			if (values.name !== project.name) updates.name = values.name;
			if (values.client !== project.client) updates.client = values.client;
			if (values.location !== project.location)
				updates.location = values.location;
			if (values.status !== project.status) updates.status = values.status;
			if (values.description !== project.description)
				updates.description = values.description ?? "";

			// Fail fast: Don't make API call if nothing changed
			if (Object.keys(updates).length === 0) {
				toast.info("No changes detected");
				setStatusOpen(false);
				onOpenChange(false);
				return;
			}

			await updateProject(project.id, updates);

			toast.success("Project updated", {
				description: `"${values.name}" has been updated successfully`,
			});

			setStatusOpen(false);
			onOpenChange(false);
		} catch (error) {
			// Proper error handling with user-friendly message
			const errorMessage =
				error instanceof Error ? error.message : "Failed to update project";

			toast.error("Update failed", {
				description: errorMessage,
			});
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleDialogOpenChange} modal={true}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Edit Waste Stream</DialogTitle>
					<DialogDescription>
						Update waste stream information. Changes will be saved immediately.
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(handleSubmit)}
						className="space-y-4"
					>
						{/* Project Name */}
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Project Name *</FormLabel>
									<FormControl>
										<Input
											placeholder="e.g., Food Processing Waste Diversion Project"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Client */}
						<FormField
							control={form.control}
							name="client"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Client *</FormLabel>
									<FormControl>
										<Input placeholder="e.g., City of Los Angeles" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Location */}
						<FormField
							control={form.control}
							name="location"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Location *</FormLabel>
									<FormControl>
										<Input placeholder="e.g., Los Angeles, CA" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Status */}
						<FormField
							control={form.control}
							name="status"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Status *</FormLabel>
									<Select
										open={statusOpen}
										onOpenChange={setStatusOpen}
										onValueChange={field.onChange}
										value={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select status" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{PROJECT_STATUS_FLOW.map((status) => (
												<SelectItem key={status} value={status}>
													{status}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Description */}
						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Description</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Brief description of the project..."
											className="min-h-[100px]"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={form.formState.isSubmitting}>
								{form.formState.isSubmitting ? "Saving..." : "Save Changes"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
