import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";
import type { ProjectDetail, ProjectSummary } from "@/lib/project-types";
import { logger } from "@/lib/utils/logger";
import { type DashboardStats, projectsAPI } from "../api/projects";
import { PROJECT_STATUS_GROUPS } from "../project-status";

export const DEFAULT_PAGE_SIZE = 20;
const UUID_REGEX =
	/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

const sanitizeFilters = (filters: ProjectState["filters"]) => {
	const next = { ...filters };

	// Drop companyId if persisted as name (pre-migration) or invalid UUID
	if (next.companyId && !UUID_REGEX.test(next.companyId)) {
		delete next.companyId;
	}

	return next;
};

const mapProjectSummary = (
	project: ProjectSummary | ProjectDetail,
): ProjectSummary => {
	const summary = project as ProjectSummary;
	const detail = project as ProjectDetail;

	return {
		id: project.id,
		name: project.name,
		locationId: project.locationId,
		// Hierarchy fields (inherited from Company → Location)
		companyName: project.companyName || project.client || "", // Prefer new field
		locationName: project.locationName || project.location || "", // Prefer new field
		client: project.client || project.companyName || "", // Legacy fallback
		location: project.location || project.locationName || "", // Legacy fallback
		sector: project.sector,
		subsector: project.subsector || "",
		// Status & progress
		status: project.status,
		progress: typeof project.progress === "number" ? project.progress : 0,
		// Metadata
		createdAt: project.createdAt,
		updatedAt: project.updatedAt,
		type: project.type ?? "Assessment",
		description: project.description ?? "",
		proposalsCount:
			typeof summary.proposalsCount === "number"
				? summary.proposalsCount
				: Array.isArray(detail.proposals)
					? detail.proposals.length
					: 0,
		filesCount:
			typeof summary.filesCount === "number"
				? summary.filesCount
				: Array.isArray(detail.files)
					? detail.files.length
					: 0,
		tags: Array.isArray(project.tags) ? project.tags : [],
	};
};

interface ProjectState {
	// State
	projects: ProjectSummary[];
	currentProject: ProjectDetail | null;
	loading: boolean;
	error: string | null;
	dataSource: "api" | "mock";
	dashboardStats: DashboardStats | null;

	// Pagination state
	page: number;
	pageSize: number;
	totalPages: number;
	totalProjects: number;
	hasMore: boolean;

	// Filters state
	filters: {
		status?: string;
		sector?: string;
		search?: string;
		companyId?: string;
	};

	filteredProjects: (
		filter?: keyof typeof PROJECT_STATUS_GROUPS,
		search?: string,
	) => ProjectSummary[];

	// Actions
	loadProjects: (page?: number, append?: boolean) => Promise<void>;
	loadMore: () => Promise<void>;
	setFilter: (
		key: "status" | "sector" | "search" | "companyId",
		value: string | undefined,
	) => void;
	loadProject: (id: string) => Promise<void>;
	loadDashboardStats: () => Promise<void>;
	createProject: (
		projectData: Partial<ProjectSummary>,
	) => Promise<ProjectSummary>;
	updateProject: (
		id: string,
		updates: Partial<ProjectSummary>,
	) => Promise<void>;
	updateProjectProgress: (id: string, progress: number) => void;
	deleteProject: (id: string) => Promise<void>;

	// Utility actions
	clearError: () => void;
	setLoading: (loading: boolean) => void;
	resetStore: () => void;
}

const storage =
	typeof window === "undefined"
		? undefined
		: createJSONStorage(() => localStorage);

