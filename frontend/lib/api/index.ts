// Main API exports

export type {
	LoginRequest,
	LoginResponse,
	RegisterRequest,
} from "./auth";
export type { User, UserRole } from "@/lib/types/user";
export { AuthAPI, authAPI } from "./auth";
export type { APIError, RequestConfig } from "./client";
export { APIClient, APIClientError, apiClient } from "./client";
export type {
	CustomSection,
	ProjectData,
	QualityParameter,
} from "./project-data";
export { ProjectDataAPI, projectDataAPI } from "./project-data";
export { ProjectsAPI, projectsAPI } from "./projects";
export {
	type AIMetadata,
	type PollingOptions,
	type ProposalGenerationRequest,
	type ProposalJobStatus,
	type ProposalResponse,
	ProposalsAPI,
	pollProposalStatus,
	proposalsAPI,
} from "./proposals";
export {
	type AdminCreateUserInput,
	type AdminUpdateUserInput,
	AdminUsersAPI,
	adminUsersAPI,
} from "./admin-users";
export {
	type Organization,
	type OrganizationCreateInput,
	type OrganizationUpdateInput,
	type OrgUserCreateInput,
	type OrgUserUpdateInput,
	OrganizationsAPI,
	organizationsAPI,
} from "./organizations";

// Response type helpers
export interface PaginatedResponse<T> {
	items: T[];
	total: number;
	page: number;
	size: number;
	pages: number;
}
