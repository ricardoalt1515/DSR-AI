// Main API exports

export type { User, UserRole } from "@/lib/types/user";
export {
	type AdminCreateUserInput,
	type AdminUpdateUserInput,
	adminUsersAPI,
} from "./admin-users";
export type {
	LoginRequest,
	LoginResponse,
	RegisterRequest,
} from "./auth";
export { authAPI } from "./auth";
export type { APIError, RequestConfig } from "./client";
export { APIClient, APIClientError, apiClient } from "./client";
export {
	type Organization,
	type OrganizationCreateInput,
	type OrganizationUpdateInput,
	type OrgUserCreateInput,
	type OrgUserUpdateInput,
	organizationsAPI,
} from "./organizations";
export type {
	CustomSection,
	ProjectData,
	QualityParameter,
} from "./project-data";
export { projectDataAPI } from "./project-data";
export { projectsAPI } from "./projects";
export {
	type AIMetadata,
	type PollingOptions,
	type ProposalGenerationRequest,
	type ProposalJobStatus,
	type ProposalResponse,
	pollProposalStatus,
	proposalsAPI,
} from "./proposals";

// Response type helpers
export interface PaginatedResponse<T> {
	items: T[];
	total: number;
	page: number;
	size: number;
	pages: number;
}
