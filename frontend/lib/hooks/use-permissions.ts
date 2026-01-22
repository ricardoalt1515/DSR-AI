import { useAuth } from "@/lib/contexts/auth-context";
import type { ProjectSummary } from "@/lib/project-types";
import type { CompanySummary, LocationSummary } from "@/lib/types/company";

export function usePermissions() {
	const { user } = useAuth();
	const isAdmin = Boolean(user?.isSuperuser || user?.role === "org_admin");
	const isAgent = Boolean(
		user?.role === "field_agent" || user?.role === "contractor",
	);

	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	// COMPANY PERMISSIONS
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

	const canEditCompany = (company: CompanySummary): boolean => {
		if (isAdmin) return true;
		return isAgent && company.createdByUserId === user?.id;
	};

	const canDeleteCompany = (): boolean => isAdmin;

	const canArchiveCompany = (): boolean => isAdmin;

	const canRestoreCompany = (): boolean => isAdmin;

	const canPurgeCompany = (): boolean => isAdmin;

	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	// LOCATION PERMISSIONS
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

	const canEditLocation = (location: LocationSummary): boolean => {
		if (isAdmin) return true;
		return isAgent && location.createdByUserId === user?.id;
	};

	const canDeleteLocation = (): boolean => isAdmin;

	const canArchiveLocation = (): boolean => isAdmin;

	const canRestoreLocation = (): boolean => isAdmin;

	const canPurgeLocation = (): boolean => isAdmin;

	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	// PROJECT PERMISSIONS
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

	const canEditProject = (project: ProjectSummary): boolean => {
		if (isAdmin) return true;
		return isAgent && project.userId === user?.id;
	};

	const canDeleteProject = (project: ProjectSummary): boolean => {
		if (isAdmin) return true;
		return isAgent && project.userId === user?.id;
	};

	const canArchiveProject = (project: ProjectSummary): boolean => {
		if (isAdmin) return true;
		return Boolean(project.userId === user?.id);
	};

	const canRestoreProject = (project: ProjectSummary): boolean => {
		if (isAdmin) return true;
		return Boolean(project.userId === user?.id);
	};

	const canPurgeProject = (): boolean => isAdmin;

	return {
		// Company
		canEditCompany,
		canDeleteCompany,
		canArchiveCompany,
		canRestoreCompany,
		canPurgeCompany,
		// Location
		canEditLocation,
		canDeleteLocation,
		canArchiveLocation,
		canRestoreLocation,
		canPurgeLocation,
		// Project
		canEditProject,
		canDeleteProject,
		canArchiveProject,
		canRestoreProject,
		canPurgeProject,
	};
}
