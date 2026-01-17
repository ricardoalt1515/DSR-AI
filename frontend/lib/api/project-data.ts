/**
 * API client for flexible project data management.
 * Handles JSONB project_data field with custom sections and quality parameters.
 */

import { apiClient } from "./client";

// Type definitions matching backend JSONB structure
export interface QualityParameter {
	value: number;
	unit: string;
}

export interface CustomSection {
	id: string;
	title: string;
	order: number;
	fields: Array<{
		id: string;
		label: string;
		value: unknown;
		type?: "text" | "number" | "select" | "textarea";
	}>;
}

export interface ProjectData {
	// Basic info
	basic_info?: {
		company_name?: string;
		location?: string;
		[key: string]: unknown;
	};

	// Water quality parameters
	quality?: {
		[paramName: string]: QualityParameter;
	};

	// Custom sections
	sections?: CustomSection[];

	// Allow any additional fields
	[key: string]: unknown;
}

export interface ProjectDataResponse {
	project_id?: string;
	projectId?: string;
	data?: ProjectData;
}

export interface ProjectDataSyncResponse {
	message?: string;
	project_id?: string;
	projectId?: string;
	updated_at?: string;
	updatedAt?: string;
	progress?: number;
}

export interface ProjectDataSyncResult {
	projectId: string;
	updatedAt?: string;
	progress?: number;
}

/**
 * API class for project data operations
 */
export const projectDataAPI = {
	/**
	 * Get all project data
	 */
	async getData(projectId: string): Promise<ProjectData> {
		const response = await apiClient.get<ProjectDataResponse>(
			`/projects/${projectId}/data`,
		);
		if ("data" in response) {
			return response.data ?? {};
		}
		return response as unknown as ProjectData;
	},

	/**
	 * Update project data (merge by default)
	 */
	async updateData(
		projectId: string,
		updates: Partial<ProjectData>,
		merge: boolean = true,
	): Promise<ProjectDataSyncResult> {
		const response = await apiClient.patch<ProjectDataSyncResponse>(
			`/projects/${projectId}/data?merge=${merge}`,
			updates,
		);
		const result: ProjectDataSyncResult = {
			projectId: response.projectId ?? response.project_id ?? projectId,
		};

		const updatedAt = response.updatedAt ?? response.updated_at;
		if (updatedAt) result.updatedAt = updatedAt;

		if (typeof response.progress === "number")
			result.progress = response.progress;

		return result;
	},

	/**
	 * Add a water quality parameter
	 */
	async addQualityParameter(
		projectId: string,
		name: string,
		value: number,
		unit: string,
	): Promise<ProjectDataSyncResult> {
		const updates = {
			quality: {
				[name]: { value, unit },
			},
		};
		return projectDataAPI.updateData(projectId, updates, true);
	},

	/**
	 * Delete a water quality parameter
	 */
	async deleteQualityParameter(
		projectId: string,
		paramName: string,
	): Promise<ProjectDataSyncResult> {
		// Get current data
		const currentData = await projectDataAPI.getData(projectId);

		// Remove parameter
		if (currentData.quality) {
			delete currentData.quality[paramName];
		}

		// Update with modified data
		return projectDataAPI.updateData(projectId, currentData, false);
	},

	/**
	 * Add a custom section
	 */
	async addSection(
		projectId: string,
		section: Omit<CustomSection, "order">,
	): Promise<ProjectDataSyncResult> {
		const currentData = await projectDataAPI.getData(projectId);
		const sections = currentData.sections || [];

		const newSection: CustomSection = {
			...section,
			order: sections.length,
		};

		const updates = {
			sections: [...sections, newSection],
		};

		return projectDataAPI.updateData(projectId, updates, true);
	},

	/**
	 * Delete a custom section
	 */
	async deleteSection(
		projectId: string,
		sectionId: string,
	): Promise<ProjectDataSyncResult> {
		const currentData = await projectDataAPI.getData(projectId);

		if (currentData.sections) {
			// Filter out the section
			const sections = currentData.sections.filter((s) => s.id !== sectionId);

			// Reorder
			sections.forEach((s, idx) => {
				s.order = idx;
			});

			// Update
			return projectDataAPI.updateData(projectId, { sections }, true);
		}
		return {
			projectId,
		};
	},

	/**
	 * Update a specific field by path (e.g., "basic_info.company_name")
	 */
	async updateField(
		projectId: string,
		path: string,
		value: unknown,
	): Promise<ProjectDataSyncResult> {
		const keys = path.split(".");
		const updates: Record<string, unknown> = {};

		let current: Record<string, unknown> = updates;
		for (let i = 0; i < keys.length - 1; i++) {
			const key = keys[i];
			if (key) {
				const next: Record<string, unknown> = {};
				current[key] = next;
				current = next;
			}
		}
		const lastKey = keys[keys.length - 1];
		if (lastKey) {
			current[lastKey] = value;
		}

		return projectDataAPI.updateData(projectId, updates, true);
	},
};
