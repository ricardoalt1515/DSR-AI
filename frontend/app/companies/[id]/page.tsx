"use client";

import {
	ArrowLeft,
	Building2,
	Edit,
	Loader2,
	MapPin,
	MoreVertical,
	Plus,
	Trash2,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
/**
 * Company detail page - Shows company info and locations
 * Combines company details and location management in one view
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CreateCompanyDialog } from "@/components/features/companies/create-company-dialog";
import { CreateLocationDialog } from "@/components/features/locations/create-location-dialog";
import { formatSubsector } from "@/components/shared/forms/compact-sector-select";
import { Breadcrumb } from "@/components/shared/navigation/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useCompanyStore } from "@/lib/stores/company-store";
import { useLocationStore } from "@/lib/stores/location-store";
import type { LocationSummary } from "@/lib/types/company";

export default function CompanyDetailPage() {
	const params = useParams();
	const router = useRouter();
	const companyId = params.id as string;

	const { currentCompany, loading, loadCompany } = useCompanyStore();
	const { locations: allLocations, loadLocationsByCompany, deleteLocation } =
		useLocationStore();

	// Filter locations for current company only (store may have cached data from other companies)
	const locations = useMemo(() =>
		allLocations.filter(loc => loc.companyId === companyId),
		[allLocations, companyId]
	);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [locationToDelete, setLocationToDelete] =
		useState<LocationSummary | null>(null);
	const [deleting, setDeleting] = useState(false);
	const [editCompanyDialogOpen, setEditCompanyDialogOpen] = useState(false);

	useEffect(() => {
		if (companyId) {
			loadCompany(companyId);
			loadLocationsByCompany(companyId);
		}
	}, [companyId, loadCompany, loadLocationsByCompany]);

	// Handle location delete request
	const handleLocationDelete = (
		location: LocationSummary,
		e: React.MouseEvent,
	) => {
		e.stopPropagation();
		setLocationToDelete(location);
		setDeleteDialogOpen(true);
	};

	// Handle confirmed delete
	const handleConfirmDelete = async () => {
		if (!locationToDelete) return;

		setDeleting(true);
		try {
			await deleteLocation(locationToDelete.id);
			toast.success(`Location "${locationToDelete.name}" deleted successfully`);
			setDeleteDialogOpen(false);
			setLocationToDelete(null);
			// Reload company to update location count
			await loadCompany(companyId);
			await loadLocationsByCompany(companyId);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to delete location",
			);
		} finally {
			setDeleting(false);
		}
	};

	if (loading && !currentCompany) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!currentCompany) {
		return (
			<div className="container mx-auto py-8">
				<p className="text-muted-foreground">Company not found</p>
			</div>
		);
	}

	return (
		<div className="container mx-auto py-8 space-y-6">
			{/* Breadcrumb */}
			<Breadcrumb
				items={[
					{ label: "Companies", href: "/companies" },
					{ label: currentCompany.name, icon: Building2 },
				]}
			/>

			{/* Header */}
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" onClick={() => router.back()}>
					<ArrowLeft className="h-5 w-5" />
				</Button>
				<div className="flex-1">
					<h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
						<Building2 className="h-8 w-8" />
						{currentCompany.name}
					</h1>
					<p className="text-muted-foreground mt-1">
						{currentCompany.subsector
							? formatSubsector(currentCompany.subsector)
							: currentCompany.sector}
					</p>
				</div>
				<Badge variant="outline">
					{currentCompany.locationCount ?? 0}{" "}
					{(currentCompany.locationCount ?? 0) === 1 ? "location" : "locations"}
				</Badge>
				<Button onClick={() => setEditCompanyDialogOpen(true)}>
					<Edit className="mr-2 h-4 w-4" />
					Edit Company
				</Button>
			</div>

			{/* Company Info */}
			<Card>
				<CardHeader>
					<CardTitle>Company Information</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Sector/Subsector - only show if not default 'other' */}
					{currentCompany.sector && currentCompany.subsector &&
						currentCompany.sector !== "other" && currentCompany.subsector !== "other" && (
							<>
								<div>
									<p className="text-sm font-medium text-muted-foreground mb-2">
										Business Sector
									</p>
									<div className="flex flex-wrap gap-2">
										<Badge variant="secondary" className="capitalize text-sm">
											{currentCompany.sector}
										</Badge>
										<Badge variant="outline" className="text-sm">
											{currentCompany.subsector.replace(/_/g, " ")}
										</Badge>
									</div>
								</div>
								<Separator />
							</>
						)}

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{currentCompany.contactName && (
							<div>
								<p className="text-sm font-medium text-muted-foreground">
									Contact Name
								</p>
								<p className="text-sm">{currentCompany.contactName}</p>
							</div>
						)}
						{currentCompany.contactEmail && (
							<div>
								<p className="text-sm font-medium text-muted-foreground">
									Email
								</p>
								<p className="text-sm">{currentCompany.contactEmail}</p>
							</div>
						)}
						{currentCompany.contactPhone && (
							<div>
								<p className="text-sm font-medium text-muted-foreground">
									Phone
								</p>
								<p className="text-sm">{currentCompany.contactPhone}</p>
							</div>
						)}
					</div>

					{currentCompany.notes && (
						<>
							<Separator />
							<div>
								<p className="text-sm font-medium text-muted-foreground mb-2">
									Notes
								</p>
								<p className="text-sm whitespace-pre-wrap">
									{currentCompany.notes}
								</p>
							</div>
						</>
					)}

					{currentCompany.tags && currentCompany.tags.length > 0 && (
						<>
							<Separator />
							<div>
								<p className="text-sm font-medium text-muted-foreground mb-2">
									Tags
								</p>
								<div className="flex flex-wrap gap-2">
									{currentCompany.tags.map((tag) => (
										<Badge key={tag} variant="secondary">
											{tag}
										</Badge>
									))}
								</div>
							</div>
						</>
					)}
				</CardContent>
			</Card>

			{/* Locations Section */}
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
						<MapPin className="h-6 w-6" />
						Locations
					</h2>
					<CreateLocationDialog
						companyId={companyId}
						onSuccess={() => {
							loadCompany(companyId);
							loadLocationsByCompany(companyId);
						}}
					/>
				</div>

				{locations.length === 0 ? (
					<Card>
						<CardContent className="py-12 text-center">
							<MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
							<h3 className="text-lg font-semibold mb-2">No locations yet</h3>
							<p className="text-muted-foreground mb-4">
								Add the first location for this company
							</p>
							<CreateLocationDialog
								companyId={companyId}
								trigger={
									<Button>
										<Plus className="mr-2 h-4 w-4" />
										Add First Location
									</Button>
								}
								onSuccess={() => {
									loadCompany(companyId);
									loadLocationsByCompany(companyId);
								}}
							/>
						</CardContent>
					</Card>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{locations.map((location) => (
							<Card
								key={location.id}
								className="group hover:shadow-lg hover:border-primary/50 transition-all"
							>
								<CardHeader className="pb-3">
									<div className="flex items-start justify-between">
										<div
											className="flex-1 cursor-pointer"
											onClick={() =>
												router.push(
													`/companies/${companyId}/locations/${location.id}`,
												)
											}
										>
											<CardTitle className="text-lg group-hover:text-primary transition-colors">
												{location.name}
											</CardTitle>
											<p className="text-sm text-muted-foreground mt-1">
												{location.city}, {location.state}
											</p>
										</div>
										<div className="flex items-center gap-2">
											<Badge
												variant={
													location.projectCount > 0 ? "default" : "outline"
												}
												className="text-xs"
											>
												{location.projectCount}{" "}
												{location.projectCount === 1
													? "waste stream"
													: "waste streams"}
											</Badge>
											<DropdownMenu>
												<DropdownMenuTrigger
													asChild
													onClick={(e) => e.stopPropagation()}
												>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8"
													>
														<MoreVertical className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem
														onClick={(e) => handleLocationDelete(location, e)}
														className="text-destructive focus:text-destructive"
													>
														<Trash2 className="mr-2 h-4 w-4" />
														Delete
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									</div>
								</CardHeader>
								<CardContent className="space-y-3">
									{/* Address */}
									{location.address && (
										<div className="flex items-start gap-2 text-sm text-muted-foreground">
											<MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
											<p>{location.address}</p>
										</div>
									)}

									{/* Quick Actions */}
									<div className="flex gap-2 pt-2">
										<Button
											size="sm"
											variant="outline"
											className="flex-1"
											onClick={() =>
												router.push(
													`/companies/${companyId}/locations/${location.id}`,
												)
											}
										>
											View Details
										</Button>
										<Button
											size="sm"
											className="flex-1"
											onClick={(e) => {
												e.stopPropagation();
												router.push(
													`/companies/${companyId}/locations/${location.id}?action=new-waste-stream`,
												);
											}}
										>
											<Plus className="h-4 w-4 mr-1" />
											New Waste Stream
										</Button>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</div>

			{/* Delete Confirmation Dialog */}
			{locationToDelete && (
				<ConfirmDeleteDialog
					open={deleteDialogOpen}
					onOpenChange={setDeleteDialogOpen}
					onConfirm={handleConfirmDelete}
					title="Delete Location"
					description="This will permanently delete all waste streams associated with this location. This action cannot be undone."
					itemName={locationToDelete.name}
					loading={deleting}
				/>
			)}

			{/* Edit Company Dialog - Reuse CreateCompanyDialog (DRY) */}
			{editCompanyDialogOpen && (
				<CreateCompanyDialog
					companyToEdit={{
						id: currentCompany.id,
						name: currentCompany.name,
						industry: currentCompany.industry,
						sector: currentCompany.sector,
						subsector: currentCompany.subsector,
						...(currentCompany.contactName && {
							contactName: currentCompany.contactName,
						}),
						...(currentCompany.contactEmail && {
							contactEmail: currentCompany.contactEmail,
						}),
						...(currentCompany.contactPhone && {
							contactPhone: currentCompany.contactPhone,
						}),
						...(currentCompany.notes && { notes: currentCompany.notes }),
					}}
					onSuccess={async () => {
						setEditCompanyDialogOpen(false);
						// Reload company data after edit
						await loadCompany(companyId);
					}}
				/>
			)}
		</div>
	);
}
