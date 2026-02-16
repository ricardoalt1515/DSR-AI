"use client";

import {
	Archive,
	ArrowLeft,
	Building2,
	FileUp,
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ImportDrawer } from "@/components/features/bulk-import/import-drawer";
import { ImportReviewSection } from "@/components/features/bulk-import/import-review-section";
import { InlineImportProgress } from "@/components/features/bulk-import/inline-import-progress";

const PremiumProjectWizard = dynamic(
	() =>
		import(
			"@/components/features/dashboard/components/premium-project-wizard"
		).then((mod) => mod.PremiumProjectWizard),
	{ ssr: false, loading: () => null },
);

import { IncomingMaterialsCard } from "@/components/features/locations/incoming-materials-card";
import { LocationContactsCard } from "@/components/features/locations/location-contacts-card";
import { ArchivedBanner } from "@/components/shared/archived-banner";
import { Breadcrumb } from "@/components/shared/navigation/breadcrumb";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmArchiveDialog } from "@/components/ui/confirm-archive-dialog";
import { ConfirmPurgeDialog } from "@/components/ui/confirm-purge-dialog";
import { ConfirmRestoreDialog } from "@/components/ui/confirm-restore-dialog";
import { Separator } from "@/components/ui/separator";
import type { BulkImportRun } from "@/lib/api/bulk-import";
import { bulkImportAPI } from "@/lib/api/bulk-import";
import type { ArchivedFilter } from "@/lib/api/companies";
import { useAuth } from "@/lib/contexts/auth-context";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useLocationStore } from "@/lib/stores/location-store";