export const useProjectStore = create<ProjectState>()(
	persist(
		immer((set, get) => ({
			// Initial state
			projects: [],
			currentProject: null,
			loading: false,
			error: null,
			dataSource: "api",
			dashboardStats: null,

			// Pagination initial state
			page: 1,
			pageSize: DEFAULT_PAGE_SIZE,
			totalPages: 0,
			totalProjects: 0,
			hasMore: false,

			// Filters initial state
			filters: {},

			filteredProjects: (filter = "all", search = "") => {
				const projects = get().projects;
				const allowedStatuses =
					PROJECT_STATUS_GROUPS[filter] ?? PROJECT_STATUS_GROUPS.all ?? [];

				return projects.filter((project) => {
					const normalizedSearch = search.trim().toLowerCase();
					const matchesSearch =
						normalizedSearch === "" ||
						project.name.toLowerCase().includes(normalizedSearch) ||
						project.client.toLowerCase().includes(normalizedSearch) ||
						project.location.toLowerCase().includes(normalizedSearch);

					const matchesFilter =
						allowedStatuses.length > 0
							? allowedStatuses.includes(project.status)
							: true;

					return matchesSearch && matchesFilter;
				});
			},

			// Load dashboard stats from backend
			loadDashboardStats: async () => {
				try {
					const stats = await projectsAPI.getStats();
					set((state) => {
						state.dashboardStats = stats;
					});
				} catch (error) {
					const message =
						error instanceof Error ? error.message : "Failed to load stats";
					logger.error("Failed to load dashboard stats", error, "ProjectStore");
					set((state) => {
						state.error = message;
					});
				}
			},

			// Load projects from API with pagination and filters
			loadProjects: async (page = 1, append = false) => {
				const state = get();
				if (state.loading) {
					return; // Already loading, skip
				}

				// Set loading IMMEDIATELY to prevent race condition
				set({ loading: true, error: null });

				try {
					const filters = sanitizeFilters(state.filters);
					const { pageSize } = state;

					// Build params object, only include defined values
					const params: {
						page: number;
						size: number;
						status?: string;
						sector?: string;
						companyId?: string;
					} = {
						page,
						size: pageSize,
					};

					if (filters.status) params.status = filters.status;
					if (filters.sector) params.sector = filters.sector;
					if (filters.companyId) params.companyId = filters.companyId;

					const response = await projectsAPI.getProjects(params);

					const items = response.items?.map(mapProjectSummary) ?? [];

					set((draft) => {
						// Append or replace projects
						if (append) {
							// Deduplicate by ID when appending
							const existingIds = new Set(draft.projects.map((p) => p.id));
							const newItems = items.filter(
								(item) => !existingIds.has(item.id),
							);
							draft.projects = [...draft.projects, ...newItems];
						} else {
							draft.projects = items;
						}

						// Update pagination metadata
						draft.page = page;
						draft.totalPages = response.pages ?? 0;
						draft.totalProjects = response.total ?? 0;
						draft.hasMore = page < (response.pages ?? 0);

						draft.loading = false;
						draft.dataSource = "api";
					});
				} catch (error) {
					logger.error("Failed to load projects", error, "ProjectStore");
					set({
						projects: append ? get().projects : [],
						loading: false,
						dataSource: "api",
						error:
							error instanceof Error ? error.message : "Error loading projects",
					});
				}
			},

			// Load more projects (next page)
			loadMore: async () => {
				const state = get();
				if (!state.hasMore || state.loading) {
					return;
				}
				await state.loadProjects(state.page + 1, true);
			},

			// Set filter and reload from page 1
			setFilter: (
				key: "status" | "sector" | "search" | "companyId",
				value: string | undefined,
			) => {
				set((draft) => {
					if (value === undefined) {
						delete draft.filters[key];
					} else {
						draft.filters[key] = value;
					}
					draft.filters = sanitizeFilters(draft.filters);
					draft.page = 1;
				});
				// Trigger reload with new filters
				void get().loadProjects(1, false);
			},

			loadProject: async (id: string) => {
				set((state) => {
					state.loading = true;
					state.error = null;
				});

				try {
					const project = await projectsAPI.getProject(id);
					set((state) => {
						state.currentProject = {
							...project,
							proposals: project.proposals ?? [],
							timeline: project.timeline ?? [],
							files: project.files ?? [],
							technicalSections: project.technicalSections ?? [],
						};
						state.loading = false;
						state.dataSource = "api";
					});
				} catch (error) {
					logger.error("Failed to load project", error, "ProjectStore");
					set((state) => {
						state.currentProject = null;
						state.loading = false;
						state.error =
							error instanceof Error ? error.message : "Failed to load project";
					});
				}
			},

			createProject: async (projectData: Partial<ProjectSummary>) => {
				set((state) => {
					state.loading = true;
					state.error = null;
				});

				try {
					// Simplified payload: only locationId and name required
					// sector, subsector, client, location inherited from Location → Company
					const payload = {
						locationId: projectData.locationId!, // Required
						name: projectData.name ?? "New Assessment",
						projectType: "Assessment",
						description: projectData.description ?? "",
						tags: projectData.tags ?? [],
					};

					const created = await projectsAPI.createProject(payload);
					const summary = mapProjectSummary(created);

					set((state) => {
						state.projects = [summary, ...state.projects];
						state.loading = false;
						state.dataSource = "api";
					});

					return summary;
				} catch (error) {
					logger.error("Failed to create project", error, "ProjectStore");
					set((state) => {
						state.loading = false;
						state.error =
							error instanceof Error
								? error.message
								: "Failed to create project";
					});
					throw error; // Re-throw para que el componente lo maneje
				}
			},

			updateProject: async (id: string, updates: Partial<ProjectSummary>) => {
				try {
					const updated = await projectsAPI.updateProject(id, updates);
					const summary = mapProjectSummary(updated);

					set((state) => {
						// Update project in list
						const idx = state.projects.findIndex((p) => p.id === id);
						if (idx !== -1) {
							state.projects[idx] = { ...state.projects[idx], ...summary };
						}

						// Update current project if viewing it
						if (state.currentProject?.id === id) {
							state.currentProject = {
								...state.currentProject,
								...updated,
								proposals: updated.proposals ?? state.currentProject.proposals,
								timeline: updated.timeline ?? state.currentProject.timeline,
								files: updated.files ?? state.currentProject.files,
								technicalSections:
									updated.technicalSections ??
									state.currentProject.technicalSections,
								updatedAt: summary.updatedAt,
							};
						}

						state.dataSource = "api";
					});
				} catch (error) {
					logger.error("Failed to update project", error, "ProjectStore");
					set((state) => {
						state.error =
							error instanceof Error
								? error.message
								: "Failed to update project";
					});
					throw error;
				}
			},

			updateProjectProgress: (id: string, progress: number) => {
				set((state) => {
					const idx = state.projects.findIndex((project) => project.id === id);
					if (idx !== -1 && state.projects[idx]) {
						state.projects[idx].progress = progress;
					}

					if (state.currentProject?.id === id) {
						state.currentProject.progress = progress;
					}
				});
			},

			deleteProject: async (id: string) => {
				// Optimistic update: remove immediately from UI
				const previousState = get().projects;
				const previousCurrent = get().currentProject;

				set((state) => {
					state.projects = state.projects.filter((p) => p.id !== id);
					if (state.currentProject?.id === id) {
						state.currentProject = null;
					}
				});

				try {
					await projectsAPI.deleteProject(id);
					// Success: keep the optimistic update
					set((state) => {
						state.dataSource = "api";
						state.error = null;
					});
				} catch (error) {
					// Rollback optimistic update on error
					logger.error(
						"Failed to delete project, rolling back",
						error,
						"ProjectStore",
					);
					set((state) => {
						state.projects = previousState;
						state.currentProject = previousCurrent;
						state.error =
							error instanceof Error
								? error.message
								: "Failed to delete project";
						state.dataSource = "mock";
					});
					throw error;
				}
			},

			// ❌ REMOVED: Proposal actions (addProposal, updateProposal, deleteProposal, etc.)
			// ✅ USE INSTEAD: ProposalsAPI from '@/lib/api/proposals'
			// After proposal operations, call loadProject(id) to refresh data

			clearError: () => {
				set((state) => {
					state.error = null;
				});
			},

			setLoading: (loading: boolean) => {
				set((state) => {
					state.loading = loading;
				});
			},

			resetStore: () => {
				set((state) => {
					state.projects = [];
					state.currentProject = null;
					state.loading = false;
					state.error = null;
					state.dashboardStats = null;
					state.page = 1;
					state.totalPages = 0;
					state.totalProjects = 0;
					state.hasMore = false;
					state.filters = {};
					state.dataSource = "api";
				});
			},
		})),
		{
			name: "h2o-project-store",
			storage,
			partialize: (state) => ({
				// Only persist filters and preferences, NOT projects
				filters: state.filters,
				pageSize: state.pageSize,
				// Don't persist: projects, currentProject, loading, error, pagination state
			}),
		},
	),
);

