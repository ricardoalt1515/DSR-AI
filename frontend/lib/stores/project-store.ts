import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";
import type { ProjectDetail, ProjectSummary } from "@/lib/project-types";
import { logger } from "@/lib/utils/logger";
import {
	type DashboardStats,
	type ProjectListParams,
	projectsAPI,
} from "../api/projects";

const mapProjectSummary = (
	project: ProjectSummary | ProjectDetail,
): ProjectSummary => {
	const summary = project as ProjectSummary;
	const detail = project as ProjectDetail;
	const camelProject = project as ProjectSummary & {
		projectType?: string;
		scheduleSummary?: string;
		budget?: number;
	};

	const normalizedCompanyName =
		project.companyName || project.client || "";
	const normalizedLocationName =
		project.locationName || project.location || "";
	const normalizedLifecycleState =
		detail.lifecycleState ??
		summary.lifecycleState ??
		(project as { lifecycleState?: LifecycleState }).lifecycleState ??
		"active";
	const normalizedArchivedAt =
		detail.archivedAt ??
		summary.archivedAt ??
		(project as { archivedAt?: string | null }).archivedAt ??
		null;
	const normalizedIsArchived =
		typeof detail.isArchived === "boolean"
			? detail.isArchived
			: typeof summary.isArchived === "boolean"
				? summary.isArchived
				: (project as { isArchived?: boolean }).isArchived ?? false;
	const projectType =
		camelProject.projectType ||
		summary.projectType ||
		detail.projectType ||
		(project as { type?: string }).type ||
		"Assessment";
	const scheduleSummary =
		detail.scheduleSummary || summary.scheduleSummary || "To be defined";
	const budgetValue =
		typeof detail.budget === "number"
			? detail.budget
			: typeof summary.budget === "number"
				? summary.budget
				: camelProject.budget || 0;
	return {
		id: project.id,
		name: project.name,
		locationId: project.locationId,
		// Hierarchy fields (inherited from Company → Location)
		companyName: normalizedCompanyName,
		locationName: normalizedLocationName,
		client: project.client || normalizedCompanyName,
		location: project.location || normalizedLocationName,
		sector: project.sector,
		subsector: project.subsector || "",
		// Status & progress
		status: project.status,
		progress: typeof project.progress === "number" ? project.progress : 0,
		lifecycleState: normalizedLifecycleState,
		isArchived: normalizedIsArchived,
		archivedAt: normalizedArchivedAt,
		// Metadata
		createdAt: project.createdAt,
		updatedAt: project.updatedAt,
		type: projectType,
		projectType,
		scheduleSummary,
		budget: budgetValue,
		description: project.description ?? "",
		proposalsCount:
			typeof summary.proposalsCount === "number"
				? summary.proposalsCount
				: Array.isArray(detail.proposals)
					? detail.proposals.length
					: 0,
		tags: Array.isArray(project.tags) ? project.tags : [],
	};
};

type LifecycleState = ProjectSummary["lifecycleState"];

type ProjectFilters = {
	status?: string;
	sector?: string;
	search?: string;
	companyId?: string;
	locationId?: string;
	lifecycleState?: LifecycleState;
	includeArchived?: boolean;
};

type LoadProjectsOptions = {
	force?: boolean;
};

type CreateProjectInput = Partial<ProjectSummary> & {
	budget?: number;
	scheduleSummary?: string;
};

interface ProjectState {
	// State
	projects: ProjectSummary[];
	currentProject: ProjectDetail | null;
	loading: boolean;
	error: string | null;
	dataSource: "api" | "mock";
	dashboardStats: DashboardStats | null;
	lifecycleCounts: Record<LifecycleState, number>;
	_lastRequestToken: number;

	// Pagination state
	page: number;
	pageSize: number;
	totalPages: number;
	totalProjects: number;
	hasMore: boolean;

	// Filters state
	filters: ProjectFilters;

	// Actions
	loadProjects: (
		page?: number,
		append?: boolean,
		options?: LoadProjectsOptions,
	) => Promise<void>;
	loadMore: () => Promise<void>;
	setFilter: (key: keyof ProjectFilters, value: ProjectFilters[typeof key]) => void;
	loadProject: (id: string) => Promise<void>;
	loadDashboardStats: () => Promise<void>;
	createProject: (projectData: CreateProjectInput) => Promise<ProjectSummary>;
	updateProject: (
		id: string,
		updates: Partial<ProjectSummary>,
	) => Promise<void>;
	deleteProject: (id: string) => Promise<void>;
	archiveProject: (id: string) => Promise<ProjectSummary>;
	restoreProject: (id: string) => Promise<ProjectSummary>;

	// Utility actions
	clearError: () => void;
	setLoading: (loading: boolean) => void;
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
			lifecycleCounts: {
				active: 0,
				pipeline: 0,
				completed: 0,
				archived: 0,
			},
			_lastRequestToken: 0,

			archiveProject: async (id: string) => {
				try {
					const archived = await projectsAPI.archiveProject(id);
					const summary = mapProjectSummary(archived);

					set((state) => {
						state.projects = state.projects.map((project) =>
							project.id === id ? { ...project, ...summary } : project,
						);
						if (state.currentProject?.id === id) {
							state.currentProject = {
								...state.currentProject,
								...archived,
								archivedAt: archived.archivedAt ?? null,
								isArchived: true,
								lifecycleState: archived.lifecycleState ?? summary.lifecycleState,
							};
						}
						state.dataSource = "api";
					});

					void get().loadProjects(get().page, false, { force: true });
					return summary;
				} catch (error) {
					logger.error("Failed to archive project", error, "ProjectStore");
					set((state) => {
						state.error =
							error instanceof Error ? error.message : "Error al archivar proyecto";
					});
					throw error;
				}
			},

