"use client";

import {
	ArrowLeft,
	Building2,
	FolderKanban,
	Loader2,
	MapPin,
	Plus,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useParams, useRouter, useSearchParams } from "next/navigation";
/**
 * Location detail page - Shows location info and projects
 */
import { useEffect, useState } from "react";

const PremiumProjectWizard = dynamic(
	() =>
		import(
			"@/components/features/dashboard/components/premium-project-wizard"
		).then((mod) => mod.PremiumProjectWizard),
	{ ssr: false, loading: () => null },
);

import { LocationContactsCard } from "@/components/features/locations/location-contacts-card";
import { Breadcrumb } from "@/components/shared/navigation/breadcrumb";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/contexts/auth-context";
import { useLocationStore } from "@/lib/stores/location-store";

export default function LocationDetailPage() {
	const params = useParams();
	const router = useRouter();
	const searchParams = useSearchParams();
	const companyId = params.id as string;
	const locationId = params.locationId as string;
	const [wizardOpen, setWizardOpen] = useState(false);
	const { canWriteLocationContacts } = useAuth();

	const { currentLocation, loading, loadLocation, error, clearError } =
		useLocationStore();

	useEffect(() => {
		if (locationId) {
			void loadLocation(locationId).catch(() => {});
		}
	}, [locationId, loadLocation]);

	// Auto-open wizard if action=new-assessment query param
	useEffect(() => {
		if (searchParams.get("action") === "new-assessment") {
			setWizardOpen(true);
			// Clean URL after opening wizard
			router.replace(`/companies/${companyId}/locations/${locationId}`);
		}
	}, [searchParams, companyId, locationId, router]);

	if (loading && !currentLocation) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (error && !currentLocation) {
		return (
			<div className="container mx-auto py-8">
				<Alert variant="destructive">
					<AlertTitle>Could not load location</AlertTitle>
					<AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<p className="text-sm text-muted-foreground">{error}</p>
						<Button
							variant="outline"
							onClick={() => {
								clearError();
								void loadLocation(locationId).catch(() => {});
							}}
						>
							Retry
						</Button>
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	if (!currentLocation) {
		return (
			<div className="container mx-auto py-8">
				<p className="text-muted-foreground">Location not found</p>
			</div>
		);
	}

	return (
		<div className="container mx-auto py-8 space-y-6">
			{/* Breadcrumb */}
			<Breadcrumb
				items={[
					{ label: "Companies", href: "/companies" },
					{
						label: currentLocation.company?.name || "Company",
						href: `/companies/${companyId}`,
						icon: Building2,
					},
					{ label: currentLocation.name, icon: MapPin },
				]}
			/>

			{error && (
				<Alert variant="destructive">
					<AlertTitle>Some data may be out of date</AlertTitle>
					<AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<p className="text-sm text-muted-foreground">{error}</p>
						<Button
							variant="outline"
							onClick={() => {
								clearError();
								void loadLocation(locationId).catch(() => {});
							}}
						>
							Retry
						</Button>
					</AlertDescription>
				</Alert>
			)}

			{/* Header */}
			<div className="flex items-center gap-4">
				<Button
					variant="ghost"
					size="icon"
					aria-label="Go back"
					onClick={() => router.back()}
				>
					<ArrowLeft className="h-5 w-5" />
				</Button>
				<div className="flex-1">
					<h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
						<MapPin className="h-8 w-8" />
						{currentLocation.name}
					</h1>
					<p className="text-muted-foreground mt-1">
						{currentLocation.city}, {currentLocation.state}
					</p>
				</div>
				<Badge variant="outline">
					{currentLocation.projectCount}{" "}
					{currentLocation.projectCount === 1
						? "waste stream"
						: "waste streams"}
				</Badge>
			</div>

			{/* Location Info */}
			<Card>
				<CardHeader>
					<CardTitle>Location Information</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<p className="text-sm font-medium text-muted-foreground">
								Full Address
							</p>
							<p className="text-sm">{currentLocation.fullAddress}</p>
						</div>
						{currentLocation.company && (
							<div>
								<p className="text-sm font-medium text-muted-foreground">
									Company
								</p>
								<p className="text-sm">{currentLocation.company.name}</p>
							</div>
						)}
					</div>

					{currentLocation.notes && (
						<>
							<Separator />
							<div>
								<p className="text-sm font-medium text-muted-foreground mb-2">
									Notes
								</p>
								<p className="text-sm whitespace-pre-wrap">
									{currentLocation.notes}
								</p>
							</div>
						</>
					)}
				</CardContent>
			</Card>

			<LocationContactsCard
				contacts={currentLocation.contacts ?? []}
				locationId={locationId}
				canWriteContacts={canWriteLocationContacts}
				onContactsUpdated={() => loadLocation(locationId)}
			/>

			{/* Projects Section */}
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="text-xl font-semibold flex items-center gap-2">
						<FolderKanban className="h-5 w-5" />
						Waste Streams
					</h2>
					<Button onClick={() => setWizardOpen(true)}>
						<Plus className="h-4 w-4 mr-2" />
						New Waste Stream
					</Button>
				</div>

				{!currentLocation.projects || currentLocation.projects.length === 0 ? (
					<Card>
						<CardContent className="py-12 text-center">
							<FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
							<h3 className="text-lg font-semibold mb-2">
								No waste streams yet
							</h3>
							<p className="text-muted-foreground mb-4">
								Create the first waste stream for this location
							</p>
							<Button onClick={() => setWizardOpen(true)}>
								<Plus className="h-4 w-4 mr-2" />
								Create First Waste Stream
							</Button>
						</CardContent>
					</Card>
				) : (
					<div className="grid grid-cols-1 gap-4">
						{currentLocation.projects.map((project) => (
							<Card
								key={project.id}
								className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-[box-shadow,border-color]"
								onClick={() => router.push(`/project/${project.id}`)}
							>
								<CardHeader>
									<div className="flex items-start justify-between">
										<CardTitle className="text-lg">{project.name}</CardTitle>
										<Badge>{project.status}</Badge>
									</div>
								</CardHeader>
								<CardContent>
									<p className="text-sm text-muted-foreground">
										Created {new Date(project.createdAt).toLocaleDateString()}
									</p>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</div>

			{/* Contextual Wizard */}
			<PremiumProjectWizard
				open={wizardOpen}
				onOpenChange={setWizardOpen}
				defaultCompanyId={companyId}
				defaultLocationId={locationId}
				onProjectCreated={async (projectId) => {
					// Reload location to show new assessment
					try {
						await loadLocation(locationId);
					} catch {
						// Location store already captures error state for the UI
					}
					// Then navigate to project
					router.push(`/project/${projectId}`);
				}}
			/>
		</div>
	);
}
