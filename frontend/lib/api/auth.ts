import { apiClient } from "./client";

// Auth types
interface User {
	id: string;
	email: string;
	name: string;
	company?: string;
}

interface LoginRequest {
	email: string;
	password: string;
	rememberMe?: boolean;
}

interface LoginResponse {
	user: User;
	token: string;
	expiresIn: number;
}

interface RegisterRequest {
	email: string;
	password: string;
	name: string;
	company?: string;
}

interface PasswordResetRequest {
	email: string;
}

interface PasswordResetConfirmRequest {
	token: string;
	newPassword: string;
}

interface UpdateProfileRequest {
	name?: string;
	company?: string;
}

// Auth API service
export class AuthAPI {
	// Authentication
	static async login(credentials: LoginRequest): Promise<LoginResponse> {
		// FastAPI Users requires form-urlencoded with 'username' field
		const formData = new URLSearchParams();
		formData.append("username", credentials.email); // FastAPI Users uses 'username' instead of 'email'
		formData.append("password", credentials.password);

		const response = await apiClient.post<any>("/auth/jwt/login", formData, {
			"Content-Type": "application/x-www-form-urlencoded",
		});

		// Backend returns: { access_token, token_type, expires_in }
		// expires_in is injected by middleware in backend
		// We need to fetch user data separately from /auth/me

		// Store access token
		const accessToken = response.access_token;
		if (accessToken) {
			apiClient.setAuthToken(accessToken);
			localStorage.setItem("access_token", accessToken);
		}

		// Fetch user data from /auth/me
		const user = await AuthAPI.getCurrentUser();

		const transformedResponse: LoginResponse = {
			user,
			token: accessToken,
			expiresIn: response.expires_in || 86400, // Use backend value or fallback to 24h
		};

		return transformedResponse;
	}

	static async register(userData: RegisterRequest): Promise<LoginResponse> {
		// FastAPI Users expects snake_case fields
		const backendData = {
			email: userData.email,
			password: userData.password,
			first_name: userData.name.split(" ")[0] || userData.name,
			last_name: userData.name.split(" ").slice(1).join(" ") || "",
			company_name: userData.company || "",
			location: "",
			sector: "",
			is_active: true,
			is_superuser: false,
			is_verified: false,
		};

		// Register user (FastAPI Users returns user data)
		await apiClient.post<any>("/auth/register", backendData as any);

		// After successful registration, automatically login
		return AuthAPI.login({
			email: userData.email,
			password: userData.password,
		});
	}

	static async logout(): Promise<void> {
		try {
			// FastAPI Users provides logout endpoint (JWT strategy)
			await apiClient.post("/auth/jwt/logout");
		} catch (_error) {
			// Even if logout fails on backend, clear local tokens
			// Silently handle error - local cleanup is more important
		} finally {
			// Always clear local tokens
			apiClient.clearAuthToken();
			localStorage.removeItem("access_token");
		}
	}

	// Password management
	static async requestPasswordReset(
		request: PasswordResetRequest,
	): Promise<void> {
		// FastAPI Users endpoint for password reset
		return apiClient.post<void>("/auth/forgot-password", request as any);
	}

	static async confirmPasswordReset(
		request: PasswordResetConfirmRequest,
	): Promise<void> {
		// FastAPI Users endpoint for resetting password with token
		return apiClient.post<void>("/auth/reset-password", {
			token: request.token,
			password: request.newPassword,
		});
	}

	// User management
	static async getCurrentUser(): Promise<User> {
		const response = await apiClient.get<any>("/auth/me");

		// Transform backend response to frontend User type
		return {
			id: response.id,
			email: response.email,
			name: `${response.first_name} ${response.last_name}`,
			company: response.company_name || undefined,
		};
	}

	static async updateProfile(data: UpdateProfileRequest): Promise<User> {
		await apiClient.patch<User>("/auth/me", data as any);
		return AuthAPI.getCurrentUser();
	}

	static async deleteAccount(): Promise<void> {
		await apiClient.delete<void>("/auth/me");
		AuthAPI.logout(); // Clear tokens after deletion
	}

	// Account verification
	static async verifyEmail(token: string): Promise<void> {
		// FastAPI Users endpoint for email verification
		return apiClient.post<void>("/auth/verify", { token });
	}

	static async resendVerificationEmail(): Promise<void> {
		// FastAPI Users endpoint for requesting new verification token
		return apiClient.post<void>("/auth/request-verify-token");
	}

	// Session management
	static async validateSession(): Promise<{ valid: boolean; user?: User }> {
		try {
			const user = await AuthAPI.getCurrentUser();
			return { valid: true, user };
		} catch (_error) {
			return { valid: false };
		}
	}

	// Initialize auth from stored tokens
	static initializeAuth(): boolean {
		const token = localStorage.getItem("access_token");
		if (token) {
			apiClient.setAuthToken(token);
			return true;
		}
		return false;
	}
}

// Export for easy usage
export const authAPI = AuthAPI;

// Export types
export type {
	User,
	LoginRequest,
	LoginResponse,
	RegisterRequest,
	UpdateProfileRequest,
};
