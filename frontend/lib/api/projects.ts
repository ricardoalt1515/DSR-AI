import type {
	ProjectDetail,
	ProjectFile,
	ProjectSummary,
} from "../project-types";
import { apiClient } from "./client";
import type { PaginatedResponse } from "./index";

type JsonObject = Record<string, unknown>;

export type ProjectListParams = {
	page?: number;
	size?: number;
	search?: string;
	status?: string;
	sector?: string;
	companyId?: string; // Filter by company
	locationId?: string; // Filter by location
	lifecycleState?: "active" | "pipeline" | "completed" | "archived";
	includeArchived?: boolean;
};

type CreateProjectPayload = JsonObject & {
	locationId: string; // Required - FK to location (source of truth)
	name: string;
	projectType?: string; // Default: "Assessment"
	description?: string;
	tags?: string[];
	// NOTE: sector, subsector, client, location are inherited from Location → Company
	// No need to send them - backend populates automatically
};

type UpdateProjectPayload = JsonObject &
	Partial<CreateProjectPayload> & {
		status?: ProjectSummary["status"];
		progress?: number;
	};

export type PipelineStageStats = {
	count: number;
	avgProgress: number;
};

export type DashboardStats = {
	totalProjects: number;
	inPreparation: number;
	generating: number;
	ready: number;
	completed: number;
	avgProgress: number;
	totalBudget: number;
	lastUpdated: string | null;
	pipelineStages: Partial<Record<string, PipelineStageStats>>;
};

export class ProjectsAPI {
	static async getProjects(
		params?: ProjectListParams,
	): Promise<PaginatedResponse<ProjectSummary>> {
		const searchParams = new URLSearchParams();

		if (params?.page) searchParams.append("page", params.page.toString());
		if (params?.size) searchParams.append("size", params.size.toString());
		if (params?.search) searchParams.append("search", params.search);
		if (params?.status) searchParams.append("status", params.status);
		if (params?.sector) searchParams.append("sector", params.sector);
		if (params?.companyId) searchParams.append("company_id", params.companyId);
		if (params?.locationId) searchParams.append("location_id", params.locationId);
		if (params?.lifecycleState) {
			searchParams.append("lifecycle_state", params.lifecycleState);
		}
		if (typeof params?.includeArchived === "boolean") {
			searchParams.append(
				"include_archived",
				params.includeArchived ? "true" : "false",
			);
		}

		const query = searchParams.toString();
		const url = query ? `/projects?${query}` : "/projects";

		return apiClient.get<PaginatedResponse<ProjectSummary>>(url);
	}

	static async getProject(id: string): Promise<ProjectDetail> {
		return apiClient.get<ProjectDetail>(`/projects/${id}`);
	}

	static async getStats(): Promise<DashboardStats> {
		return apiClient.get<DashboardStats>("/projects/stats");
	}

	static async createProject(
		data: CreateProjectPayload,
	): Promise<ProjectDetail> {
		return apiClient.post<ProjectDetail>("/projects", data as any);
	}

	static async updateProject(
		id: string,
		data: UpdateProjectPayload,
	): Promise<ProjectDetail> {
		return apiClient.patch<ProjectDetail>(`/projects/${id}`, data as any);
	}

	static async deleteProject(id: string): Promise<void> {
		await apiClient.delete<void>(`/projects/${id}`);
	}

	static async archiveProject(id: string): Promise<ProjectDetail> {
		return apiClient.post<ProjectDetail>(`/projects/${id}/archive`, {});
	}

	static async restoreProject(id: string): Promise<ProjectDetail> {
		return apiClient.post<ProjectDetail>(`/projects/${id}/restore`, {});
	}

	// ❌ REMOVED: Proposal methods (getProposals, createProposal, updateProposal, deleteProposal)
	// ✅ USE INSTEAD: ProposalsAPI from '@/lib/api/proposals'
	// ProposalsAPI provides complete proposal management with PDF generation, AI metadata, and polling utilities

	static async getFiles(projectId: string): Promise<ProjectFile[]> {
		return apiClient.get<ProjectFile[]>(`/projects/${projectId}/files`);
	}

	static async uploadFile(
		projectId: string,
		file: File,
		metadata?: {
			description?: string;
			category?: string;
		},
	): Promise<ProjectFile> {
		return apiClient.uploadFile<ProjectFile>(
			`/projects/${projectId}/files`,
			file,
			metadata,
		);
	}

	static async deleteFile(projectId: string, fileId: string): Promise<void> {
		await apiClient.delete<void>(`/projects/${projectId}/files/${fileId}`);
	}

	static async getTimeline(
		projectId: string,
		limit: number = 50,
	): Promise<any[]> {
		return apiClient.get<any[]>(
			`/projects/${projectId}/timeline?limit=${limit}`,
		);
	}
}

export const projectsAPI = ProjectsAPI;
