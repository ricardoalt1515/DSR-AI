"use client";

import { Building2, Search, Filter, FolderKanban } from "lucide-react";
import React, { memo, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
	DashboardHero,
	PremiumProjectWizard,
	ProjectPipeline,
	SimplifiedStats,
	SmartNotifications,
} from "@/components/features/dashboard";
import { ProjectCard } from "@/components/features/dashboard/components/project-card";
import { useProjectActions } from "@/lib/stores";
import { useCompanyStore } from "@/lib/stores/company-store";
import ClientOnly from "@/components/shared/common/client-only";
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
const DashboardContent = memo(function DashboardContent() {
	const { loadProjects } = useProjectActions();
	const { companies, loadCompanies } = useCompanyStore();
	const [createModalOpen, setCreateModalOpen] = React.useState(false);
	const [searchTerm, setSearchTerm] = React.useState("");
	const [companyFilter, setCompanyFilter] = React.useState<string>("all");
	const [statusFilter, setStatusFilter] = React.useState<string>("all");

	// Load data on mount
	useEffect(() => {
		loadProjects();
		loadCompanies();
	}, [loadProjects, loadCompanies]);

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
								onChange={(e) => setSearchTerm(e.target.value)}
								className="pl-9"
								autoComplete="off"
							/>
						</div>

						{/* Filter Bar */}
						<div className="flex flex-wrap gap-3">
							<Select value={companyFilter} onValueChange={setCompanyFilter}>
								<SelectTrigger className="w-[180px]">
									<Building2 className="h-4 w-4 mr-2" />
									<SelectValue placeholder="All Companies" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Companies</SelectItem>
									{companies.map((company) => (
										<SelectItem key={company.id} value={company.name}>
											{company.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							<Select value={statusFilter} onValueChange={setStatusFilter}>
								<SelectTrigger className="w-[180px]">
									<Filter className="h-4 w-4 mr-2" />
									<SelectValue placeholder="All Status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Status</SelectItem>
									<SelectItem value="Active">Active</SelectItem>
									<SelectItem value="Completed">Completed</SelectItem>
									<SelectItem value="On Hold">On Hold</SelectItem>
									<SelectItem value="In Preparation">In Preparation</SelectItem>
									<SelectItem value="In Development">In Development</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</CardContent>
				</Card>

				<AssessmentListContainer
					searchTerm={searchTerm}
					companyFilter={companyFilter}
					statusFilter={statusFilter}
				/>
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
 * Connects to project store and applies filters
 */
const AssessmentListContainer = memo(function AssessmentListContainer({
	searchTerm,
	companyFilter,
	statusFilter,
}: {
	searchTerm: string;
	companyFilter: string;
	statusFilter: string;
}) {
	const { filteredProjects } = useProjectActions();

	// Apply filters
	const filtered = useMemo(() => {
		let projects = filteredProjects();

		// Search filter
		if (searchTerm.trim()) {
			const search = searchTerm.toLowerCase();
			projects = projects.filter(
				(p) =>
					p.name.toLowerCase().includes(search) ||
					(p.companyName || p.client).toLowerCase().includes(search) ||
					(p.locationName || p.location).toLowerCase().includes(search)
			);
		}

		// Company filter
		if (companyFilter !== "all") {
			projects = projects.filter((p) => 
				(p.companyName || p.client) === companyFilter
			);
		}

		// Status filter
		if (statusFilter !== "all") {
			projects = projects.filter((p) => p.status === statusFilter);
		}

		return projects;
	}, [filteredProjects, searchTerm, companyFilter, statusFilter]);

	return <AssessmentList projects={filtered} loading={false} />;
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