export default function LocationDetailPage() {
	const params = useParams();
	const router = useRouter();
	const searchParams = useSearchParams();
	const companyId = params.id as string;
	const locationId = params.locationId as string;
	const [wizardOpen, setWizardOpen] = useState(false);
	const { canWriteLocationContacts, canCreateClientData, user } = useAuth();
	const { canArchiveLocation, canRestoreLocation, canPurgeLocation } =
		usePermissions();
	const canCreateProject = Boolean(canCreateClientData);
	const canDeleteContacts = Boolean(
		user?.isSuperuser || user?.role === "org_admin",
	);

	const {
		currentLocation,
		loading,
		loadLocation,
		archiveLocation,
		restoreLocation,
		purgeLocation,
		error,
		clearError,
	} = useLocationStore();

	// Archive dialog states
	const [showArchiveDialog, setShowArchiveDialog] = useState(false);
	const [showRestoreDialog, setShowRestoreDialog] = useState(false);
	const [showPurgeDialog, setShowPurgeDialog] = useState(false);
	const [isArchiving, setIsArchiving] = useState(false);
	const [isRestoring, setIsRestoring] = useState(false);
	const [isPurging, setIsPurging] = useState(false);
	const [projectsFilter, setProjectsFilter] =
		useState<ArchivedFilter>("active");

	// Bulk import state
	const [showImportDrawer, setShowImportDrawer] = useState(false);
	const [activeImportRun, setActiveImportRun] = useState<BulkImportRun | null>(
		null,
	);
	const [showReviewSection, setShowReviewSection] = useState(false);
	const [dragActive, setDragActive] = useState(false);
	const dragCounterRef = useRef(0);
	const [inlineRunId, setInlineRunId] = useState<string | null>(null);
	const [inlineFilename, setInlineFilename] = useState<string | null>(null);

	const isArchived = Boolean(currentLocation?.archivedAt);

	useEffect(() => {
		if (locationId) {
			void loadLocation(locationId, projectsFilter).catch(() => { });
		}
	}, [locationId, loadLocation, projectsFilter]);

	useEffect(() => {
		if (isArchived && projectsFilter === "active") {
			setProjectsFilter("archived");
			return;
		}
		if (!isArchived && projectsFilter !== "active") {
			setProjectsFilter("active");
		}
	}, [isArchived, projectsFilter]);

	// Auto-open wizard if action=new-assessment query param
	useEffect(() => {
		const action = searchParams.get("action");
		if (action === "new-assessment" || action === "new-waste-stream") {
			setWizardOpen(true);
			// Clean URL after opening wizard
			router.replace(`/companies/${companyId}/locations/${locationId}`);
		}
	}, [searchParams, companyId, locationId, router]);

	// Auto-resume pending import
	useEffect(() => {
		if (!locationId || !canCreateClientData || isArchived) return;
		let cancelled = false;
		bulkImportAPI
			.getPendingRun("location", locationId)
			.then((run) => {
				if (!cancelled && run) {
					setActiveImportRun(run);
					setShowReviewSection(true);
				}
			})
			.catch(() => {
				/* silent */
			});
		return () => {
			cancelled = true;
		};
	}, [locationId, canCreateClientData, isArchived]);

	// Drag & drop handlers
	const handleDragEnter = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		dragCounterRef.current += 1;
		if (dragCounterRef.current === 1) setDragActive(true);
	}, []);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		dragCounterRef.current -= 1;
		if (dragCounterRef.current === 0) setDragActive(false);
	}, []);

	const handleDrop = useCallback(
		async (e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setDragActive(false);
			dragCounterRef.current = 0;
			const file = e.dataTransfer.files?.[0];
			if (
				file &&
				canCreateClientData &&
				!isArchived &&
				!showReviewSection &&
				!inlineRunId
			) {
				try {
					setInlineFilename(file.name);
					const result = await bulkImportAPI.upload(
						file,
						"location",
						locationId,
					);
					setInlineRunId(result.runId);
				} catch (error) {
					toast.error(error instanceof Error ? error.message : "Upload failed");
					setInlineFilename(null);
				}
			}
		},
		[
			canCreateClientData,
			isArchived,
			showReviewSection,
			inlineRunId,
			locationId,
		],
	);

	const reloadLocationData = useCallback(async () => {
		await loadLocation(locationId, projectsFilter);
	}, [locationId, projectsFilter, loadLocation]);

	const locationContext = useMemo(() => {
		if (!currentLocation) return undefined;
		return { id: currentLocation.id, name: currentLocation.name };
	}, [currentLocation]);

	const handleArchive = async () => {
		setIsArchiving(true);
		try {
			await archiveLocation(locationId);
			toast.success("Location archived", {
				description: `"${currentLocation?.name}" has been archived`,
			});
			setShowArchiveDialog(false);
		} catch (_error) {
			toast.error("Archive failed", {
				description: "The location could not be archived. Please try again.",
			});
		} finally {
			setIsArchiving(false);
		}
	};

	const handleRestore = async () => {
		setIsRestoring(true);
		try {
			await restoreLocation(locationId);
			toast.success("Location restored", {
				description: `"${currentLocation?.name}" has been restored`,
			});
			setShowRestoreDialog(false);
		} catch (_error) {
			toast.error("Restore failed", {
				description: "The location could not be restored. Please try again.",
			});
		} finally {
			setIsRestoring(false);
		}
	};

	const handlePurge = async () => {
		if (!currentLocation) return;
		setIsPurging(true);
		try {
			await purgeLocation(locationId, currentLocation.name);
			toast.success("Location permanently deleted", {
				description: `"${currentLocation.name}" has been permanently deleted`,
			});
			router.push(`/companies/${companyId}`);
		} catch (_error) {
			toast.error("Purge failed", {
				description:
					"The location could not be permanently deleted. Please try again.",
			});
			setIsPurging(false);
		}
	};

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
								void loadLocation(locationId, projectsFilter).catch(() => { });
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
		/* biome-ignore lint/a11y/noStaticElementInteractions: page-level drag-and-drop target */
		<div
			className="container mx-auto py-8 space-y-6 relative"
			onDragEnter={handleDragEnter}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			{/* Glassmorphic drag overlay */}
			{dragActive &&
				canCreateClientData &&
				!isArchived &&
				!showReviewSection &&
				!inlineRunId && (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md animate-in fade-in duration-200">
						<div className="flex flex-col items-center gap-5 p-12 rounded-2xl bg-card/80 backdrop-blur-xl border border-primary/20 shadow-2xl animate-in zoom-in-95 duration-200">
							<div className="p-5 rounded-full bg-primary/10 shadow-[0_0_40px_hsl(var(--primary)/0.15)]">
								<FileUp className="h-10 w-10 text-primary animate-bounce" />
							</div>
							<div className="text-center space-y-2">
								<p className="text-xl font-semibold tracking-tight">
									Drop to import
								</p>
								<div className="flex gap-2 justify-center">
									<Badge variant="secondary">.xlsx</Badge>
									<Badge variant="secondary">.pdf</Badge>
									<Badge variant="secondary">.docx</Badge>
								</div>
							</div>
						</div>
					</div>
				)}
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

			{/* Archived Banner */}
			{isArchived && currentLocation.archivedAt && (
				<ArchivedBanner
					entityType="location"
					entityName={currentLocation.name}
					archivedAt={currentLocation.archivedAt}
					canRestore={canRestoreLocation()}
					canPurge={canPurgeLocation()}
					onRestore={() => setShowRestoreDialog(true)}
					onPurge={() => setShowPurgeDialog(true)}
					loading={isRestoring || isPurging}
				/>
			)}

			{error && (
				<Alert variant="destructive">
					<AlertTitle>Some data may be out of date</AlertTitle>
					<AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<p className="text-sm text-muted-foreground">{error}</p>
						<Button
							variant="outline"
							onClick={() => {
								clearError();
								void loadLocation(locationId, projectsFilter).catch(() => { });
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
					<div className="flex items-center gap-3">
						<h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
							<MapPin className="h-8 w-8" />
							{currentLocation.name}
						</h1>
						{isArchived && (
							<Badge
								variant="outline"
								className="border-amber-500 text-amber-500"
							>
								Archived
							</Badge>
						)}
					</div>
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
				{!isArchived && canArchiveLocation() && (
					<Button
						variant="outline"
						onClick={() => setShowArchiveDialog(true)}
						className="text-amber-600 border-amber-600 hover:bg-amber-50"
					>
						<Archive className="mr-2 h-4 w-4" />
						Archive
					</Button>
				)}
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
				canWriteContacts={canWriteLocationContacts && !isArchived}
				canDeleteContacts={canDeleteContacts && !isArchived}
				onContactsUpdated={() => loadLocation(locationId, projectsFilter)}
			/>

			<IncomingMaterialsCard
				materials={currentLocation.incomingMaterials ?? []}
				locationId={locationId}
				canWriteMaterials={canWriteLocationContacts && !isArchived}
				canDeleteMaterials={canDeleteContacts && !isArchived}
				onMaterialsUpdated={() => loadLocation(locationId, projectsFilter)}
			/>

			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="text-xl font-semibold flex items-center gap-2">
						<FolderKanban className="h-5 w-5" />
						Waste Streams
					</h2>
					{canCreateProject && !isArchived && (
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								disabled={showReviewSection || !!inlineRunId}
								onClick={() => setShowImportDrawer(true)}
							>
								<FileUp className="h-4 w-4 mr-2" />
								Import from Document
							</Button>
							<Button onClick={() => setWizardOpen(true)}>
								<Plus className="h-4 w-4 mr-2" />
								New Waste Stream
							</Button>
						</div>
					)}
				</div>

				{!currentLocation.projects || currentLocation.projects.length === 0 ? (
					<Card>
						<CardContent className="py-12 text-center">
							<FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
							<h3 className="text-lg font-semibold mb-2">
								No waste streams yet
							</h3>
							<p className="text-muted-foreground mb-4">
								{isArchived
									? "This location is archived"
									: "Create the first waste stream for this location"}
							</p>
							{canCreateProject && !isArchived && (
								<Button onClick={() => setWizardOpen(true)}>
									<Plus className="h-4 w-4 mr-2" />
									Create First Waste Stream
								</Button>
							)}
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

			{/* Archive/Restore/Purge Dialogs */}
			<ConfirmArchiveDialog
				open={showArchiveDialog}
				onOpenChange={setShowArchiveDialog}
				onConfirm={handleArchive}
				entityType="location"
				entityName={currentLocation.name}
				loading={isArchiving}
			/>

			<ConfirmRestoreDialog
				open={showRestoreDialog}
				onOpenChange={setShowRestoreDialog}
				onConfirm={handleRestore}
				entityType="location"
				entityName={currentLocation.name}
				loading={isRestoring}
			/>

			<ConfirmPurgeDialog
				open={showPurgeDialog}
				onOpenChange={setShowPurgeDialog}
				onConfirm={handlePurge}
				entityType="location"
				entityName={currentLocation.name}
				loading={isPurging}
			/>

			{/* Inline import progress (drag & drop flow) */}
			{inlineRunId && inlineFilename && !showReviewSection && (
				<InlineImportProgress
					runId={inlineRunId}
					filename={inlineFilename}
					onComplete={(run) => {
						setInlineRunId(null);
						setInlineFilename(null);
						setActiveImportRun(run);
						setShowReviewSection(true);
					}}
					onFailed={(error) => {
						toast.error("Import failed", { description: error });
					}}
					onNoData={() => {
						toast.info("No data found in your file. Try another one.");
						setInlineRunId(null);
						setInlineFilename(null);
					}}
					onDismiss={() => {
						setInlineRunId(null);
						setInlineFilename(null);
					}}
				/>
			)}

			{/* Import Review Section */}
			{showReviewSection && activeImportRun && (
				<ImportReviewSection
					run={activeImportRun}
					reviewMode="location"
					locationContext={locationContext}
					onRunUpdated={setActiveImportRun}
					onFinalized={() => {
						setShowReviewSection(false);
						setActiveImportRun(null);
						void reloadLocationData().catch(() => { });
					}}
					onDismiss={() => {
						setShowReviewSection(false);
						setActiveImportRun(null);
					}}
				/>
			)}

			{/* Contextual Wizard */}
			{!isArchived && (
				<PremiumProjectWizard
					open={wizardOpen}
					onOpenChange={setWizardOpen}
					defaultCompanyId={companyId}
					defaultLocationId={locationId}
					onProjectCreated={async (projectId) => {
						try {
							await loadLocation(locationId, projectsFilter);
						} catch {
							// Location store already captures error state for the UI
						}
						router.push(`/project/${projectId}`);
					}}
				/>
			)}

			{/* Import Drawer (button-triggered flow) */}
			<ImportDrawer
				open={showImportDrawer}
				onOpenChange={setShowImportDrawer}
				entrypointId={locationId}
				entrypointType="location"
				onReviewReady={(run) => {
					setActiveImportRun(run);
					setShowReviewSection(true);
				}}
			/>
		</div>
	);
}
