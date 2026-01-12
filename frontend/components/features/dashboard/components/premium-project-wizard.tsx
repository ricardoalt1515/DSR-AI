"use client";

import {
	ArrowLeft,
	ArrowRight,
	Building2,
	Check,
	ChevronRight,
	FileText,
	MapPin,
	Recycle,
	Sparkles,
	Target,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CompanyCombobox } from "@/components/ui/company-combobox";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationCombobox } from "@/components/ui/location-combobox";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { routes } from "@/lib/routes";
import { useProjectActions } from "@/lib/stores";
import { useCompanyStore } from "@/lib/stores/company-store";
import { useLocationStore } from "@/lib/stores/location-store";
import { cn } from "@/lib/utils";

interface PremiumProjectWizardProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onProjectCreated?: (projectId: string) => void;
	// Contextual creation: pre-fill company/location
	defaultCompanyId?: string;
	defaultLocationId?: string;
}

interface ProjectData {
	name: string;
	client: string;
	companyId: string;
	location: string;
	locationId: string;
	description: string;
}

const STEPS = [
	{ id: 1, title: "Basic Information", description: "Company and location" },
	{ id: 2, title: "Waste Stream Details", description: "Name and description" },
	{ id: 3, title: "Confirmation", description: "Final review" },
];

