"use client";

import {
	Building2,
	Filter,
	FolderKanban,
	Loader2,
	Search,
	X,
} from "lucide-react";
import dynamic from "next/dynamic";
import React, { memo, useCallback, useEffect, useMemo } from "react";
import { DashboardHero } from "@/components/features/dashboard";
import { ProjectCard } from "@/components/features/dashboard/components/project-card";
import { SectionErrorBoundary } from "@/components/features/proposals/overview/section-error-boundary";
import ClientOnly from "@/components/shared/common/client-only";

const PremiumProjectWizard = dynamic(
	() =>
		import(
			"@/components/features/dashboard/components/premium-project-wizard"
		).then((mod) => mod.PremiumProjectWizard),
	{ ssr: false, loading: () => null },
);

const OnboardingChecklist = dynamic(
	() =>
		import("@/components/shared/onboarding-checklist").then(
			(mod) => mod.OnboardingChecklist,
		),
	{ loading: () => null },
);

const ProjectPipeline = dynamic(
	() =>
		import("@/components/features/dashboard/components/project-pipeline").then(
			(mod) => mod.ProjectPipeline,
		),
	{
		loading: () => (
			<div className="h-24 w-full animate-pulse rounded-lg bg-muted/50" />
		),
	},
);

const SimplifiedStats = dynamic(
	() =>
		import("@/components/features/dashboard/components/simplified-stats").then(
			(mod) => mod.SimplifiedStats,
		),
	{
		loading: () => (
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				{[1, 2, 3].map((i) => (
					<div
						key={i}
						className="h-32 w-full animate-pulse rounded-lg bg-muted/50"
					/>
				))}
			</div>
		),
	},
);

import { ArchivedFilterSelect } from "@/components/ui/archived-filter-select";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { ArchivedFilter } from "@/lib/api/companies";
import { PROJECT_STATUS_GROUPS } from "@/lib/project-status";
import type { ProjectSummary } from "@/lib/project-types";
import { useCompanyStore } from "@/lib/stores/company-store";
import {
	usePagination,
	useProjectActions,
	useProjectInitialized,
	useProjectLoading,
	useProjects,
} from "@/lib/stores/project-store";

/**
 * Memoized Waste Stream List Component
 * Displays waste streams in a responsive grid layout with context badges
 */
const WasteStreamList = memo(function WasteStreamList({
	projects,
	loading,
	isInitialized,
}: {
	projects: ProjectSummary[];
	loading: boolean;
	isInitialized: boolean;
}) {
	// Only show skeleton on first load (not yet initialized)
	if (loading && !isInitialized) {
		return <WasteStreamGridSkeleton />;
	}

	if (projects.length === 0) {
		return (
			<EmptyState
				icon={FolderKanban}
				title="No waste streams yet"
				description="Create your first waste stream to get started."
			/>
		);
	}

	return (
		<div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3 animate-stagger">
			{projects.map((project) => (
				<ProjectCard
					key={project.id}
					id={project.id}
					name={project.name}
					client={project.client}
					sector={project.sector}
					location={project.location}
					status={project.status}
					updatedAt={project.updatedAt}
					createdAt={project.createdAt}
					proposalsCount={project.proposalsCount}
					{...(project.archivedAt !== undefined
						? { archivedAt: project.archivedAt }
						: {})}
				/>
			))}
		</div>
	);
});

/**
 * Skeleton loader for assessment grid
 * Shows placeholder cards while data is loading
 */
function WasteStreamGridSkeleton() {
	const skeletonKeys = ["a", "b", "c", "d", "e", "f"] as const;

	return (
		<div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
			{skeletonKeys.map((key) => (
				<Card key={key} className="h-48">
					<CardHeader>
						<Skeleton className="h-6 w-3/4 mb-2" />
						<Skeleton className="h-4 w-1/2" />
					</CardHeader>
					<CardContent className="space-y-2">
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-2/3" />
					</CardContent>
				</Card>
			))}
		</div>
	);
}

/**
 * Main Dashboard Content Component
 * Assessment-first view with company/location context
 */
