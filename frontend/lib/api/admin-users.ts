import { apiClient } from "./client";
import type { User, UserRole } from "@/lib/types/user";

/** Backend response shape for user data (snake_case) */
interface AdminUserResponse {
	id: string;
	email: string;
	first_name: string;
	last_name: string;
	company_name?: string | null;
	location?: string | null;
	sector?: string | null;
	subsector?: string | null;
	is_verified?: boolean;
	is_active?: boolean;
	created_at?: string;
	is_superuser?: boolean;
	role?: UserRole;
	organization_id?: string | null;
}

export interface AdminCreateUserInput {
	email: string;
	password: string;
	firstName: string;
	lastName: string;
	isSuperuser?: boolean;
	role?: UserRole;
}

export interface AdminUpdateUserInput {
	isSuperuser?: boolean;
	isActive?: boolean;
	password?: string;
	role?: UserRole;
}

function transformUser(response: AdminUserResponse): User {
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

export class AdminUsersAPI {
	static async list(): Promise<User[]> {
		const data = await apiClient.get<AdminUserResponse[]>("/admin/users");
		return data.map(transformUser);
	}

	static async create(payload: AdminCreateUserInput): Promise<User> {
		const body = {
			email: payload.email,
			password: payload.password,
			first_name: payload.firstName,
			last_name: payload.lastName,
			is_superuser: payload.isSuperuser ?? false,
			is_active: true,
			role: payload.role ?? "field_agent",
		};
		const response = await apiClient.post<AdminUserResponse>(
			"/admin/users",
			body,
		);
		return transformUser(response);
	}

	static async update(
		userId: string,
		payload: AdminUpdateUserInput,
	): Promise<User> {
		const body = Object.fromEntries(
			Object.entries({
				is_superuser: payload.isSuperuser,
				is_active: payload.isActive,
				password: payload.password,
				role: payload.role,
			}).filter(
				([, value]) => value !== undefined && value !== null && value !== "",
			),
		);
		const response = await apiClient.patch<AdminUserResponse>(
			`/admin/users/${userId}`,
			body,
		);
		return transformUser(response);
	}
}

export const adminUsersAPI = AdminUsersAPI;
