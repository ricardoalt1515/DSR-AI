"use client";

import {
	AlertTriangle,
	CheckCircle2,
	Edit,
	FileText,
	History,
	Layers,
	Loader2,
	RefreshCcw,
	Sparkles,
	Table,
	UploadCloud,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	EngineeringDataTable,
	ResizableDataLayout,
} from "@/components/features/technical-data";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { TechnicalFormSkeleton } from "@/components/ui/loading-states";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
// Templates deprecated - will be re-implemented with modular system
// import { TECHNICAL_TEMPLATES } from "@/lib/templates/technical-templates"
import type { VersionSource } from "@/lib/project-types";
import {
	useEnsureProjectsLoaded,
	useProjectStore,
	useProjects,
	useTechnicalDataActions,
	useTechnicalDataStore,
	useTechnicalSections,
	useTechnicalVersions,
} from "@/lib/stores";
import {
	overallCompletion,
	PROPOSAL_READINESS_THRESHOLD,
	sectionCompletion,
} from "@/lib/technical-sheet-data";
import type {
	DataSource,
	TableField,
	TableSection,
} from "@/lib/types/technical-data";

interface TechnicalDataSheetProps {
	projectId: string;
}

// Helper function to map DataSource to VersionSource
function mapDataSourceToVersionSource(source: DataSource): VersionSource {
	switch (source) {
		case "imported":
			return "import";
		case "ai":
			return "ai";
		default:
			return "manual";
	}
}