export function PremiumProjectWizard({
	open,
	onOpenChange,
	onProjectCreated,
	defaultCompanyId,
	defaultLocationId,
}: PremiumProjectWizardProps) {
	const [currentStep, setCurrentStep] = useState(1);
	const [projectData, setProjectData] = useState<ProjectData>({
		name: "",
		client: "",
		companyId: "",
		location: "",
		locationId: "",
		description: "",
	});
	const [isCreating, setIsCreating] = useState(false);
	const [touched, setTouched] = useState<Record<string, boolean>>({});
	const { createProject } = useProjectActions();
	const router = useRouter();
	const { companies, loadCompanies } = useCompanyStore();
	const { locations } = useLocationStore();

	// Load companies when wizard opens (if not already loaded)
	useEffect(() => {
		if (open && companies.length === 0) {
			loadCompanies();
		}
	}, [open, companies.length, loadCompanies]);

	// Initialize with defaults when provided (contextual creation)
	useEffect(() => {
		if (open && defaultCompanyId) {
			const company = companies.find((c) => c.id === defaultCompanyId);
			if (company) {
				setProjectData((prev) => ({
					...prev,
					companyId: defaultCompanyId,
					client: company.name,
				}));

				if (defaultLocationId) {
					const location = locations.find((l) => l.id === defaultLocationId);
					if (location) {
						setProjectData((prev) => ({
							...prev,
							locationId: defaultLocationId,
							location: location.city,
						}));
					}
				}
			}
		}
	}, [open, defaultCompanyId, defaultLocationId, companies, locations]);

	const progress = (currentStep / STEPS.length) * 100;

	// Get contextual names for breadcrumb
	const contextCompany = companies.find((c) => c.id === defaultCompanyId);
	const contextLocation = locations.find((l) => l.id === defaultLocationId);
	const hasContext = defaultCompanyId && defaultLocationId;

	const canContinue = useMemo(() => {
		switch (currentStep) {
			case 1:
				// Step 1: Require company, location, and name
				return (
					projectData.name.trim() !== "" &&
					projectData.companyId !== "" &&
					projectData.locationId !== ""
				);
			case 2:
				// Step 2: Assessment details (description is optional)
				return true;
			case 3:
				// Step 3: Confirmation
				return true;
			default:
				return false;
		}
	}, [currentStep, projectData]);

	const updateProjectData = useCallback((updates: Partial<ProjectData>) => {
		setProjectData((prev) => ({ ...prev, ...updates }));
	}, []);

	const nextStep = useCallback(() => {
		if (canContinue && currentStep < STEPS.length) {
			setCurrentStep((prev) => prev + 1);
		}
	}, [canContinue, currentStep]);

	const prevStep = useCallback(() => {
		if (currentStep > 1) {
			setCurrentStep((prev) => prev - 1);
		}
	}, [currentStep]);

	const handleCreateProject = useCallback(async () => {
		if (!canContinue) return;

		setIsCreating(true);
		try {
			// Only send locationId and name - everything else inherited from Location → Company
			const newProject = await createProject({
				locationId: projectData.locationId,
				name: projectData.name,
				description:
					projectData.description ||
					`Waste assessment for ${projectData.client}`,
			});

			toast.success("Waste stream created successfully!", {
				description: `${projectData.name} is ready to fill out`,
			});

			onProjectCreated?.(newProject.id);
			onOpenChange(false);

			router.push(
				routes.project.technical(newProject.id, { quickstart: true }),
			);

			// Reset form
			setCurrentStep(1);
			setProjectData({
				name: "",
				client: "",
				companyId: "",
				location: "",
				locationId: "",
				description: "",
			});
			setTouched({});
		} catch (_error) {
			toast.error("Error creating waste stream", {
				description: "Please check that the location has an associated company",
			});
		} finally {
			setIsCreating(false);
		}
	}, [
		canContinue,
		projectData,
		createProject,
		onProjectCreated,
		onOpenChange,
		router,
	]);

	const renderStepContent = () => {
		switch (currentStep) {
			case 1:
				return (
					<div className="space-y-6">
						<div className="text-center space-y-2">
							<div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto mb-4">
								<Target className="h-8 w-8 text-primary-foreground" />
							</div>
							<h3 className="text-2xl font-semibold text-foreground">
								Basic Information
							</h3>
							<p className="text-muted-foreground">
								Let&apos;s start with the fundamental project data
							</p>
						</div>

						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="name" className="text-sm font-medium">
									Waste Stream Name *
								</Label>
								<Input
									id="name"
									placeholder="e.g. Wood Waste - January 2024"
									value={projectData.name}
									onChange={(e) => updateProjectData({ name: e.target.value })}
									onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
									className="h-12 text-base"
									autoFocus
								/>
								{touched.name && !projectData.name.trim() && (
									<p className="text-sm text-destructive">
										Waste stream name is required
									</p>
								)}
							</div>

							<div className="space-y-2">
								<Label className="text-sm font-medium">Company *</Label>
								{defaultCompanyId ? (
									<div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border border-border">
										<Building2 className="h-4 w-4 text-muted-foreground" />
										<span className="text-sm">
											{contextCompany?.name || "Loading..."}
										</span>
										<Badge variant="secondary" className="ml-auto text-xs">
											Pre-selected
										</Badge>
									</div>
								) : (
									<>
										<CompanyCombobox
											value={projectData.companyId}
											onValueChange={(id) => {
												// Get company name for legacy field
												const company = useCompanyStore
													.getState()
													.companies.find((c) => c.id === id);
												updateProjectData({
													companyId: id,
													client: company?.name || "",
													locationId: "", // Reset location when company changes
													location: "",
												});
											}}
											placeholder="Select or create company..."
										/>
										{touched.name &&
											projectData.name.trim() &&
											!projectData.companyId && (
												<p className="text-sm text-destructive">
													Please select a company
												</p>
											)}
									</>
								)}
							</div>

							{projectData.companyId && (
								<div className="space-y-2">
									<Label className="text-sm font-medium">Location *</Label>
									{defaultLocationId ? (
										<div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border border-border">
											<MapPin className="h-4 w-4 text-muted-foreground" />
											<span className="text-sm">
												{contextLocation?.name || "Loading..."}
											</span>
											<Badge variant="secondary" className="ml-auto text-xs">
												Pre-selected
											</Badge>
										</div>
									) : (
										<>
											<LocationCombobox
												companyId={projectData.companyId}
												value={projectData.locationId}
												onValueChange={(id) => {
													// Get location city for legacy field
													const location = useLocationStore
														.getState()
														.locations.find((l) => l.id === id);
													updateProjectData({
														locationId: id,
														location: location?.city || "",
													});
												}}
												placeholder="Select or create location..."
											/>
											{touched.name &&
												projectData.name.trim() &&
												projectData.companyId &&
												!projectData.locationId && (
													<p className="text-sm text-destructive">
														Please select a location
													</p>
												)}
										</>
									)}
								</div>
							)}
						</div>
					</div>
				);

			case 2:
				return (
					<div className="space-y-6">
						<div className="text-center space-y-2">
							<div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto mb-4">
								<FileText className="h-8 w-8 text-primary-foreground" />
							</div>
							<h3 className="text-2xl font-semibold text-foreground">
								Waste Stream Details
							</h3>
							<p className="text-muted-foreground">
								Provide additional information about this waste stream
							</p>
						</div>

						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="description" className="text-sm font-medium">
									Description (optional)
								</Label>
								<Input
									id="description"
									placeholder="Additional context about this waste stream..."
									value={projectData.description}
									onChange={(e) =>
										updateProjectData({ description: e.target.value })
									}
									className="h-12 text-base"
									autoFocus
								/>
							</div>
						</div>
					</div>
				);

			case 3:
				return (
					<div className="space-y-6">
						<div className="text-center space-y-2">
							<div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto mb-4">
								<Check className="h-8 w-8 text-white" />
							</div>
							<h3 className="text-2xl font-semibold text-foreground">
								Ready to Create!
							</h3>
							<p className="text-muted-foreground">
								Review the information and confirm project creation
							</p>
						</div>

						<Card className="border border-border/50 bg-card/80 backdrop-blur-sm">
							<CardContent className="p-6 space-y-4">
								<div className="flex items-center gap-3">
									<div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
										<Recycle className="h-6 w-6 text-primary" />
									</div>
									<div>
										<h4 className="font-semibold text-lg text-foreground">
											{projectData.name}
										</h4>
										<p className="text-muted-foreground">
											{projectData.client}
										</p>
									</div>
								</div>

								<Separator />

								<div className="grid grid-cols-2 gap-4 text-sm">
									<div>
										<span className="text-muted-foreground">Company:</span>
										<p className="font-medium text-foreground">
											{projectData.client}
										</p>
									</div>
									<div>
										<span className="text-muted-foreground">Location:</span>
										<p className="font-medium text-foreground">
											{projectData.location}
										</p>
									</div>
									{projectData.description && (
										<div className="col-span-2">
											<span className="text-muted-foreground">
												Description:
											</span>
											<p className="font-medium text-foreground">
												{projectData.description}
											</p>
										</div>
									)}
								</div>

								<div className="mt-6 p-4 rounded-lg border border-success/30 bg-success/10">
									<div className="flex items-center gap-2 text-success">
										<Sparkles className="h-4 w-4" />
										<span className="font-medium text-sm">Next Step</span>
									</div>
									<p className="text-xs text-success mt-1">
										We&apos;ll take you to the technical sheet to start data
										capture
									</p>
								</div>
							</CardContent>
						</Card>
					</div>
				);

			default:
				return null;
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-3xl h-auto max-h-[95vh] p-0 flex flex-col">
				{/* Header with Progress - Fixed at top */}
				<DialogHeader className="p-6 pb-4 shrink-0 border-b border-border/50">
					<div className="space-y-4">
						<DialogTitle className="text-2xl font-bold text-center">
							Create New Waste Stream
						</DialogTitle>

						{/* Contextual Breadcrumb */}
						{hasContext && contextCompany && contextLocation && (
							<div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
								<Building2 className="h-4 w-4" />
								<span>{contextCompany.name}</span>
								<ChevronRight className="h-3 w-3" />
								<MapPin className="h-4 w-4" />
								<span>{contextLocation.name}</span>
							</div>
						)}

						{/* Progress Bar */}
						<div className="space-y-2">
							<div className="flex justify-between text-xs">
								<span className="font-medium text-foreground">
									{STEPS[currentStep - 1]?.title || "Loading..."}
								</span>
								<span className="text-muted-foreground">
									Step {currentStep} of {STEPS.length}
								</span>
							</div>
							<Progress value={progress} className="h-2" />
							<p className="text-xs text-muted-foreground text-center">
								{STEPS[currentStep - 1]?.description || ""}
							</p>
						</div>

						{/* Steps Indicator */}
						<div className="flex justify-center">
							<div className="flex items-center gap-2">
								{STEPS.map((step, index) => (
									<div key={step.id} className="flex items-center">
										<div
											className={cn(
												"w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
												currentStep > step.id
													? "bg-primary text-primary-foreground"
													: currentStep === step.id
														? "bg-primary text-primary-foreground"
														: "bg-muted text-muted-foreground",
											)}
										>
											{currentStep > step.id ? (
												<Check className="h-4 w-4" />
											) : (
												step.id
											)}
										</div>
										{index < STEPS.length - 1 && (
											<ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
										)}
									</div>
								))}
							</div>
						</div>
					</div>
				</DialogHeader>

				{/* Content - Scrollable area */}
				<ScrollArea className="flex-1 overflow-y-auto px-6 py-6">
					<div className="min-h-[400px]">{renderStepContent()}</div>
				</ScrollArea>

				{/* Footer - Fixed at bottom */}
				<div className="shrink-0 p-6 pt-4 border-t border-border bg-background/95 backdrop-blur-sm">
					<div className="flex justify-between gap-4">
						<Button
							variant="outline"
							onClick={prevStep}
							disabled={currentStep === 1}
							className="flex items-center gap-2 min-w-[100px]"
							size="lg"
						>
							<ArrowLeft className="h-4 w-4" />
							Back
						</Button>

						{currentStep < STEPS.length ? (
							<Button
								onClick={nextStep}
								disabled={!canContinue}
								className="flex items-center gap-2 min-w-[120px]"
								size="lg"
							>
								Continue
								<ArrowRight className="h-4 w-4" />
							</Button>
						) : (
							<Button
								onClick={handleCreateProject}
								disabled={!canContinue || isCreating}
								className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/90 min-w-[140px]"
								size="lg"
							>
								{isCreating ? (
									<>Creating...</>
								) : (
									<>
										<Sparkles className="h-4 w-4" />
										Create Project
									</>
								)}
							</Button>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
