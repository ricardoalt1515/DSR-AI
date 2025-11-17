"use client";

import { Building2, Search, FolderKanban, Loader2 } from "lucide-react";
import React, { memo, useCallback, useEffect } from "react";
import {
	DashboardHero,
	PremiumProjectWizard,
	ProjectPipeline,
	SimplifiedStats,
	SmartNotifications,
} from "@/components/features/dashboard";
import { ProjectCard } from "@/components/features/dashboard/components/project-card";
import {
	useProjectActions,
	usePagination,
	useProjects,
	useProjectLoading,
	useFilters,
	useLifecycleCounts,
} from "@/lib/stores";
import { useCompanyStore } from "@/lib/stores/company-store";
import ClientOnly from "@/components/shared/common/client-only";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { ProjectSummary } from "@/lib/project-types";

/**
 * Memoized Assessment List Component
 * Displays assessments in a responsive grid layout with context badges
 */
const AssessmentList = memo(function AssessmentList({
	projects,
	loading,
}: {
	projects: ProjectSummary[];
	loading: boolean;
}) {
	if (loading && projects.length === 0) {
		return <AssessmentGridSkeleton />;
	}

	if (projects.length === 0) {
		return (
			<EmptyState
				icon={FolderKanban}
				title="No assessments yet"
				description="Create your first assessment to get started."
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
					progress={project.progress}
					updatedAt={project.updatedAt}
					createdAt={project.createdAt}
					proposalsCount={project.proposalsCount}
				/>
			))}
		</div>
	);
});

/**
 * Skeleton loader for assessment grid
 * Shows placeholder cards while data is loading
 */
