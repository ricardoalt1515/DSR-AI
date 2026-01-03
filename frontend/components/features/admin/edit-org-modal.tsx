"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Organization, OrganizationUpdateInput } from "@/lib/api";

interface EditOrgModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	organization: Organization | null;
	onSubmit: (orgId: string, data: OrganizationUpdateInput) => Promise<void>;
}

export function EditOrgModal({
	open,
	onOpenChange,
	organization,
	onSubmit,
}: EditOrgModalProps) {
	const [form, setForm] = useState({
		name: "",
		contactEmail: "",
		contactPhone: "",
		isActive: true,
	});
	const [submitting, setSubmitting] = useState(false);
	const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

	useEffect(() => {
		if (organization) {
			setForm({
				name: organization.name,
				contactEmail: organization.contactEmail || "",
				contactPhone: organization.contactPhone || "",
				isActive: organization.isActive,
			});
		}
	}, [organization]);

	const handleInputChange = (field: keyof typeof form, value: string | boolean) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	const handleActiveToggle = (checked: boolean) => {
		if (!checked && organization?.isActive) {
			setShowDeactivateConfirm(true);
		} else {
			handleInputChange("isActive", checked);
		}
	};

	const confirmDeactivate = () => {
		handleInputChange("isActive", false);
		setShowDeactivateConfirm(false);
	};

	const hasChanges = useMemo(() => {
		if (!organization) return false;
		return (
			form.name !== organization.name ||
			form.contactEmail !== (organization.contactEmail || "") ||
			form.contactPhone !== (organization.contactPhone || "") ||
			form.isActive !== organization.isActive
		);
	}, [form, organization]);

	const canSubmit = useMemo(() => {
		return form.name.trim() !== "" && hasChanges;
	}, [form.name, hasChanges]);

	const handleSubmit = async () => {
		if (!canSubmit || !organization) return;

		setSubmitting(true);
		try {
			const updates: OrganizationUpdateInput = {};
			if (form.name !== organization.name) updates.name = form.name.trim();
			if (form.contactEmail !== (organization.contactEmail || "")) {
				updates.contactEmail = form.contactEmail.trim() || null;
			}
			if (form.contactPhone !== (organization.contactPhone || "")) {
				updates.contactPhone = form.contactPhone.trim() || null;
			}
			if (form.isActive !== organization.isActive) updates.isActive = form.isActive;

			await onSubmit(organization.id, updates);
			onOpenChange(false);
		} finally {
			setSubmitting(false);
		}
	};

	const handleClose = () => {
		onOpenChange(false);
	};

	if (!organization) return null;

	return (
		<>
			<Dialog open={open} onOpenChange={handleClose}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>Edit Organization</DialogTitle>
						<DialogDescription>
							Update organization details. Slug cannot be changed.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="name">Name *</Label>
							<Input
								id="name"
								value={form.name}
								onChange={(e) => handleInputChange("name", e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="slug">Slug</Label>
							<Input
								id="slug"
								value={organization.slug}
								disabled
								className="font-mono bg-muted"
							/>
							<p className="text-xs text-muted-foreground">
								Slug cannot be modified after creation
							</p>
						</div>
						<div className="space-y-2">
							<Label htmlFor="contactEmail">Contact Email</Label>
							<Input
								id="contactEmail"
								type="email"
								placeholder="admin@company.com"
								value={form.contactEmail}
								onChange={(e) => handleInputChange("contactEmail", e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="contactPhone">Contact Phone</Label>
							<Input
								id="contactPhone"
								placeholder="+1 555 123 4567"
								value={form.contactPhone}
								onChange={(e) => handleInputChange("contactPhone", e.target.value)}
							/>
						</div>
						<div className="flex items-center justify-between rounded-lg border p-4">
							<div className="space-y-0.5">
								<Label>Active Status</Label>
								<p className="text-sm text-muted-foreground">
									{form.isActive
										? "Organization is active"
										: "Organization is deactivated"}
								</p>
							</div>
							<Switch
								checked={form.isActive}
								onCheckedChange={handleActiveToggle}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={handleClose}>
							Cancel
						</Button>
						<Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
							{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							{submitting ? "Saving..." : "Save Changes"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog open={showDeactivateConfirm} onOpenChange={setShowDeactivateConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Deactivate Organization?</AlertDialogTitle>
						<AlertDialogDescription>
							This will prevent all users in this organization from accessing the
							platform. You can reactivate it later.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDeactivate}
							className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
						>
							Deactivate
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
