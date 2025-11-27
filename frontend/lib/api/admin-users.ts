import { apiClient } from "./client";
import type { User } from "./auth";

export interface AdminCreateUserInput {
	email: string;
	password: string;
	firstName: string;
	lastName: string;
	isSuperuser?: boolean;
}

export interface AdminUpdateUserInput {
	isSuperuser?: boolean;
	isActive?: boolean;
	password?: string;
}

export class AdminUsersAPI {
	static async list(): Promise<User[]> {
		return apiClient.get<User[]>("/admin/users");
	}

	static async create(payload: AdminCreateUserInput): Promise<User> {
		const body = {
			email: payload.email,
			password: payload.password,
			first_name: payload.firstName,
			last_name: payload.lastName,
			is_superuser: payload.isSuperuser ?? false,
			is_active: true,
		};
		return apiClient.post<User>("/admin/users", body);
	}

	static async update(userId: string, payload: AdminUpdateUserInput): Promise<User> {
		const body = Object.fromEntries(
			Object.entries({
				is_superuser: payload.isSuperuser,
				is_active: payload.isActive,
				password: payload.password,
			}).filter(([, value]) => value !== undefined && value !== null && value !== ""),
		);
		return apiClient.patch<User>(`/admin/users/${userId}`, body);
	}
}

export const adminUsersAPI = AdminUsersAPI;
