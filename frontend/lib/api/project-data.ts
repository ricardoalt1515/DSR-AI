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
		value: any;
		type?: "text" | "number" | "select" | "textarea";
	}>;
}

export interface ProjectData {
	// Basic info
	basic_info?: {
		company_name?: string;
		location?: string;
		[key: string]: any;
	};

	// Water quality parameters
	quality?: {
		[paramName: string]: QualityParameter;
	};

	// Custom sections
	sections?: CustomSection[];

	// Allow any additional fields
	[key: string]: any;
}

export interface ProjectDataResponse {
	projectId: string;
	data: ProjectData;
}

export interface UpdateProjectDataResponse {
	message: string;
	data: ProjectData;
}

/**
 * API class for project data operations
 */
export class ProjectDataAPI {
	/**
	 * Get all project data
	 */
	static async getData(projectId: string): Promise<ProjectData> {
		const response = await apiClient.get<ProjectDataResponse>(
			`/projects/${projectId}/data`,
		);
		return response.data;
	}

	/**
	 * Update project data (merge by default)
	 */
	static async updateData(
		projectId: string,
		updates: Partial<ProjectData>,
		merge: boolean = true,
	): Promise<ProjectData> {
		const response = await apiClient.patch<UpdateProjectDataResponse>(
			`/projects/${projectId}/data?merge=${merge}`,
			updates,
		);
		return response.data;
	}

	/**
	 * Add a water quality parameter
	 */
	static async addQualityParameter(
		projectId: string,
		name: string,
		value: number,
		unit: string,
	): Promise<ProjectData> {
		const updates = {
			quality: {
				[name]: { value, unit },
			},
		};
		return ProjectDataAPI.updateData(projectId, updates, true);
	}

	/**
	 * Delete a water quality parameter
	 */
	static async deleteQualityParameter(
		projectId: string,
		paramName: string,
	): Promise<void> {
		// Get current data
		const currentData = await ProjectDataAPI.getData(projectId);

		// Remove parameter
		if (currentData.quality) {
			delete currentData.quality[paramName];
		}

		// Update with modified data
		await ProjectDataAPI.updateData(projectId, currentData, false);
	}

	/**
	 * Add a custom section
	 */
	static async addSection(
		projectId: string,
		section: Omit<CustomSection, "order">,
	): Promise<ProjectData> {
		const currentData = await ProjectDataAPI.getData(projectId);
		const sections = currentData.sections || [];

		const newSection: CustomSection = {
			...section,
			order: sections.length,
		};

		const updates = {
			sections: [...sections, newSection],
		};

		return ProjectDataAPI.updateData(projectId, updates, true);
	}

	/**
	 * Delete a custom section
	 */
	static async deleteSection(
		projectId: string,
		sectionId: string,
	): Promise<void> {
		const currentData = await ProjectDataAPI.getData(projectId);

		if (currentData.sections) {
			// Filter out the section
			const sections = currentData.sections.filter((s) => s.id !== sectionId);

			// Reorder
			sections.forEach((s, idx) => {
				s.order = idx;
			});

			// Update
			await ProjectDataAPI.updateData(projectId, { sections }, true);
		}
	}

	/**
	 * Update a specific field by path (e.g., "basic_info.company_name")
	 */
	static async updateField(
		projectId: string,
		path: string,
		value: any,
	): Promise<ProjectData> {
		const keys = path.split(".");
		const updates: any = {};

		let current = updates;
		for (let i = 0; i < keys.length - 1; i++) {
			const key = keys[i];
			if (key) {
				current[key] = {};
				current = current[key];
			}
		}
		const lastKey = keys[keys.length - 1];
		if (lastKey) {
			current[lastKey] = value;
		}

		return ProjectDataAPI.updateData(projectId, updates, true);
	}
}

// Export singleton instance for convenience
export const projectDataAPI = ProjectDataAPI;
