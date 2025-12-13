"use client";

import { ArrowLeft, ArrowRight, Building2 } from "lucide-react";
/**
 * CreateCompanyDialog - Modal for creating or editing a company
 * Dual-mode component (DRY): handles both create and edit operations
 */
import { useEffect, useState } from "react";
import { SectorSelector } from "@/components/shared/forms/sector-selector";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
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
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/lib/hooks/use-toast";
import type { Sector, Subsector } from "@/lib/sectors-config";
import { useCompanyStore } from "@/lib/stores/company-store";
import type { CompanyFormData } from "@/lib/types/company";

interface CreateCompanyDialogProps {
	onSuccess?: (company: any) => void;
	trigger?: React.ReactNode;
	// Edit mode: provide existing company data
	companyToEdit?: {
		id: string;
		name: string;
		industry: string;
		sector: Sector;
		subsector: Subsector;
		contactName?: string;
		contactEmail?: string;
		contactPhone?: string;
		notes?: string;
	};
}

export function CreateCompanyDialog({
	onSuccess,
	trigger,
	companyToEdit,
}: CreateCompanyDialogProps) {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [currentStep, setCurrentStep] = useState<1 | 2>(1);
	const { createCompany, updateCompany } = useCompanyStore();
	const isEditMode = !!companyToEdit;
	const { toast } = useToast();

	const [formData, setFormData] = useState<CompanyFormData>({
		name: "",
		industry: "",
		sector: "" as Sector,
		subsector: "" as Subsector,
		contactName: "",
		contactEmail: "",
		contactPhone: "",
		notes: "",
	});

	// Populate form data when editing
	useEffect(() => {
		if (companyToEdit) {
			setFormData({
				name: companyToEdit.name,
				industry: companyToEdit.industry,
				sector: companyToEdit.sector,
				subsector: companyToEdit.subsector,
				contactName: companyToEdit.contactName || "",
				contactEmail: companyToEdit.contactEmail || "",
				contactPhone: companyToEdit.contactPhone || "",
				notes: companyToEdit.notes || "",
			});
			// Start at step 1 for edit
			setCurrentStep(1);
		}
	}, [companyToEdit]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			// Auto-fill industry from sector if empty
			const dataToSubmit = {
				...formData,
				industry:
					formData.industry ||
					formData.sector.charAt(0).toUpperCase() + formData.sector.slice(1),
			};

			let company;
			if (isEditMode) {
				// Update existing company
				company = await updateCompany(companyToEdit.id, dataToSubmit);
				toast({
					title: "Company updated",
					description: `${formData.name} has been updated successfully.`,
				});
			} else {
				// Create new company
				company = await createCompany(dataToSubmit);
				toast({
					title: "Company created",
					description: `${formData.name} has been created successfully.`,
				});
			}

			setOpen(false);
			setFormData({
				name: "",
				industry: "",
				sector: "" as Sector,
				subsector: "" as Subsector,
				contactName: "",
				contactEmail: "",
				contactPhone: "",
				notes: "",
			});
			setCurrentStep(1);
			onSuccess?.(company);
		} catch (error) {
			toast({
				title: "Error",
				description:
					error instanceof Error ? error.message : "Failed to create company",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	// Handle dialog close
	const handleCancel = () => {
		if (isEditMode) {
			// In edit mode, notify parent to close
			onSuccess?.(null);
		} else {
			setOpen(false);
		}
		// Reset to step 1
		setCurrentStep(1);
	};

	// For edit mode, use external open control
	const dialogOpen = isEditMode ? companyToEdit !== undefined : open;
	const handleOpenChange = (newOpen: boolean) => {
		if (!newOpen) {
			handleCancel();
		} else if (!isEditMode) {
			setOpen(newOpen);
		}
	};

	return (
		<Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
			{!isEditMode && (
				<DialogTrigger asChild>
					{trigger ? (
						trigger
					) : (
						<Button>
							<Building2 className="mr-2 h-4 w-4" />
							New Company
						</Button>
					)}
				</DialogTrigger>
			)}

			<DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>
							{isEditMode ? "Edit Company" : "Create New Company"}
							<span className="text-sm font-normal text-muted-foreground ml-2">
								Step {currentStep} of 2
							</span>
						</DialogTitle>
						<DialogDescription>
							{currentStep === 1
								? isEditMode
									? "Update company information"
									: "Add basic company information"
								: "Select the company's business sector"}
						</DialogDescription>
						<Progress value={(currentStep / 2) * 100} className="mt-2" />
					</DialogHeader>

					<div className="py-4">
						{/* Step 1: Basic Information */}
						{currentStep === 1 && (
							<div className="grid gap-4">
								{/* Company Name */}
								<div className="grid gap-2">
									<Label htmlFor="name">
										Company Name <span className="text-destructive">*</span>
									</Label>
									<Input
										id="name"
										value={formData.name}
										onChange={(e) =>
											setFormData({ ...formData, name: e.target.value })
										}
										placeholder="Honda Manufacturing"
										required
									/>
								</div>

								{/* Industry (optional - auto-filled from sector) */}
								<div className="grid gap-2">
									<Label htmlFor="industry">
										Industry{" "}
										<span className="text-xs text-muted-foreground">
											(optional)
										</span>
									</Label>
									<Input
										id="industry"
										value={formData.industry}
										onChange={(e) =>
											setFormData({ ...formData, industry: e.target.value })
										}
										placeholder="e.g., Automotive Manufacturing, Food Processing"
									/>
									<p className="text-xs text-muted-foreground">
										Will be auto-filled from sector if left empty
									</p>
								</div>

								{/* Contact Name */}
								<div className="grid gap-2">
									<Label htmlFor="contactName">Contact Name</Label>
									<Input
										id="contactName"
										value={formData.contactName}
										onChange={(e) =>
											setFormData({ ...formData, contactName: e.target.value })
										}
										placeholder="Juan Pérez"
									/>
								</div>

								{/* Contact Email */}
								<div className="grid gap-2">
									<Label htmlFor="contactEmail">Contact Email</Label>
									<Input
										id="contactEmail"
										type="email"
										value={formData.contactEmail}
										onChange={(e) =>
											setFormData({ ...formData, contactEmail: e.target.value })
										}
										placeholder="[email protected]"
									/>
								</div>

								{/* Contact Phone */}
								<div className="grid gap-2">
									<Label htmlFor="contactPhone">Contact Phone</Label>
									<Input
										id="contactPhone"
										value={formData.contactPhone}
										onChange={(e) =>
											setFormData({ ...formData, contactPhone: e.target.value })
										}
										placeholder="+52 33 1234 5678"
									/>
								</div>

								{/* Notes */}
								<div className="grid gap-2">
									<Label htmlFor="notes">Notes</Label>
									<Textarea
										id="notes"
										value={formData.notes}
										onChange={(e) =>
											setFormData({ ...formData, notes: e.target.value })
										}
										placeholder="Additional information..."
										rows={3}
									/>
								</div>
							</div>
						)}

						{/* Step 2: Sector Selection */}
						{currentStep === 2 && (
							<div className="space-y-4">
								<SectorSelector
									sector={formData.sector}
									subsector={formData.subsector}
									onSectorChange={(sector) =>
										setFormData((prev) => ({ ...prev, sector }))
									}
									onSubsectorChange={(subsector) =>
										setFormData((prev) => ({ ...prev, subsector }))
									}
								/>
							</div>
						)}
					</div>

					<DialogFooter className="gap-2">
						{/* Cancel / Back button */}
						{currentStep === 1 ? (
							<Button
								type="button"
								variant="outline"
								onClick={handleCancel}
								disabled={loading}
							>
								Cancel
							</Button>
						) : (
							<Button
								type="button"
								variant="outline"
								onClick={() => setCurrentStep(1)}
								disabled={loading}
							>
								<ArrowLeft className="mr-2 h-4 w-4" />
								Back
							</Button>
						)}

						{/* Next / Save buttons */}
						{currentStep === 1 ? (
							<>
								{isEditMode && (
									<LoadingButton
										type="submit"
										loading={loading}
										disabled={!formData.name}
										variant="secondary"
									>
										Save Changes
									</LoadingButton>
								)}
								<Button
									type="button"
									onClick={() => setCurrentStep(2)}
									disabled={!formData.name}
								>
									{isEditMode ? "Edit" : "Next:"} Sector
									<ArrowRight className="ml-2 h-4 w-4" />
								</Button>
							</>
						) : (
							<LoadingButton
								type="submit"
								loading={loading}
								disabled={
									!isEditMode && (!formData.sector || !formData.subsector)
								}
							>
								{isEditMode ? "Update Company" : "Create Company"}
							</LoadingButton>
						)}
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
