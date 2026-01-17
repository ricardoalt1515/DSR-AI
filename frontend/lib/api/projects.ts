import type {
	ProjectDetail,
	ProjectFile,
	ProjectFileDetail,
	ProjectSummary,
} from "../project-types";
import { getErrorMessage } from "../utils/logger";
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
};

export type CreateProjectPayload = JsonObject & {
	locationId: string; // Required - FK to location (source of truth)
	name: string;
	projectType?: string; // Default: "Assessment"
	description?: string;
	tags?: string[];
	// NOTE: sector, subsector, client, location are inherited from Location → Company
	// No need to send them - backend populates automatically
};

export type UpdateProjectPayload = JsonObject &
	Partial<CreateProjectPayload> & {
		status?: ProjectSummary["status"];
		progress?: number;
	};

export type DashboardStats = {
	total_projects: number;
	in_preparation: number;
	generating: number;
	proposal_ready: number;
	in_development: number;
	completed: number;
	on_hold: number;
	avg_progress: number;
};

export type ProjectFilesListResponse = {
	project_id: string;
	files: ProjectFile[];
	total: number;
};

export type ProjectFileUploadResponse = {
	id: string;
	filename: string;
	file_size: number;
	file_type: string;
	category: string;
	processing_status: string;
	uploaded_at: string;
	message: string;
};

export const projectsAPI = {
	async getProjects(
		params?: ProjectListParams,
	): Promise<PaginatedResponse<ProjectSummary>> {
		const searchParams = new URLSearchParams();

		if (params?.page) searchParams.append("page", params.page.toString());
		if (params?.size) searchParams.append("size", params.size.toString());
		if (params?.search) searchParams.append("search", params.search);
		if (params?.status) searchParams.append("status", params.status);
		if (params?.sector) searchParams.append("sector", params.sector);
		if (params?.companyId) searchParams.append("company_id", params.companyId);
		if (params?.locationId)
			searchParams.append("location_id", params.locationId);

		const query = searchParams.toString();
		const url = query ? `/projects?${query}` : "/projects";

		return apiClient.get<PaginatedResponse<ProjectSummary>>(url);
	},

	async getProject(id: string): Promise<ProjectDetail> {
		return apiClient.get<ProjectDetail>(`/projects/${id}`);
	},

	async getStats(): Promise<DashboardStats> {
		return apiClient.get<DashboardStats>("/projects/stats");
	},

	async createProject(data: CreateProjectPayload): Promise<ProjectDetail> {
		return apiClient.post<ProjectDetail>("/projects", data);
	},

	async updateProject(
		id: string,
		data: UpdateProjectPayload,
	): Promise<ProjectDetail> {
		return apiClient.patch<ProjectDetail>(`/projects/${id}`, data);
	},

	async deleteProject(id: string): Promise<void> {
		await apiClient.delete<void>(`/projects/${id}`);
	},

	// ❌ REMOVED: Proposal methods (getProposals, createProposal, updateProposal, deleteProposal)
	// ✅ USE INSTEAD: proposalsAPI from '@/lib/api/proposals'
	// proposalsAPI provides complete proposal management with PDF generation, AI metadata, and polling utilities

	async getFiles(projectId: string): Promise<ProjectFile[]> {
		const response = await apiClient.get<ProjectFilesListResponse>(
			`/projects/${projectId}/files`,
		);
		return response.files ?? [];
	},

	async uploadFile(
		projectId: string,
		file: File,
		metadata?: {
			category?: string;
			process_with_ai?: boolean;
		},
	): Promise<ProjectFileUploadResponse> {
		return apiClient.uploadFile<ProjectFileUploadResponse>(
			`/projects/${projectId}/files`,
			file,
			metadata,
		);
	},

	async deleteFile(projectId: string, fileId: string): Promise<void> {
		await apiClient.delete<void>(`/projects/${projectId}/files/${fileId}`);
	},

	async getFileDetail(
		projectId: string,
		fileId: string,
	): Promise<ProjectFileDetail> {
		return apiClient.get<ProjectFileDetail>(
			`/projects/${projectId}/files/${fileId}`,
		);
	},

	async downloadFileBlob(fileId: string): Promise<Blob> {
		// Backend always returns JSON with URL (works for both S3 and local)
		const response = await apiClient.get<{
			url: string;
			filename: string;
			mime_type: string;
		}>(`/projects/files/${fileId}/download`);

		// Fetch the blob from the URL (no auth headers - presigned URL handles auth)
		try {
			const blobResponse = await fetch(response.url);
			if (!blobResponse.ok) {
				throw new Error(`Failed to download file: ${blobResponse.status}`);
			}
			return await blobResponse.blob();
		} catch (error) {
			throw new Error(
				`Download failed: ${getErrorMessage(error, "Network error")}`,
			);
		}
	},

	async getTimeline(
		projectId: string,
		limit: number = 50,
	): Promise<JsonObject[]> {
		return apiClient.get<JsonObject[]>(
			`/projects/${projectId}/timeline?limit=${limit}`,
		);
	},
};