const DashboardContent = memo(function DashboardContent() {
	const { setFilter, setFilters, reloadProjects } = useProjectActions();
	const { companies, loadCompanies } = useCompanyStore();
	const [createModalOpen, setCreateModalOpen] = React.useState(false);
	const [searchTerm, setSearchTerm] = React.useState("");
	const [companyFilter, setCompanyFilter] = React.useState<string>("all");
	const [statusFilter, setStatusFilter] = React.useState<string>("active");
	const [archivedFilter, setArchivedFilter] =
		React.useState<ArchivedFilter>("active");

	// Load data on mount
	useEffect(() => {
		const activeStatuses = PROJECT_STATUS_GROUPS.active.join(",");
		setFilters({ status: activeStatuses, archived: "active" });
		void reloadProjects();
		loadCompanies();
	}, [setFilters, reloadProjects, loadCompanies]);

	// Handle status filter change with server-side filtering
	const handleStatusFilterChange = useCallback(
		(value: string) => {
			setStatusFilter(value);

			// Map filter values to backend statuses
			if (value === "all") {
				setFilter("status", undefined);
			} else if (value === "active") {
				// Send comma-separated list of active statuses
				const activeStatuses = PROJECT_STATUS_GROUPS.active.join(",");
				setFilter("status", activeStatuses);
			} else {
				// Single status filter
				setFilter("status", value);
			}
			void reloadProjects();
		},
		[setFilter, reloadProjects],
	);

	// Handle company filter (server-side via companyId)
	const handleCompanyFilterChange = useCallback(
		(value: string) => {
			setCompanyFilter(value);
			setFilter("companyId", value === "all" ? undefined : value);
			void reloadProjects();
		},
		[setFilter, reloadProjects],
	);

	// Handle archived filter (server-side)
	const handleArchivedFilterChange = useCallback(
		(value: ArchivedFilter) => {
			setArchivedFilter(value);
			setFilter("archived", value);
			void reloadProjects();
		},
		[setFilter, reloadProjects],
	);

	const handleOpenCreateModal = useCallback(() => {
		setCreateModalOpen(true);
	}, []);

	// Onboarding state derived from projects data
	const projects = useProjects();
	const hasProposals = projects.some((p) => p.proposalsCount > 0);
	const hasHighProgress = projects.some((p) => p.progress >= 80);
	const showOnboarding = projects.length < 3; // Show for new users

	// Onboarding steps with dynamic completion
	const onboardingSteps = useMemo(
		() => [
			{
				id: "create-company",
				label: "Create your first company",
				description: "Set up a company to associate with waste streams",
				action: { label: "Add", onClick: () => {} }, // Companies created in wizard
			},
			{
				id: "start-assessment",
				label: "Start a waste stream",
				description: "Create your first waste stream",
				action: { label: "Start", onClick: handleOpenCreateModal },
			},
			{
				id: "complete-data",
				label: "Complete technical data (80%+)",
				description: "Fill out the questionnaire for accurate proposals",
			},
			{
				id: "generate-proposal",
				label: "Generate your first AI proposal",
				description: "Let AI analyze and create a deal report",
			},
		],
		[handleOpenCreateModal],
	);

	// Calculate completed steps
	const completedSteps = useMemo(() => {
		const completed: string[] = [];
		if (companies.length > 0) completed.push("create-company");
		if (projects.length > 0) completed.push("start-assessment");
		if (hasHighProgress) completed.push("complete-data");
		if (hasProposals) completed.push("generate-proposal");
		return completed;
	}, [companies.length, projects.length, hasHighProgress, hasProposals]);

	return (
		<div className="space-y-8">
			{/* Hero Section */}
			<div className="animate-fade-in-up">
				<DashboardHero onCreateProject={handleOpenCreateModal} />
			</div>

			{/* Onboarding Checklist - Only for new users */}
			{showOnboarding && (
				<div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
					<OnboardingChecklist
						steps={onboardingSteps}
						completedSteps={completedSteps}
						onStepAction={(stepId) => {
							if (stepId === "start-assessment") {
								handleOpenCreateModal();
							}
						}}
					/>
				</div>
			)}

			{/* Pipeline Overview */}
			<div className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
				<ProjectPipeline />
			</div>

			{/* Stats Section */}
			<div className="animate-fade-in-up" style={{ animationDelay: "300ms" }}>
				<SimplifiedStats />
			</div>

			{/* Assessments Section */}
			<section className="space-y-4">
				<Card>
					<CardHeader className="pb-4">
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="text-lg font-semibold flex items-center gap-2">
									<FolderKanban className="h-5 w-5" />
									Your Waste Streams
								</CardTitle>
								<CardDescription>
									All waste streams across companies and locations
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						{/* Search Bar */}
						<div className="relative">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder="Search waste streams… (Cmd+K)"
								aria-label="Search waste streams"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="pl-9 pr-9"
								autoComplete="off"
							/>
							{searchTerm && (
								<button
									type="button"
									onClick={() => setSearchTerm("")}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
									aria-label="Clear search"
								>
									<X className="h-4 w-4" />
								</button>
							)}
						</div>

						{/* Filter Bar */}
						<div className="flex flex-wrap gap-3">
							<Select
								value={companyFilter}
								onValueChange={handleCompanyFilterChange}
							>
								<SelectTrigger className="w-[180px]">
									<Building2 className="h-4 w-4 mr-2" />
									<SelectValue placeholder="All Companies" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Companies</SelectItem>
									{companies.map((company) => (
										<SelectItem key={company.id} value={company.id}>
											{company.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							<Select
								value={statusFilter}
								onValueChange={handleStatusFilterChange}
							>
								<SelectTrigger className="w-[180px]">
									<Filter className="h-4 w-4 mr-2" />
									<SelectValue placeholder="All Status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Status</SelectItem>
									<SelectItem value="active">Active</SelectItem>
									<SelectItem value="Completed">Completed</SelectItem>
									<SelectItem value="On Hold">On Hold</SelectItem>
								</SelectContent>
							</Select>

							<ArchivedFilterSelect
								value={archivedFilter}
								onChange={handleArchivedFilterChange}
							/>
						</div>
					</CardContent>
				</Card>

				<WasteStreamListContainer searchTerm={searchTerm} />
			</section>

			<PremiumProjectWizard
				open={createModalOpen}
				onOpenChange={setCreateModalOpen}
			/>
		</div>
	);
});

/**
 * Assessment List Container with Filtering
 * Connects to project store and applies search filter client-side
 */
const WasteStreamListContainer = memo(function WasteStreamListContainer({
	searchTerm,
}: {
	searchTerm: string;
}) {
	const projects = useProjects();
	const loading = useProjectLoading();
	const isInitialized = useProjectInitialized();
	const { hasMore, totalProjects, pageSize } = usePagination();
	const { loadMore } = useProjectActions();

	// Apply client-side filters (search only; company/status are applied server-side)
	const filtered = useMemo(() => {
		let result = projects;

		// Search filter (client-side)
		if (searchTerm.trim()) {
			const search = searchTerm.toLowerCase();
			result = result.filter(
				(p) =>
					p.name.toLowerCase().includes(search) ||
					(p.companyName || p.client).toLowerCase().includes(search) ||
					(p.locationName || p.location).toLowerCase().includes(search),
			);
		}

		return result;
	}, [projects, searchTerm]);

	const remainingProjects = totalProjects - projects.length;

	// Show search-specific empty state
	const showSearchEmpty =
		searchTerm.trim() && filtered.length === 0 && !loading;

	return (
		<div className="space-y-4">
			{/* Results Counter */}
			{searchTerm.trim() && filtered.length > 0 && (
				<p className="text-sm text-muted-foreground">
					Found {filtered.length} waste stream{filtered.length !== 1 ? "s" : ""}{" "}
					matching "{searchTerm}"
				</p>
			)}

			{/* Search Empty State */}
			{showSearchEmpty ? (
				<EmptyState
					icon={Search}
					title={`No waste streams match "${searchTerm}"`}
					description="Try a different search term or clear the filter to see all waste streams."
				/>
			) : (
				<WasteStreamList
					projects={filtered}
					loading={loading}
					isInitialized={isInitialized}
				/>
			)}

			{/* Load More Button */}
			{hasMore && filtered.length > 0 && !searchTerm.trim() && (
				<div className="flex flex-col items-center gap-2 pt-4">
					<p className="text-sm text-muted-foreground">
						Showing {projects.length} of {totalProjects} waste streams
						{remainingProjects > 0 && ` (${remainingProjects} more)`}
					</p>
					<Button
						onClick={loadMore}
						disabled={loading}
						variant="outline"
						size="lg"
						className="w-full max-w-md"
					>
						{loading ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								Loading…
							</>
						) : (
							`Load More (${Math.min(pageSize, remainingProjects)})`
						)}
					</Button>
				</div>
			)}
		</div>
	);
});

/**
 * Dashboard Skeleton Component
 * Displays loading state while data is being fetched
 */
function DashboardSkeleton() {
	return (
		<div className="space-y-8">
			{/* Hero Skeleton */}
			<div className="space-y-4">
				<Skeleton className="h-32 w-full" />
			</div>

			{/* Pipeline Skeleton */}
			<div className="space-y-4">
				<Skeleton className="h-24 w-full" />
			</div>

			{/* Stats Skeleton */}
			<Skeleton className="h-48 w-full" />

			{/* Assessments Grid Skeleton */}
			<WasteStreamGridSkeleton />
		</div>
	);
}

// Main Dashboard Page Component
export default function DashboardPage() {
	return (
		<SectionErrorBoundary sectionName="Dashboard">
			<ClientOnly fallback={<DashboardSkeleton />}>
				<DashboardContent />
			</ClientOnly>
		</SectionErrorBoundary>
	);
}
