import { apiClient } from "./client";
import type { User, UserRole } from "@/lib/types/user";

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

function transformOrganization(response: any): Organization {
	return {
		id: response.id,
		name: response.name,
		slug: response.slug,
		contactEmail: response.contactEmail ?? response.contact_email ?? null,
		contactPhone: response.contactPhone ?? response.contact_phone ?? null,
		isActive: response.isActive ?? response.is_active ?? true,
		createdAt: response.createdAt ?? response.created_at ?? new Date().toISOString(),
	};
}

function transformUser(response: any): User {
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
		const data = await apiClient.get<any[]>("/organizations");
		return data.map(transformOrganization);
	}

	/**
	 * Get organization by ID (Platform Admin only)
	 */
	static async get(orgId: string): Promise<Organization> {
		const data = await apiClient.get<any>(`/organizations/${orgId}`);
		return transformOrganization(data);
	}

	/**
	 * Get current organization (any authenticated user)
	 */
	static async getCurrent(): Promise<Organization> {
		const data = await apiClient.get<any>("/organizations/current");
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
		const data = await apiClient.post<any>("/organizations", body);
		return transformOrganization(data);
	}

	/**
	 * List users of a specific organization (Platform Admin only)
	 */
	static async listOrgUsers(orgId: string): Promise<User[]> {
		const data = await apiClient.get<any[]>(`/organizations/${orgId}/users`);
		return data.map(transformUser);
	}

	/**
	 * Create user in a specific organization (Platform Admin only)
	 */
	static async createOrgUser(orgId: string, payload: OrgUserCreateInput): Promise<User> {
		const body = {
			email: payload.email,
			password: payload.password,
			first_name: payload.firstName,
			last_name: payload.lastName,
			role: payload.role,
		};
		const data = await apiClient.post<any>(`/organizations/${orgId}/users`, body);
		return transformUser(data);
	}

	/**
	 * List users of current organization (Org Admin or Platform Admin)
	 */
	static async listMyOrgUsers(): Promise<User[]> {
		const data = await apiClient.get<any[]>("/organizations/current/users");
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
		const data = await apiClient.post<any>("/organizations/current/users", body);
		return transformUser(data);
	}
}

export const organizationsAPI = OrganizationsAPI;