// Selectors for better performance
export const useProjects = () =>
	useProjectStore((state) => state?.projects ?? []);
export const useCurrentProject = () =>
	useProjectStore((state) => state?.currentProject ?? null);
export const useDashboardStats = () =>
	useProjectStore((state) => state?.dashboardStats);
export const useProjectLoading = () =>
	useProjectStore((state) => state?.loading ?? false);
export const useProjectError = () =>
	useProjectStore((state) => state?.error ?? null);

// Actions
export const useProjectActions = () =>
	useProjectStore(
		useShallow((state) => ({
			loadProjects: state.loadProjects,
			loadMore: state.loadMore,
			setFilter: state.setFilter,
			loadProject: state.loadProject,
			loadDashboardStats: state.loadDashboardStats,
			createProject: state.createProject,
			updateProject: state.updateProject,
			updateProjectProgress: state.updateProjectProgress,
			deleteProject: state.deleteProject,
			clearError: state.clearError,
			setLoading: state.setLoading,
			filteredProjects: state.filteredProjects,
		})),
	);

// Pagination selectors
export const usePagination = () =>
	useProjectStore(
		useShallow((state) => ({
			page: state.page,
			pageSize: state.pageSize,
			totalPages: state.totalPages,
			totalProjects: state.totalProjects,
			hasMore: state.hasMore,
		})),
	);

export const useFilters = () => useProjectStore((state) => state.filters);

export const useLoadProjectAction = () =>
	useProjectStore((state) => state.loadProject);

export const useProjectDataSource = () =>
	useProjectStore((state) => state.dataSource);

export const useEnsureProjectsLoaded = () => {
	const projectsCount = useProjectStore((state) => state.projects.length);
	const loading = useProjectStore((state) => state.loading);
	const error = useProjectStore((state) => state.error);
	const loadProjects = useProjectStore((state) => state.loadProjects);

	useEffect(() => {
		const hasToken =
			typeof window !== "undefined" && localStorage.getItem("access_token");

		// Load projects if: authenticated, not loading, no projects, no error
		// Store's loading state prevents race conditions (shared globally via Zustand)
		if (hasToken && !loading && projectsCount === 0 && !error) {
			void loadProjects();
		}
		// loadProjects is stable, no need in deps
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [loading, projectsCount, error, loadProjects]);
};

/**
 * Hook to get project stats from store
 * Auto-loads stats from backend if not already loaded
 */
export const useProjectStatsData = () => {
	const stats = useDashboardStats();
	const loadDashboardStats = useProjectStore(
		(state) => state.loadDashboardStats,
	);

	useEffect(() => {
		// Load stats if not already loaded
		if (!stats) {
			void loadDashboardStats();
		}
	}, [stats, loadDashboardStats]);

	return stats;
};