export function TechnicalDataSheet({ projectId }: TechnicalDataSheetProps) {
	const router = useRouter();
	const pathname = usePathname();
	const sections = useTechnicalSections(projectId);
	const _versions = useTechnicalVersions(projectId);
	const loading = useTechnicalDataStore((state) => state.loading);
	const saving = useTechnicalDataStore((state) => state.saving);
	const lastSaved = useTechnicalDataStore((state) => state.lastSaved);
	const error = useTechnicalDataStore((state) => state.error);
	const syncError = useTechnicalDataStore((state) => state.syncError);
	const pendingChanges = useTechnicalDataStore((state) => state.pendingChanges);

	// Get project timeline for activity tab
	const currentProject = useProjectStore((state) => state.currentProject);
	const timeline =
		currentProject?.id === projectId ? currentProject.timeline : [];

	const {
		setActiveProject,
		loadTechnicalData,
		updateField,
		addCustomSection,
		removeSection,
		addField,
		removeField,
		copyFromProject,
		retrySync,
	} = useTechnicalDataActions();

	const [isTableView, setIsTableView] = useState(false);
	const [focusSectionId, setFocusSectionId] = useState<string | null>(null);
	const [templateOpen, setTemplateOpen] = useState(false);
	const [copyOpen, setCopyOpen] = useState(false);
	const [copyingFromId, setCopyingFromId] = useState<string | null>(null);

	// Load projects for copy-from dialog
	const projects = useProjects();
	useEnsureProjectsLoaded();

	useEffect(() => {
		setActiveProject(projectId);
		loadTechnicalData(projectId);
	}, [projectId, setActiveProject, loadTechnicalData]);

	const completion = useMemo(() => overallCompletion(sections), [sections]);

	const prioritizedGaps = useMemo(() => {
		const stats = sections.map((section) => ({
			section,
			stats: sectionCompletion(section),
		}));
		return stats
			.filter(({ stats: s }) => s.total > 0 && s.completed < s.total)
			.sort((a, b) => a.stats.percentage - b.stats.percentage)
			.slice(0, 3);
	}, [sections]);

	const handleFieldChange = useCallback(
		(
			sectionId: string,
			fieldId: string,
			value: unknown,
			unit?: string,
			_notes?: string,
		) => {
			// Map notes to source for now (notes parameter required by FlexibleDataCapture)
			const source: DataSource = "manual"; // Default to manual for now

			const payload: {
				sectionId: string;
				fieldId: string;
				value: string | number | string[];
				unit?: string;
				source?: VersionSource;
			} = {
				sectionId,
				fieldId,
				value: value as string | number | string[],
				source: mapDataSourceToVersionSource(source),
			};
			if (unit !== undefined) {
				payload.unit = unit;
			}

			// Store handles saving state and lastSaved automatically
			updateField(projectId, payload);
		},
		[projectId, updateField],
	);

	const handleAddSection = useCallback(
		(sectionInput: Omit<TableSection, "id">) => {
			const section: TableSection = {
				...sectionInput,
				id: crypto.randomUUID(),
				fields: sectionInput.fields ?? [],
			};

			addCustomSection(projectId, section);
		},
		[addCustomSection, projectId],
	);

	const handleRemoveSection = useCallback(
		(sectionId: string) => {
			removeSection(projectId, sectionId);
		},
		[projectId, removeSection],
	);

	const handleAddField = useCallback(
		(sectionId: string, fieldInput: Omit<TableField, "id">) => {
			const field: TableField = {
				...fieldInput,
				id: crypto.randomUUID(),
				source: fieldInput.source ?? "manual",
			};

			addField(projectId, sectionId, field);
		},
		[addField, projectId],
	);

	const handleRemoveField = useCallback(
		(sectionId: string, fieldId: string) => {
			removeField(projectId, sectionId, fieldId);
		},
		[projectId, removeField],
	);

	if (loading) {
		return <TechnicalFormSkeleton />;
	}

	return (
		<div className="space-y-6">
			{/* Simplified header with view toggle - stacks on mobile */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
				<div className="flex flex-wrap items-center gap-2 sm:gap-3">
					<h2 className="text-lg font-semibold">Questionnaire Data</h2>
					{/* Autosave indicator */}
					{saving ? (
						<Badge
							variant="outline"
							className="text-xs bg-warning/10 border-warning/40 text-warning"
						>
							<RefreshCcw className="mr-1 h-3 w-3 animate-spin" />
							Saving...
						</Badge>
					) : syncError ? (
						<div className="flex items-center gap-2">
							<Badge
								variant="outline"
								className="text-xs bg-destructive/10 border-destructive/40 text-destructive"
							>
								<AlertTriangle className="mr-1 h-3 w-3" />
								Sync failed
							</Badge>
							<Button
								variant="ghost"
								size="sm"
								className="h-6 px-2 text-xs"
								onClick={() => retrySync(projectId)}
							>
								<RefreshCcw className="mr-1 h-3 w-3" />
								Retry
							</Button>
						</div>
					) : pendingChanges ? (
						<Badge
							variant="outline"
							className="text-xs bg-warning/10 border-warning/40 text-warning"
						>
							<AlertTriangle className="mr-1 h-3 w-3" />
							Pending sync
						</Badge>
					) : lastSaved ? (
						<Badge
							variant="outline"
							className="text-xs bg-success/10 border-success/40 text-success"
						>
							<CheckCircle2 className="mr-1 h-3 w-3" />
							Saved
						</Badge>
					) : null}
					{error && (
						<Badge variant="destructive" className="text-xs">
							{error}
						</Badge>
					)}
				</div>

				<div className="flex items-center gap-2 sm:gap-4">
					{/* View toggle: Form / Table */}
					<div className="flex items-center gap-2">
						<Label
							htmlFor="view-mode"
							className="text-sm text-muted-foreground cursor-pointer hidden sm:flex items-center"
						>
							<Table className="h-4 w-4 mr-1.5" />
							Table View
						</Label>
						{/* Mobile: Icon-only label */}
						<Label
							htmlFor="view-mode"
							className="text-sm text-muted-foreground cursor-pointer sm:hidden"
							aria-label="Table View"
						>
							<Table className="h-4 w-4" />
						</Label>
						<Switch
							id="view-mode"
							checked={isTableView}
							onCheckedChange={setIsTableView}
						/>
					</div>

					{/* History Sheet */}
					<Sheet>
						<SheetTrigger asChild>
							<Button variant="ghost" size="icon" className="h-9 w-9 min-w-[44px] min-h-[44px]" aria-label="View activity history">
								<History className="h-4 w-4" />
							</Button>
						</SheetTrigger>
						<SheetContent side="right" className="w-[400px] sm:w-[540px]">
							<SheetHeader>
								<SheetTitle className="flex items-center gap-2">
									<History className="h-5 w-5" />
									Activity History
								</SheetTitle>
								<SheetDescription>
									Complete timeline of project activities and changes.
								</SheetDescription>
							</SheetHeader>
							<div className="mt-6">
								{timeline.length === 0 ? (
									<p className="text-sm text-muted-foreground">
										No activity recorded yet. Actions will appear here
										automatically.
									</p>
								) : (
									<ScrollArea className="h-[calc(100vh-180px)] pr-3">
										<div className="space-y-4">
											{timeline.map((event, index) => {
												const getEventIcon = () => {
													switch (event.type) {
														case "version":
															return <Layers className="h-4 w-4" />;
														case "proposal":
															return <FileText className="h-4 w-4" />;
														case "edit":
															return <Edit className="h-4 w-4" />;
														case "upload":
															return <UploadCloud className="h-4 w-4" />;
														case "assistant":
															return <Sparkles className="h-4 w-4" />;
														case "import":
															return <RefreshCcw className="h-4 w-4" />;
														default:
															return <History className="h-4 w-4" />;
													}
												};

												const getEventColor = () => {
													switch (event.type) {
														case "version":
															return "text-treatment-secondary";
														case "proposal":
															return "text-success";
														case "edit":
															return "text-warning";
														case "upload":
															return "text-treatment-auxiliary";
														case "assistant":
															return "text-accent";
														case "import":
															return "text-primary";
														default:
															return "text-muted-foreground";
													}
												};

												const isLastItem = index === timeline.length - 1;

												return (
													<div key={event.id} className="relative flex gap-3">
														{!isLastItem && (
															<div className="absolute left-[11px] top-8 bottom-0 w-px bg-border" />
														)}
														<div
															className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-background ${getEventColor()}`}
														>
															{getEventIcon()}
														</div>
														<div className="flex-1 space-y-1 pb-4">
															<div className="flex items-center justify-between">
																<p className="font-medium text-sm">
																	{event.title}
																</p>
																<p className="text-xs text-muted-foreground">
																	{new Date(event.timestamp).toLocaleString(
																		"en-US",
																		{
																			month: "short",
																			day: "numeric",
																			hour: "2-digit",
																			minute: "2-digit",
																		},
																	)}
																</p>
															</div>
															<p className="text-xs text-muted-foreground">
																{event.description}
															</p>
															<p className="text-xs text-muted-foreground">
																by {event.user}
															</p>
														</div>
													</div>
												);
											})}
										</div>
									</ScrollArea>
								)}
							</div>
						</SheetContent>
					</Sheet>

					{/* More actions dropdown could go here if needed */}
				</div>
			</div>

			{/* Templates Dialog - DISABLED: Templates being re-implemented with modular system */}
			<Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Templates Coming Soon</DialogTitle>
						<DialogDescription>
							Templates are being re-implemented with a new modular system. This
							feature will be available soon with sector-specific templates.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3">
						<p className="text-sm text-muted-foreground">
							The new template system will provide:
						</p>
						<ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
							<li>
								Sector-specific templates (Municipal, Industrial, Commercial,
								Residential)
							</li>
							<li>
								Subsector optimization (Food Processing, Hotels, Textile, etc.)
							</li>
							<li>Pre-filled default values based on industry standards</li>
							<li>Intelligent field selection</li>
						</ul>
					</div>
				</DialogContent>
			</Dialog>

			{/* Copy From Project Dialog */}
			<Dialog open={copyOpen} onOpenChange={setCopyOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Copy from Another Project</DialogTitle>
						<DialogDescription>
							Select a project to copy its technical data sheet. You can merge
							or replace your data.
						</DialogDescription>
					</DialogHeader>
					<div className="max-h-[320px] overflow-y-auto space-y-2">
						{projects
							.filter((p) => p.id !== projectId)
							.map((p) => (
								<div
									key={p.id}
									className="flex items-center justify-between rounded-md border p-3"
								>
									<div>
										<p className="font-medium">{p.name}</p>
										<p className="text-xs text-muted-foreground">
											{p.client} · {p.sector}
										</p>
									</div>
									<div className="flex items-center gap-2">
										<Button
											size="sm"
											variant="outline"
											disabled={copyingFromId !== null}
											onClick={async () => {
												setCopyingFromId(p.id);
												await copyFromProject(projectId, p.id, "merge");
												setCopyingFromId(null);
												setCopyOpen(false);
											}}
										>
											{copyingFromId === p.id ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												"Merge"
											)}
										</Button>
										<Button
											size="sm"
											disabled={copyingFromId !== null}
											onClick={async () => {
												setCopyingFromId(p.id);
												await copyFromProject(projectId, p.id, "replace");
												setCopyingFromId(null);
												setCopyOpen(false);
											}}
										>
											{copyingFromId === p.id ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												"Replace"
											)}
										</Button>
									</div>
								</div>
							))}
						{projects.filter((p) => p.id !== projectId).length === 0 && (
							<p className="text-sm text-muted-foreground">
								No projects available to copy from.
							</p>
						)}
					</div>
				</DialogContent>
			</Dialog>

			{completion.percentage < PROPOSAL_READINESS_THRESHOLD && (
				<Alert className="alert-warning-card">
					<Sparkles className="h-4 w-4" />
					<AlertDescription className="alert-description">
						<span className="font-semibold">
							Current progress: {completion.percentage}% complete.
						</span>{" "}
						At least {PROPOSAL_READINESS_THRESHOLD}% is required to enable the intelligent
						generator.
						{prioritizedGaps.length > 0 && (
							<div className="mt-2 space-y-2 text-sm">
								<p className="font-medium">
									Suggestion: complete these sections first:
								</p>
								<ul className="space-y-2">
									{prioritizedGaps.map(({ section, stats }) => (
										<li
											key={section.id}
											className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
										>
											<span className="truncate">
												{section.title} · {stats.completed}/{stats.total} fields
												complete
											</span>
											<Button
												variant="outline"
												size="sm"
												className="w-full sm:w-auto min-h-[44px] sm:min-h-0 shrink-0"
												onClick={() => {
													setIsTableView(false);
													setFocusSectionId(section.id);
												}}
											>
												Go to Section
											</Button>
										</li>
									))}
								</ul>
							</div>
						)}
					</AlertDescription>
				</Alert>
			)}

			{completion.percentage >= PROPOSAL_READINESS_THRESHOLD && (
				<Alert className="border-success/40 bg-success/10">
					<CheckCircle2 className="h-4 w-4 text-success" />
					<AlertDescription>
						<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
							<div className="flex-1 space-y-2">
								<p className="font-medium text-success">
									Technical data ready! ({completion.percentage}% complete)
								</p>
								<p className="text-sm text-success/80">
									Your technical data sheet has enough information to generate a
									professional proposal.
									{completion.percentage < 100 &&
										" You can generate now or complete more fields for greater accuracy."}
								</p>
							</div>
							<Button
								onClick={() => {
									router.replace(`${pathname}?tab=proposals`, {
										scroll: false,
									});
								}}
								className="bg-success text-success-foreground hover:bg-success/90 shrink-0 w-full sm:w-auto min-h-[44px]"
							>
								<Sparkles className="mr-2 h-4 w-4" />
								Generate Proposal
							</Button>
						</div>
					</AlertDescription>
				</Alert>
			)}

			{/* Main content: Form or Table view based on toggle */}
			{isTableView ? (
				<EngineeringDataTable
					sections={sections}
					onFieldChange={handleFieldChange}
				/>
			) : (
				<ResizableDataLayout
					sections={sections}
					onFieldChange={handleFieldChange}
					projectId={projectId}
					onAddSection={handleAddSection}
					onRemoveSection={handleRemoveSection}
					onAddField={(sectionId, field) => handleAddField(sectionId, field)}
					onRemoveField={handleRemoveField}
					autoSave
					focusSectionId={focusSectionId}
					onFocusSectionFromSummary={(sectionId) => {
						setIsTableView(false);
						setFocusSectionId(sectionId);
					}}
				/>
			)}
		</div>
	);
}