function AssessmentGridSkeleton() {
	return (
		<div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
			{Array.from({ length: 6 }).map((_, index) => (
				<Card key={index} className="h-48">
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
const lifecycleTabs = [
	{ value: "active", label: "Active" },
	{ value: "pipeline", label: "Pipeline" },
	{ value: "completed", label: "Completed" },
	{ value: "archived", label: "Archived" },
];

const DashboardContent = memo(function DashboardContent() {
	const { loadProjects, setFilter } = useProjectActions();
	const { companies, loadCompanies } = useCompanyStore();
	const filters = useFilters();
	const lifecycleCounts = useLifecycleCounts();
	const [createModalOpen, setCreateModalOpen] = React.useState(false);
	const [searchTerm, setSearchTerm] = React.useState(filters.search ?? "");
	const [companyFilter, setCompanyFilter] = React.useState<string>(
		filters.companyId ?? "all",
	);
	const currentLifecycle = filters.lifecycleState ?? "active";
	const includeArchived =
		currentLifecycle === "archived" ? true : Boolean(filters.includeArchived);

	useEffect(() => {
		setSearchTerm(filters.search ?? "");
	}, [filters.search]);

	useEffect(() => {
		setCompanyFilter(filters.companyId ?? "all");
	}, [filters.companyId]);

	// Load data on mount
	useEffect(() => {
		loadProjects();
		loadCompanies();
	}, [loadProjects, loadCompanies]);

	const handleLifecycleChange = useCallback(
		(value: string) => {
			setFilter(
				"lifecycleState",
				value ? (value as ProjectSummary["lifecycleState"]) : undefined,
			);

			if (value === "archived") {
				setFilter("includeArchived", true);
				return;
			}

			const forcedArchivedToggle =
				filters.lifecycleState === "archived" && filters.includeArchived;

			if (forcedArchivedToggle) {
				setFilter("includeArchived", false);
			}
		},
		[setFilter, filters.lifecycleState, filters.includeArchived],
	);

	const handleSearchChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const value = event.target.value;
			setSearchTerm(value);
			setFilter("search", value.trim() ? value : undefined);
		},
		[setFilter],
	);

	const handleCompanyChange = useCallback(
		(value: string) => {
			setCompanyFilter(value);
			setFilter("companyId", value === "all" ? undefined : value);
		},
		[setFilter],
	);

	const handleIncludeArchivedToggle = useCallback(
		(checked: boolean) => {
			setFilter("includeArchived", checked);
		},
		[setFilter],
	);

	const handleOpenCreateModal = useCallback(() => {
		setCreateModalOpen(true);
	}, []);

	return (
		<div className="space-y-8">
			{/* Hero Section */}
			<div className="animate-fade-in-up">
				<DashboardHero onCreateProject={handleOpenCreateModal} />
			</div>

			{/* Pipeline Overview */}
			<div className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
				<ProjectPipeline />
			</div>

			{/* Enhanced Stats Grid */}
			<div
				className="animate-fade-in-up grid grid-cols-1 lg:grid-cols-3 gap-6"
				style={{ animationDelay: "300ms" }}
			>
				<div className="lg:col-span-2">
					<SimplifiedStats />
				</div>
				<div>
					<SmartNotifications />
				</div>
			</div>

			{/* Assessments Section */}
			<section className="space-y-4">
				<Card>
					<CardHeader className="pb-4">
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="text-lg font-semibold flex items-center gap-2">
									<FolderKanban className="h-5 w-5" />
									Your Assessments
								</CardTitle>
								<CardDescription>
									All waste assessments across companies and locations
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						{/* Search Bar */}
						<div className="relative">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder="Search assessments..."
								value={searchTerm}
								onChange={handleSearchChange}
								className="pl-9"
								autoComplete="off"
							/>
						</div>

						{/* Filter Bar */}
						<div className="flex flex-wrap gap-3">
							<Select value={companyFilter} onValueChange={handleCompanyChange}>
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

							<div className="flex items-center gap-3 rounded-lg border px-3 py-1.5">
								<span className="text-sm font-medium">Include archived</span>
								<Switch
									checked={includeArchived}
									onCheckedChange={handleIncludeArchivedToggle}
									disabled={currentLifecycle === "archived"}
								/>
							</div>
						</div>

						<Tabs
							value={currentLifecycle}
							onValueChange={handleLifecycleChange}
							className="pt-2"
						>
							<TabsList className="flex w-full flex-wrap gap-2 rounded-full bg-muted/50 p-1">
								{lifecycleTabs.map((tab) => (
									<TabsTrigger key={tab.value} value={tab.value} className="flex-1">
										<div className="flex items-center justify-center gap-2">
											<span>{tab.label}</span>
											<span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
												{lifecycleCounts[tab.value as keyof typeof lifecycleCounts] ?? 0}
											</span>
										</div>
									</TabsTrigger>
								))}
							</TabsList>
						</Tabs>
					</CardContent>
				</Card>

				<AssessmentListContainer />
			</section>

			<PremiumProjectWizard
				open={createModalOpen}
				onOpenChange={setCreateModalOpen}
				onProjectCreated={(_projectId) => {}}
			/>
		</div>
	);
});

/**
 * Assessment List Container with Filtering
 * Connects to project store and applies filters (server-side)
 */
const AssessmentListContainer = memo(function AssessmentListContainer() {
	const projects = useProjects();
	const loading = useProjectLoading();
	const { hasMore, totalProjects } = usePagination();
	const { loadMore } = useProjectActions();

	const remainingProjects = Math.max(totalProjects - projects.length, 0);

	return (
		<div className="space-y-4">
			<AssessmentList projects={projects} loading={loading} />

			{/* Load More Button */}
			{hasMore && projects.length > 0 && (
				<div className="flex flex-col items-center gap-2 pt-4">
					<p className="text-sm text-muted-foreground">
						Showing {projects.length} of {totalProjects} assessments
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
								Loading...
							</>
						) : (
							`Load More Assessments (${Math.min(50, remainingProjects)})`
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
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2">
					<Skeleton className="h-48 w-full" />
				</div>
				<div>
					<Skeleton className="h-48 w-full" />
				</div>
			</div>

			{/* Assessments Grid Skeleton */}
			<AssessmentGridSkeleton />
		</div>
	);
}

// Main Dashboard Page Component
export default function DashboardPage() {
	return (
		<ClientOnly fallback={<DashboardSkeleton />}>
			<DashboardContent />
		</ClientOnly>
	);
}
