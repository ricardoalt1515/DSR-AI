/**
 * Companies API client
 */

import type {
	CompanyCreate,
	CompanyDetail,
	CompanySummary,
	CompanyUpdate,
	LocationCreate,
	LocationDetail,
	LocationSummary,
	LocationUpdate,
} from "@/lib/types/company";
import { apiClient } from "./client";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPANIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class CompaniesAPI {
	/**
	 * List all companies
	 */
	static async list(): Promise<CompanySummary[]> {
		return apiClient.get<CompanySummary[]>("/companies");
	}

	/**
	 * Get company details with locations
	 */
	static async get(id: string): Promise<CompanyDetail> {
		return apiClient.get<CompanyDetail>(`/companies/${id}`);
	}

	/**
	 * Create a new company
	 */
	static async create(data: CompanyCreate): Promise<CompanyDetail> {
		return apiClient.post<CompanyDetail>(
			"/companies",
			data as unknown as Record<string, unknown>,
		);
	}

	/**
	 * Update company
	 */
	static async update(id: string, data: CompanyUpdate): Promise<CompanyDetail> {
		return apiClient.put<CompanyDetail>(
			`/companies/${id}`,
			data as unknown as Record<string, unknown>,
		);
	}

	/**
	 * Delete company (cascade deletes locations and projects)
	 */
	static async delete(id: string): Promise<{ message: string }> {
		return apiClient.delete(`/companies/${id}`);
	}
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LOCATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class LocationsAPI {
	private static buildListUrl(companyId?: string) {
		const searchParams = new URLSearchParams();
		if (companyId) {
			searchParams.append("company_id", companyId);
		}

		const query = searchParams.toString();
		return query ? `/companies/locations?${query}` : "/companies/locations";
	}

	/**
	 * List all locations (optionally filtered by company)
	 */
	static async listAll(companyId?: string): Promise<LocationSummary[]> {
		const url = this.buildListUrl(companyId);
		return apiClient.get<LocationSummary[]>(url);
	}

	/**
	 * List all locations for a company
	 */
	static async listByCompany(companyId: string): Promise<LocationSummary[]> {
		return this.listAll(companyId);
	}

	/**
	 * Get location details
	 */
	static async get(id: string): Promise<LocationDetail> {
		return apiClient.get<LocationDetail>(`/companies/locations/${id}`);
	}

	/**
	 * Create a new location for a company
	 */
	static async create(
		companyId: string,
		data: LocationCreate,
	): Promise<LocationSummary> {
		// Backend BaseSchema accepts camelCase via populate_by_name=True
		// No need to transform to snake_case - send as-is
		const response = await apiClient.post<LocationSummary>(
			`/companies/${companyId}/locations`,
			data as unknown as Record<string, unknown>,
		);

		// Backend already returns camelCase - no transformation needed
		return response;
	}

	/**
	 * Update location
	 */
	static async update(
		id: string,
		data: LocationUpdate,
	): Promise<LocationDetail> {
		return apiClient.put<LocationDetail>(
			`/companies/locations/${id}`,
			data as unknown as Record<string, unknown>,
		);
	}

	/**
	 * Delete location (cascade deletes projects)
	 */
	static async delete(id: string): Promise<{ message: string }> {
		return apiClient.delete(`/companies/locations/${id}`);
	}
}
