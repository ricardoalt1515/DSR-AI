"use client";

import { useRouter } from "next/navigation";
import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	BasicInfoStep,
	ConfirmationStep,
	WasteStreamDetailsStep,
	WizardFooter,
	WizardHeader,
	type WizardProjectData,
	type WizardStep,
	type WizardTouched,
} from "@/components/features/dashboard/components/premium-project-wizard-sections";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { routes } from "@/lib/routes";
import { useProjectActions } from "@/lib/stores";
import { useCompanyStore } from "@/lib/stores/company-store";
import { useLocationStore } from "@/lib/stores/location-store";

interface PremiumProjectWizardProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onProjectCreated?: (projectId: string) => void;
	// Contextual creation: pre-fill company/location
	defaultCompanyId?: string;
	defaultLocationId?: string;
}

const STEPS: WizardStep[] = [
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
}: PremiumProjectWizardProps): ReactElement {
	const [currentStep, setCurrentStep] = useState(1);
	const [projectData, setProjectData] = useState<WizardProjectData>({
		name: "",
		client: "",
		companyId: "",
		location: "",
		locationId: "",
		description: "",
	});
	const [isCreating, setIsCreating] = useState(false);
	const [touched, setTouched] = useState<WizardTouched>({});
	const { createProject } = useProjectActions();
	const router = useRouter();
	const { companies, loadCompanies } = useCompanyStore();
	const { locations } = useLocationStore();

	// Load companies when wizard opens (if not already loaded)
	useEffect(
		function loadCompaniesOnOpen() {
			if (open && companies.length === 0) {
				loadCompanies();
			}
		},
		[open, companies.length, loadCompanies],
	);

	// Initialize with defaults when provided (contextual creation)
	useEffect(
		function syncDefaults() {
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
		},
		[open, defaultCompanyId, defaultLocationId, companies, locations],
	);

	const progress = (currentStep / STEPS.length) * 100;

	// Get contextual names for breadcrumb
	const contextCompany = companies.find(
		(company) => company.id === defaultCompanyId,
	);
	const contextLocation = locations.find(
		(location) => location.id === defaultLocationId,
	);
	const hasContext = Boolean(defaultCompanyId && defaultLocationId);

	const canContinue = useMemo(
		function canContinue() {
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
		},
		[currentStep, projectData],
	);

	const updateProjectData = useCallback(function updateProjectData(
		updates: Partial<WizardProjectData>,
	) {
		setProjectData((prev) => ({ ...prev, ...updates }));
	}, []);

	const nextStep = useCallback(
		function nextStep() {
			if (canContinue && currentStep < STEPS.length) {
				setCurrentStep((prev) => prev + 1);
			}
		},
		[canContinue, currentStep],
	);

	const prevStep = useCallback(
		function prevStep() {
			if (currentStep > 1) {
				setCurrentStep((prev) => prev - 1);
			}
		},
		[currentStep],
	);

	const handleCreateProject = useCallback(
		async function handleCreateProject() {
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
					description:
						"Please check that the location has an associated company",
				});
			} finally {
				setIsCreating(false);
			}
		},
		[
			canContinue,
			projectData,
			createProject,
			onProjectCreated,
			onOpenChange,
			router,
		],
	);

	function renderStepContent(): ReactElement | null {
		switch (currentStep) {
			case 1:
				return (
					<BasicInfoStep
						projectData={projectData}
						updateProjectData={updateProjectData}
						touched={touched}
						setTouched={setTouched}
						defaultCompanyId={defaultCompanyId}
						defaultLocationId={defaultLocationId}
						contextCompanyName={contextCompany?.name}
						contextLocationName={contextLocation?.name}
					/>
				);
			case 2:
				return (
					<WasteStreamDetailsStep
						projectData={projectData}
						updateProjectData={updateProjectData}
					/>
				);
			case 3:
				return <ConfirmationStep projectData={projectData} />;
			default:
				return null;
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-3xl h-auto max-h-[95vh] p-0 flex flex-col">
				<WizardHeader
					steps={STEPS}
					currentStep={currentStep}
					progress={progress}
					hasContext={hasContext}
					contextCompanyName={contextCompany?.name}
					contextLocationName={contextLocation?.name}
					title="Create New Waste Stream"
				/>

				<ScrollArea className="flex-1 overflow-y-auto px-6 py-6">
					<div className="min-h-[400px]">{renderStepContent()}</div>
				</ScrollArea>

				<WizardFooter
					currentStep={currentStep}
					totalSteps={STEPS.length}
					canContinue={canContinue}
					isCreating={isCreating}
					onBack={prevStep}
					onNext={nextStep}
					onCreate={handleCreateProject}
				/>
			</DialogContent>
		</Dialog>
	);
}