			restoreProject: async (id: string) => {
				try {
					const restored = await projectsAPI.restoreProject(id);
					const summary = mapProjectSummary(restored);

					set((state) => {
						state.projects = state.projects.map((project) =>
							project.id === id ? { ...project, ...summary } : project,
						);
						if (state.currentProject?.id === id) {
							state.currentProject = {
								...state.currentProject,
								...restored,
								archivedAt: restored.archivedAt ?? null,
								isArchived: false,
								lifecycleState: restored.lifecycleState ?? summary.lifecycleState,
							};
						}
						state.dataSource = "api";
					});

					void get().loadProjects(get().page, false, { force: true });
					return summary;
				} catch (error) {
					logger.error("Failed to restore project", error, "ProjectStore");
					set((state) => {
						state.error =
							error instanceof Error ? error.message : "Error al restaurar proyecto";
					});
					throw error;
				}
			},

			// Pagination initial state
			page: 1,
			pageSize: 50,
			totalPages: 0,
			totalProjects: 0,
			hasMore: false,

			// Filters initial state
			filters: { includeArchived: false },

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
			loadProjects: async (
				page = 1,
				append = false,
				options: LoadProjectsOptions = {},
			) => {
				const state = get();
				if (state.loading && !options.force) {
					return; // Already loading, skip
				}

				const previousProjects = state.projects;
				const requestToken = state._lastRequestToken + 1;
				set((draft) => {
					draft.loading = true;
					draft.error = null;
					draft._lastRequestToken = requestToken;
				});

				try {
					const { filters, pageSize } = get();

					const params: ProjectListParams = {
						page,
						size: pageSize,
					};

					if (filters.status) params.status = filters.status;
					if (filters.sector) params.sector = filters.sector;
					if (filters.search) params.search = filters.search;
					if (filters.companyId) params.companyId = filters.companyId;
					if (filters.locationId) params.locationId = filters.locationId;
					if (filters.lifecycleState) params.lifecycleState = filters.lifecycleState;
					if (typeof filters.includeArchived === "boolean") {
						params.includeArchived = filters.includeArchived;
					}

					const response = await projectsAPI.getProjects(params);

					if (get()._lastRequestToken !== requestToken) {
						return;
					}

					const items = response.items?.map(mapProjectSummary) ?? [];

					set((draft) => {
						if (append) {
							const existingIds = new Set(draft.projects.map((p) => p.id));
							const newItems = items.filter((item) => !existingIds.has(item.id));
							draft.projects = [...draft.projects, ...newItems];
						} else {
							draft.projects = items;
						}

						draft.page = page;
						draft.totalPages = response.pages ?? 0;
						draft.totalProjects = response.total ?? 0;
						draft.hasMore = page < (response.pages ?? 0);
						const counts = (
							(response.meta as {
								lifecycle_counts?: Partial<Record<LifecycleState, number>>;
							})?.lifecycle_counts ?? {}
						) as Partial<Record<LifecycleState, number>>;
						draft.lifecycleCounts = {
							active: counts.active ?? 0,
							pipeline: counts.pipeline ?? 0,
							completed: counts.completed ?? 0,
							archived: counts.archived ?? 0,
						};

						draft.loading = false;
						draft.dataSource = "api";
					});
				} catch (error) {
					logger.error("Failed to load projects", error, "ProjectStore");
					if (get()._lastRequestToken !== requestToken) {
						return;
					}
					set((draft) => {
						draft.projects = previousProjects;
						draft.loading = false;
						draft.dataSource = "api";
						draft.error =
							error instanceof Error ? error.message : "Error al cargar proyectos";
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
			setFilter: (key, value) => {
				set((draft) => {
					if (value === undefined || value === null) {
						delete draft.filters[key];
					} else {
						draft.filters[key] = value as never;
					}
					draft.page = 1;
				});
				void get().loadProjects(1, false, { force: true });
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
							error instanceof Error
								? error.message
								: "Error al cargar proyecto";
					});
				}
			},

			createProject: async (projectData: CreateProjectInput) => {
				set((state) => {
					state.loading = true;
					state.error = null;
				});

				try {
					// Simplified payload: only locationId and name required
					// sector, subsector, client, location inherited from Location → Company
					const payload = {
						locationId: projectData.locationId!,  // Required
						name: projectData.name ?? "New Assessment",
						projectType: "Assessment",
						description: projectData.description ?? "",
						budget: projectData.budget ?? 0,
						scheduleSummary: projectData.scheduleSummary ?? "To be defined",
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
								: "Error al crear proyecto";
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
								: "Error al actualizar proyecto";
					});
					throw error;
				}
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
								: "Error al eliminar proyecto";
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
			onRehydrateStorage: () => (state) => {
				if (!state) return;
				// Ensure server data reflects persisted filters after hydration
				void state
					.loadProjects(1, false, { force: true })
					.catch((error) => {
						logger.error(
							"Failed to reload projects after hydration",
							error,
							"ProjectStore",
						);
					});
			},
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

export const useLifecycleCounts = () =>
	useProjectStore((state) => state.lifecycleCounts);

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
			deleteProject: state.deleteProject,
			archiveProject: state.archiveProject,
			restoreProject: state.restoreProject,
			clearError: state.clearError,
			setLoading: state.setLoading,
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

export const useFilters = () =>
	useProjectStore((state) => state.filters);

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
	const loadDashboardStats = useProjectStore((state) => state.loadDashboardStats);

	useEffect(() => {
		// Load stats if not already loaded
		if (!stats) {
			void loadDashboardStats();
		}
	}, [stats, loadDashboardStats]);

	return stats;
};
