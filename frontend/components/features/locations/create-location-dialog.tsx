"use client";

import { Loader2, MapPin } from "lucide-react";
/**
 * CreateLocationDialog - Modal for creating locations
 * Reusable component with minimal props
 */
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/lib/hooks/use-toast";
import { useLocationStore } from "@/lib/stores/location-store";
import type { LocationFormData } from "@/lib/types/company";

interface CreateLocationDialogProps {
	companyId: string;
	onSuccess?: (location: any) => void;
	trigger?: React.ReactNode;
}

export function CreateLocationDialog({
	companyId,
	onSuccess,
	trigger,
}: CreateLocationDialogProps) {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const { createLocation } = useLocationStore();
	const { toast } = useToast();

	const [formData, setFormData] = useState<LocationFormData>({
		name: "",
		city: "",
		state: "",
		address: "",
		notes: "",
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			console.log("[CreateLocationDialog] Creating location with data:", {
				companyId,
				formData,
			});
			const location = await createLocation(companyId, {
				...formData,
				companyId,
			});
			console.log(
				"[CreateLocationDialog] Location created successfully:",
				location,
			);

			toast({
				title: "Location created",
				description: `${formData.name} has been created successfully.`,
			});
			setOpen(false);
			setFormData({
				name: "",
				city: "",
				state: "",
				address: "",
				notes: "",
			});

			console.log("[CreateLocationDialog] Calling onSuccess callback");
			onSuccess?.(location);
		} catch (error) {
			console.error("[CreateLocationDialog] Error creating location:", error);
			toast({
				title: "Error",
				description:
					error instanceof Error ? error.message : "Failed to create location",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

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
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Create New Location</DialogTitle>
						<DialogDescription>
							Add a new location/site for this company.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						{/* Location Name */}
						<div className="grid gap-2">
							<Label htmlFor="name">
								Location Name <span className="text-destructive">*</span>
							</Label>
							<Input
								id="name"
								value={formData.name}
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
								placeholder="Planta Guadalajara"
								required
							/>
						</div>

						{/* City & State */}
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="city">
									City <span className="text-destructive">*</span>
								</Label>
								<Input
									id="city"
									value={formData.city}
									onChange={(e) =>
										setFormData({ ...formData, city: e.target.value })
									}
									placeholder="Guadalajara"
									required
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="state">
									State <span className="text-destructive">*</span>
								</Label>
								<Input
									id="state"
									value={formData.state}
									onChange={(e) =>
										setFormData({ ...formData, state: e.target.value })
									}
									placeholder="Jalisco"
									required
								/>
							</div>
						</div>

						{/* Address */}
						<div className="grid gap-2">
							<Label htmlFor="address">Address</Label>
							<Input
								id="address"
								value={formData.address}
								onChange={(e) =>
									setFormData({ ...formData, address: e.target.value })
								}
								placeholder="Av. Industrial 123"
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

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={loading}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={loading}>
							{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Create Location
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
