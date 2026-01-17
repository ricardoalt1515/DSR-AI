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
import type { Dispatch, ReactElement, SetStateAction } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CompanyCombobox } from "@/components/ui/company-combobox";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationCombobox } from "@/components/ui/location-combobox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useCompanyStore } from "@/lib/stores/company-store";
import { useLocationStore } from "@/lib/stores/location-store";
import { cn } from "@/lib/utils";

export type WizardProjectData = {
	name: string;
	client: string;
	companyId: string;
	location: string;
	locationId: string;
	description: string;
};

export type WizardStep = {
	id: number;
	title: string;
	description: string;
};

export type WizardTouched = Record<string, boolean>;

type UpdateProjectData = (updates: Partial<WizardProjectData>) => void;

interface WizardHeaderProps {
	steps: WizardStep[];
	currentStep: number;
	progress: number;
	hasContext: boolean;
	contextCompanyName: string | undefined;
	contextLocationName: string | undefined;
	title: string;
}

export function WizardHeader({
	steps,
	currentStep,
	progress,
	hasContext,
	contextCompanyName,
	contextLocationName,
	title,
}: WizardHeaderProps): ReactElement {
	return (
		<DialogHeader className="p-6 pb-4 shrink-0 border-b border-border/50">
			<div className="space-y-4">
				<DialogTitle className="text-2xl font-bold text-center">
					{title}
				</DialogTitle>

				{hasContext && contextCompanyName && contextLocationName && (
					<div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
						<Building2 className="h-4 w-4" />
						<span>{contextCompanyName}</span>
						<ChevronRight className="h-3 w-3" />
						<MapPin className="h-4 w-4" />
						<span>{contextLocationName}</span>
					</div>
				)}

				<div className="space-y-2">
					<div className="flex justify-between text-xs">
						<span className="font-medium text-foreground">
							{steps[currentStep - 1]?.title || "Loading..."}
						</span>
						<span className="text-muted-foreground">
							Step {currentStep} of {steps.length}
						</span>
					</div>
					<Progress value={progress} className="h-2" />
					<p className="text-xs text-muted-foreground text-center">
						{steps[currentStep - 1]?.description || ""}
					</p>
				</div>

				<div className="flex justify-center">
					<div className="flex items-center gap-2">
						{steps.map((step, index) => {
							const isComplete = currentStep > step.id;
							const isActive = currentStep >= step.id;
							const stepClassName = cn(
								"w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
								isActive
									? "bg-primary text-primary-foreground"
									: "bg-muted text-muted-foreground",
							);

							return (
								<div key={step.id} className="flex items-center">
									<div className={stepClassName}>
										{isComplete ? <Check className="h-4 w-4" /> : step.id}
									</div>
									{index < steps.length - 1 && (
										<ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
									)}
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</DialogHeader>
	);
}

interface WizardFooterProps {
	currentStep: number;
	totalSteps: number;
	canContinue: boolean;
	isCreating: boolean;
	onBack: () => void;
	onNext: () => void;
	onCreate: () => void;
}

export function WizardFooter({
	currentStep,
	totalSteps,
	canContinue,
	isCreating,
	onBack,
	onNext,
	onCreate,
}: WizardFooterProps): ReactElement {
	return (
		<div className="shrink-0 p-6 pt-4 border-t border-border bg-background/95 backdrop-blur-sm">
			<div className="flex justify-between gap-4">
				<Button
					variant="outline"
					onClick={onBack}
					disabled={currentStep === 1}
					className="flex items-center gap-2 min-w-[100px]"
					size="lg"
				>
					<ArrowLeft className="h-4 w-4" />
					Back
				</Button>

				{currentStep < totalSteps ? (
					<Button
						onClick={onNext}
						disabled={!canContinue}
						className="flex items-center gap-2 min-w-[120px]"
						size="lg"
					>
						Continue
						<ArrowRight className="h-4 w-4" />
					</Button>
				) : (
					<Button
						onClick={onCreate}
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
	);
}

interface BasicInfoStepProps {
	projectData: WizardProjectData;
	updateProjectData: UpdateProjectData;
	touched: WizardTouched;
	setTouched: Dispatch<SetStateAction<WizardTouched>>;
	defaultCompanyId: string | undefined;
	defaultLocationId: string | undefined;
	contextCompanyName: string | undefined;
	contextLocationName: string | undefined;
}

export function BasicInfoStep({
	projectData,
	updateProjectData,
	touched,
	setTouched,
	defaultCompanyId,
	defaultLocationId,
	contextCompanyName,
	contextLocationName,
}: BasicInfoStepProps): ReactElement {
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
						onChange={(event) =>
							updateProjectData({ name: event.target.value })
						}
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
								{contextCompanyName || "Loading..."}
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
									const company = useCompanyStore
										.getState()
										.companies.find((item) => item.id === id);
									updateProjectData({
										companyId: id,
										client: company?.name || "",
										locationId: "",
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
									{contextLocationName || "Loading..."}
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
										const location = useLocationStore
											.getState()
											.locations.find((item) => item.id === id);
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
}

interface WasteStreamDetailsStepProps {
	projectData: WizardProjectData;
	updateProjectData: UpdateProjectData;
}

export function WasteStreamDetailsStep({
	projectData,
	updateProjectData,
}: WasteStreamDetailsStepProps): ReactElement {
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
						onChange={(event) =>
							updateProjectData({ description: event.target.value })
						}
						className="h-12 text-base"
						autoFocus
					/>
				</div>
			</div>
		</div>
	);
}

interface ConfirmationStepProps {
	projectData: WizardProjectData;
}

export function ConfirmationStep({
	projectData,
}: ConfirmationStepProps): ReactElement {
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
							<p className="text-muted-foreground">{projectData.client}</p>
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
								<span className="text-muted-foreground">Description:</span>
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
							We&apos;ll take you to the technical sheet to start data capture
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
