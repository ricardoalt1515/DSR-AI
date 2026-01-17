/**
 * Companies API client
 */

import type { SuccessResponse } from "@/lib/types/api";
import type {
	CompanyCreate,
	CompanyDetail,
	CompanySummary,
	CompanyUpdate,
	LocationContact,
	LocationCreate,
	LocationDetail,
	LocationSummary,
	LocationUpdate,
} from "@/lib/types/company";
import { apiClient } from "./client";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPANIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const companiesAPI = {
	/**
	 * List all companies
	 */
	async list(): Promise<CompanySummary[]> {
		return apiClient.get<CompanySummary[]>("/companies");
	},

	/**
	 * Get company details with locations
	 */
	async get(id: string): Promise<CompanyDetail> {
		return apiClient.get<CompanyDetail>(`/companies/${id}`);
	},

	/**
	 * Create a new company
	 */
	async create(data: CompanyCreate): Promise<CompanyDetail> {
		return apiClient.post<CompanyDetail>(
			"/companies",
			data as unknown as Record<string, unknown>,
		);
	},

	/**
	 * Update company
	 */
	async update(id: string, data: CompanyUpdate): Promise<CompanyDetail> {
		return apiClient.put<CompanyDetail>(
			`/companies/${id}`,
			data as unknown as Record<string, unknown>,
		);
	},

	/**
	 * Delete company (cascade deletes locations and projects)
	 */
	async delete(id: string): Promise<{ message: string }> {
		return apiClient.delete(`/companies/${id}`);
	},
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LOCATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const locationsAPI = {
	buildListUrl(companyId?: string) {
		const searchParams = new URLSearchParams();
		if (companyId) {
			searchParams.append("company_id", companyId);
		}

		const query = searchParams.toString();
		return query ? `/companies/locations?${query}` : "/companies/locations";
	},

	/**
	 * List all locations (optionally filtered by company)
	 */
	async listAll(companyId?: string): Promise<LocationSummary[]> {
		const url = locationsAPI.buildListUrl(companyId);
		return apiClient.get<LocationSummary[]>(url);
	},

	/**
	 * List all locations for a company
	 */
	async listByCompany(companyId: string): Promise<LocationSummary[]> {
		return locationsAPI.listAll(companyId);
	},

	/**
	 * Get location details
	 */
	async get(id: string): Promise<LocationDetail> {
		return apiClient.get<LocationDetail>(`/companies/locations/${id}`);
	},

	/**
	 * Create a new location for a company
	 */
	async create(
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
	},

	/**
	 * Update location
	 */
	async update(id: string, data: LocationUpdate): Promise<LocationDetail> {
		return apiClient.put<LocationDetail>(
			`/companies/locations/${id}`,
			data as unknown as Record<string, unknown>,
		);
	},

	/**
	 * Delete location (cascade deletes projects)
	 */
	async delete(id: string): Promise<{ message: string }> {
		return apiClient.delete(`/companies/locations/${id}`);
	},

	async createContact(
		locationId: string,
		data: Omit<
			LocationContact,
			"id" | "locationId" | "createdAt" | "updatedAt"
		>,
	): Promise<LocationContact> {
		return apiClient.post<LocationContact>(
			`/companies/locations/${locationId}/contacts`,
			data as unknown as Record<string, unknown>,
		);
	},

	async updateContact(
		locationId: string,
		contactId: string,
		data: Partial<
			Omit<LocationContact, "id" | "locationId" | "createdAt" | "updatedAt">
		>,
	): Promise<LocationContact> {
		return apiClient.put<LocationContact>(
			`/companies/locations/${locationId}/contacts/${contactId}`,
			data as unknown as Record<string, unknown>,
		);
	},

	async deleteContact(
		locationId: string,
		contactId: string,
	): Promise<SuccessResponse> {
		return apiClient.delete(
			`/companies/locations/${locationId}/contacts/${contactId}`,
		);
	},
};
