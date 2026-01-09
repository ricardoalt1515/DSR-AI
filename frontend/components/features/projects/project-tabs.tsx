"use client";

import {
	ClipboardList,
	FileText,
	FolderOpen,
	LayoutDashboard,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { FilesListSkeleton } from "@/components/ui/files-grid-skeleton";
import { TechnicalFormSkeleton } from "@/components/ui/loading-states";
import { ProposalSkeleton } from "@/components/ui/proposal-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProjectDetail, ProjectSummary } from "@/lib/project-types";
import { useCurrentProject, useLoadProjectAction, useTechnicalSections } from "@/lib/stores";
import { overallCompletion } from "@/lib/technical-sheet-data";

// Overview is NOT lazy-loaded because it's the default tab (avoids skeleton flash)
import { ProjectOverview } from "./project-overview";

// Lazy load non-default tab components for code splitting
const TechnicalDataSheet = lazy(() => import("./technical-data-sheet").then(m => ({ default: m.TechnicalDataSheet })));
const ProposalsTab = lazy(() => import("./proposals-tab").then(m => ({ default: m.ProposalsTab })));
const FilesTabEnhanced = lazy(() => import("./files-tab-enhanced").then(m => ({ default: m.FilesTabEnhanced })));

// Tab values at module level to avoid recreation on each render
const TAB_VALUES = ["overview", "technical", "files", "proposals"] as const;
type TabValue = (typeof TAB_VALUES)[number];

type ProjectTabsInput = ProjectSummary | ProjectDetail;

interface ProjectTabsProps {
	project: ProjectTabsInput;
}

export function ProjectTabs({ project }: ProjectTabsProps) {
	const storeProject = useCurrentProject();
	const loadProject = useLoadProjectAction();
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const getValidTab = useCallback(
		(value: string | null): TabValue =>
			value && TAB_VALUES.includes(value as TabValue)
				? (value as TabValue)
				: "overview",
		[], // TAB_VALUES is stable at module level
	);

	const initialTab = getValidTab(searchParams.get("tab"));
	const [activeTab, setActiveTab] = useState<TabValue>(initialTab);

	const tabParam = searchParams.get("tab");

	useEffect(() => {
		const nextTab = getValidTab(tabParam);
		setActiveTab((current) => (current === nextTab ? current : nextTab));
	}, [getValidTab, tabParam]);

	const handleTabChange = useCallback(
		(value: string) => {
			const nextTab = getValidTab(value);
			setActiveTab(nextTab);

			const params = new URLSearchParams(searchParams.toString());

			if (nextTab === "overview") {
				params.delete("tab");
			} else {
				params.set("tab", nextTab);
			}

			const queryString = params.toString();
			const target = queryString ? `${pathname}?${queryString}` : pathname;

			router.replace(target, { scroll: false });
		},
		[getValidTab, pathname, router, searchParams],
	);

	useEffect(() => {
		const currentId = storeProject?.id;
		if (currentId !== project.id) {
			loadProject(project.id);
		}
	}, [project.id, storeProject?.id, loadProject]);

	const projectData = useMemo<ProjectDetail | ProjectSummary>(() => {
		if (storeProject && storeProject.id === project.id) {
			return storeProject;
		}
		return project;
	}, [storeProject, project]);

	// Use the same dynamic completion calculation as header / dashboard
	const sections = useTechnicalSections(project.id);
	const completion =
		sections.length > 0
			? overallCompletion(sections)
			: { total: 0, completed: 0, percentage: projectData.progress };

	// Get counts for tab badges (with project.id validation to avoid stale counts during navigation)
	const proposalCount = useMemo(() => {
		if (storeProject?.id !== project.id) return 0;
		const detail = storeProject as ProjectDetail | null;
		return detail?.proposals?.length ?? 0;
	}, [storeProject, project.id]);

	const fileCount = useMemo(() => {
		if (storeProject?.id !== project.id) return 0;
		const detail = storeProject as ProjectDetail | null;
		return detail?.files?.length ?? 0;
	}, [storeProject, project.id]);

	const overviewProject = useMemo(() => {
		const base = projectData as ProjectSummary;

		return {
			id: base.id,
			name: base.name,
			client: base.client,
			location: base.location,
			status: base.status,
			// Keep Overview progress in sync with technical sheet completeness
			progress: completion.percentage,
			type: base.type,
			description: base.description,
			// timeline intentionally omitted to avoid type mismatch (ProjectDetail has TimelineEvent[])
			updatedAt: base.updatedAt,
		};
	}, [projectData, completion.percentage]);

	return (
		<div className="space-y-6">
			<Tabs
				value={activeTab}
				onValueChange={handleTabChange}
				className="w-full"
			>
				{/* Horizontal scroll container for mobile, grid on larger screens */}
				<TabsList
					className="flex sm:grid sm:grid-cols-4 w-full h-auto p-1 overflow-x-auto scrollbar-hide"
					aria-label="Project sections"
					data-tour="project-tabs"
				>
					<TabsTrigger
						value="overview"
						className="flex items-center justify-center gap-2 py-2.5 px-3 min-w-[44px] sm:min-w-0 flex-shrink-0 sm:flex-shrink"
						aria-label="Overview"
						data-tour="tab-overview"
					>
						<LayoutDashboard className="h-4 w-4" aria-hidden="true" />
						<span className="hidden sm:inline">Overview</span>
					</TabsTrigger>
					<TabsTrigger
						value="technical"
						className="flex items-center justify-center gap-2 py-2.5 px-3 min-w-[44px] sm:min-w-0 flex-shrink-0 sm:flex-shrink"
						aria-label="Questionnaire"
						data-tour="tab-assessment"
					>
						<ClipboardList className="h-4 w-4" aria-hidden="true" />
						<span className="hidden sm:inline">Questionnaire</span>
					</TabsTrigger>
					<TabsTrigger
						value="files"
						className="flex items-center justify-center gap-2 py-2.5 px-3 min-w-[44px] sm:min-w-0 flex-shrink-0 sm:flex-shrink"
						aria-label={`Files${fileCount > 0 ? `, ${fileCount} uploaded` : ""}`}
						data-tour="tab-files"
					>
						<FolderOpen className="h-4 w-4" aria-hidden="true" />
						<span className="hidden sm:inline">Files</span>
						{fileCount > 0 && (
							<Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs hidden sm:flex" aria-hidden="true">
								{fileCount}
							</Badge>
						)}
					</TabsTrigger>
					<TabsTrigger
						value="proposals"
						className="flex items-center justify-center gap-2 py-2.5 px-3 min-w-[44px] sm:min-w-0 flex-shrink-0 sm:flex-shrink"
						aria-label={`Proposals${proposalCount > 0 ? `, ${proposalCount} available` : ""}`}
						data-tour="tab-proposals"
					>
						<FileText className="h-4 w-4" aria-hidden="true" />
						<span className="hidden sm:inline">Proposals</span>
						{proposalCount > 0 && (
							<Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs hidden sm:flex" aria-hidden="true">
								{proposalCount}
							</Badge>
						)}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="overview" className="mt-6 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
					{/* Overview is not lazy-loaded (default tab), no Suspense needed */}
					<ProjectOverview
						project={{ ...overviewProject, proposalCount }}
						onNavigateToTechnical={() => handleTabChange("technical")}
						onNavigateToProposals={() => handleTabChange("proposals")}
					/>
				</TabsContent>

				<TabsContent value="technical" className="mt-6 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
					<Suspense fallback={<TechnicalFormSkeleton />}>
						<TechnicalDataSheet projectId={project.id} />
					</Suspense>
				</TabsContent>

				<TabsContent value="files" className="mt-6 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
					<Suspense fallback={<FilesListSkeleton count={4} />}>
						<FilesTabEnhanced projectId={project.id} />
					</Suspense>
				</TabsContent>

				<TabsContent value="proposals" className="mt-6 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
					<Suspense fallback={<ProposalSkeleton count={2} />}>
						<ProposalsTab project={projectData} />
					</Suspense>
				</TabsContent>
			</Tabs>
		</div>
	);
}
