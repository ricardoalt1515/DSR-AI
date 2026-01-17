import type { User, UserRole } from "@/lib/types/user";
import { apiClient } from "./client";

export interface Organization {
	id: string;
	name: string;
	slug: string;
	contactEmail: string | null;
	contactPhone: string | null;
	isActive: boolean;
	createdAt: string;
}

export interface OrganizationCreateInput {
	name: string;
	slug: string;
	contactEmail?: string;
	contactPhone?: string;
}

export interface OrgUserCreateInput {
	email: string;
	password: string;
	firstName: string;
	lastName: string;
	role: Exclude<UserRole, "admin">;
}

export interface OrganizationUpdateInput {
	name?: string;
	contactEmail?: string | null;
	contactPhone?: string | null;
	isActive?: boolean;
}

export interface OrgUserUpdateInput {
	role?: Exclude<UserRole, "admin">;
	isActive?: boolean;
}

interface RawOrganizationResponse {
	id: string;
	name: string;
	slug: string;
	contact_email?: string | null;
	contactEmail?: string | null;
	contact_phone?: string | null;
	contactPhone?: string | null;
	is_active?: boolean;
	isActive?: boolean;
	created_at?: string;
	createdAt?: string;
}

interface RawUserResponse {
	id: string;
	email: string;
	first_name: string;
	last_name: string;
	company_name?: string;
	location?: string;
	sector?: string;
	subsector?: string;
	is_verified?: boolean;
	is_active?: boolean;
	created_at?: string;
	is_superuser?: boolean;
	role?: UserRole;
	organization_id?: string | null;
}

function transformOrganization(
	response: RawOrganizationResponse,
): Organization {
	return {
		id: response.id,
		name: response.name,
		slug: response.slug,
		contactEmail: response.contactEmail ?? response.contact_email ?? null,
		contactPhone: response.contactPhone ?? response.contact_phone ?? null,
		isActive: response.isActive ?? response.is_active ?? true,
		createdAt:
			response.createdAt ?? response.created_at ?? new Date().toISOString(),
	};
}

function transformUser(response: RawUserResponse): User {
	return {
		id: response.id,
		email: response.email,
		firstName: response.first_name,
		lastName: response.last_name,
		companyName: response.company_name || undefined,
		location: response.location || undefined,
		sector: response.sector || undefined,
		subsector: response.subsector || undefined,
		isVerified: response.is_verified ?? false,
		isActive: response.is_active ?? true,
		createdAt: response.created_at || new Date().toISOString(),
		isSuperuser: response.is_superuser ?? false,
		role: response.role ?? "field_agent",
		organizationId: response.organization_id ?? null,
	};
}

export class OrganizationsAPI {
	/**
	 * List all organizations (Platform Admin only)
	 */
	static async list(): Promise<Organization[]> {
		const data =
			await apiClient.get<RawOrganizationResponse[]>("/organizations");
		return data.map(transformOrganization);
	}

	/**
	 * Get organization by ID (Platform Admin only)
	 */
	static async get(orgId: string): Promise<Organization> {
		const data = await apiClient.get<RawOrganizationResponse>(
			`/organizations/${orgId}`,
		);
		return transformOrganization(data);
	}

	/**
	 * Get current organization (any authenticated user)
	 */
	static async getCurrent(): Promise<Organization> {
		const data = await apiClient.get<RawOrganizationResponse>(
			"/organizations/current",
		);
		return transformOrganization(data);
	}

	/**
	 * Create a new organization (Platform Admin only)
	 */
	static async create(payload: OrganizationCreateInput): Promise<Organization> {
		const body = {
			name: payload.name,
			slug: payload.slug,
			contact_email: payload.contactEmail,
			contact_phone: payload.contactPhone,
		};
		const data = await apiClient.post<RawOrganizationResponse>(
			"/organizations",
			body,
		);
		return transformOrganization(data);
	}

	/**
	 * List users of a specific organization (Platform Admin only)
	 */
	static async listOrgUsers(orgId: string): Promise<User[]> {
		const data = await apiClient.get<RawUserResponse[]>(
			`/organizations/${orgId}/users`,
		);
		return data.map(transformUser);
	}

	/**
	 * Create user in a specific organization (Platform Admin only)
	 */
	static async createOrgUser(
		orgId: string,
		payload: OrgUserCreateInput,
	): Promise<User> {
		const body = {
			email: payload.email,
			password: payload.password,
			first_name: payload.firstName,
			last_name: payload.lastName,
			role: payload.role,
		};
		const data = await apiClient.post<RawUserResponse>(
			`/organizations/${orgId}/users`,
			body,
		);
		return transformUser(data);
	}

	/**
	 * List users of current organization (Org Admin or Platform Admin)
	 */
	static async listMyOrgUsers(): Promise<User[]> {
		const data = await apiClient.get<RawUserResponse[]>(
			"/organizations/current/users",
		);
		return data.map(transformUser);
	}

	/**
	 * Create user in current organization (Org Admin or Platform Admin)
	 */
	static async createMyOrgUser(payload: OrgUserCreateInput): Promise<User> {
		const body = {
			email: payload.email,
			password: payload.password,
			first_name: payload.firstName,
			last_name: payload.lastName,
			role: payload.role,
		};
		const data = await apiClient.post<RawUserResponse>(
			"/organizations/current/users",
			body,
		);
		return transformUser(data);
	}

	/**
	 * Update an organization (Platform Admin only)
	 */
	static async update(
		orgId: string,
		payload: OrganizationUpdateInput,
	): Promise<Organization> {
		const body: Record<string, unknown> = {};
		if (payload.name !== undefined) body.name = payload.name;
		if (payload.contactEmail !== undefined)
			body.contact_email = payload.contactEmail;
		if (payload.contactPhone !== undefined)
			body.contact_phone = payload.contactPhone;
		if (payload.isActive !== undefined) body.is_active = payload.isActive;

		const data = await apiClient.patch<RawOrganizationResponse>(
			`/organizations/${orgId}`,
			body,
		);
		return transformOrganization(data);
	}

	/**
	 * Delete (soft-delete) an organization (Platform Admin only)
	 */
	static async delete(orgId: string): Promise<void> {
		await apiClient.delete(`/organizations/${orgId}`);
	}

	/**
	 * Update user in a specific organization (Platform Admin only)
	 */
	static async updateOrgUser(
		orgId: string,
		userId: string,
		payload: OrgUserUpdateInput,
	): Promise<User> {
		const body: Record<string, unknown> = {};
		if (payload.role !== undefined) body.role = payload.role;
		if (payload.isActive !== undefined) body.is_active = payload.isActive;

		const data = await apiClient.patch<RawUserResponse>(
			`/organizations/${orgId}/users/${userId}`,
			body,
		);
		return transformUser(data);
	}

	/**
	 * Update user in current organization (Org Admin or Platform Admin)
	 */
	static async updateMyOrgUser(
		userId: string,
		payload: OrgUserUpdateInput,
	): Promise<User> {
		const body: Record<string, unknown> = {};
		if (payload.role !== undefined) body.role = payload.role;
		if (payload.isActive !== undefined) body.is_active = payload.isActive;

		const data = await apiClient.patch<RawUserResponse>(
			`/organizations/current/users/${userId}`,
			body,
		);
		return transformUser(data);
	}
}

export const organizationsAPI = OrganizationsAPI;
