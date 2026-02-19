"use client";

/**
 * Edit item drawer — lateral panel for editing a bulk import item's normalized data.
 */

import { Loader2, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { BulkImportItem } from "@/lib/api/bulk-import";
import { bulkImportAPI } from "@/lib/api/bulk-import";

interface EditItemDrawerProps {
	item: BulkImportItem | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSaved: (updated: BulkImportItem) => void;
}

const LOCATION_FIELDS = [
	{ key: "name", label: "Location Name", required: true },
	{ key: "address", label: "Address", required: false },
	{ key: "city", label: "City", required: true },
	{ key: "state", label: "State", required: true },
];

const PROJECT_FIELDS = [
	{ key: "name", label: "Waste Stream Name", required: true },
	{ key: "category", label: "Category", required: false },
	{ key: "project_type", label: "Project Type", required: false },
	{ key: "sector", label: "Sector", required: false },
	{ key: "subsector", label: "Sub-sector", required: false },
	{ key: "estimated_volume", label: "Estimated Volume", required: false },
];

export function EditItemDrawer({
	item,
	open,
	onOpenChange,
	onSaved,
}: EditItemDrawerProps) {
	const [formData, setFormData] = useState<Record<string, string>>({});
	const [description, setDescription] = useState("");
	const [reviewNotes, setReviewNotes] = useState("");
	const [saving, setSaving] = useState(false);

	const fields =
		item?.itemType === "location" ? LOCATION_FIELDS : PROJECT_FIELDS;

	useEffect(() => {
		if (item && open) {
			const data = item.userAmendments ?? item.normalizedData;
			const mapped: Record<string, string> = {};
			for (const field of item.itemType === "location"
				? LOCATION_FIELDS
				: PROJECT_FIELDS) {
				mapped[field.key] = String(data[field.key] ?? "");
			}
			setDescription(String(data.description ?? ""));
			setReviewNotes(item.reviewNotes ?? "");
			setFormData(mapped);
		}
	}, [item, open]);

	const handleFieldChange = useCallback((key: string, value: string) => {
		setFormData((prev) => ({ ...prev, [key]: value }));
	}, []);

	const handleSave = useCallback(async () => {
		if (!item) return;

		// Validation
		const missingRequired = fields
			.filter((f) => f.required && !formData[f.key]?.trim())
			.map((f) => f.label);

		if (missingRequired.length > 0) {
			toast.error("Missing required fields", {
				description: missingRequired.join(", "),
			});
			return;
		}

		setSaving(true);
		try {
			const normalizedData: Record<string, unknown> = { ...formData };
			if (item.itemType === "project" && description.trim()) {
				normalizedData.description = description.trim();
			}

			const patchOptions: {
				normalizedData: Record<string, unknown>;
				reviewNotes?: string;
			} = { normalizedData };
			const trimmedNotes = reviewNotes.trim();
			if (trimmedNotes) {
				patchOptions.reviewNotes = trimmedNotes;
			}

			const updated = await bulkImportAPI.patchItem(
				item.id,
				"amend",
				patchOptions,
			);
			toast.success("Item updated");
			onSaved(updated);
			onOpenChange(false);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to save changes",
			);
		} finally {
			setSaving(false);
		}
	}, [item, fields, formData, description, reviewNotes, onSaved, onOpenChange]);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="sm:max-w-lg overflow-y-auto">
				<SheetHeader>
					<SheetTitle>
						Edit {item?.itemType === "location" ? "Location" : "Waste Stream"}
					</SheetTitle>
					<SheetDescription>
						Modify the extracted data before finalizing the import.
					</SheetDescription>
				</SheetHeader>

				<div className="space-y-4 py-6 px-4">
					{fields.map((field) => (
						<div key={field.key} className="space-y-2">
							<Label htmlFor={`edit-${field.key}`}>
								{field.label}
								{field.required && (
									<span className="text-destructive ml-1">*</span>
								)}
							</Label>
							<Input
								id={`edit-${field.key}`}
								value={formData[field.key] ?? ""}
								onChange={(e) => handleFieldChange(field.key, e.target.value)}
								placeholder={`Enter ${field.label.toLowerCase()}`}
								disabled={saving}
							/>
						</div>
					))}

					{item?.itemType === "project" && (
						<div className="space-y-2">
							<Label htmlFor="edit-description">Description</Label>
							<Textarea
								id="edit-description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Waste stream description..."
								rows={3}
								disabled={saving}
							/>
						</div>
					)}

					<div className="space-y-2 pt-2 border-t">
						<Label htmlFor="edit-review-notes">Review Notes (optional)</Label>
						<Textarea
							id="edit-review-notes"
							value={reviewNotes}
							onChange={(e) => setReviewNotes(e.target.value)}
							placeholder="Add a note about this edit..."
							rows={2}
							disabled={saving}
						/>
					</div>
				</div>

				<SheetFooter className="px-4">
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={saving}
					>
						Cancel
					</Button>
					<Button onClick={handleSave} disabled={saving}>
						{saving ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								Saving...
							</>
						) : (
							<>
								<Save className="h-4 w-4 mr-2" />
								Save & Accept
							</>
						)}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
