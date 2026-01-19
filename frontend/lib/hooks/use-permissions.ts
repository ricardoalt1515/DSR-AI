import { useAuth } from "@/lib/contexts/auth-context";
import type { CompanySummary, LocationSummary } from "@/lib/types/company";

export function usePermissions() {
	const { user } = useAuth();
	const isAdmin = Boolean(user?.isSuperuser || user?.role === "org_admin");
	const isAgent = Boolean(
		user?.role === "field_agent" || user?.role === "contractor",
	);

	const canEditCompany = (company: CompanySummary): boolean => {
		if (isAdmin) return true;
		return isAgent && company.createdByUserId === user?.id;
	};

	const canEditLocation = (location: LocationSummary): boolean => {
		if (isAdmin) return true;
		return isAgent && location.createdByUserId === user?.id;
	};

	const canDeleteCompany = (): boolean => isAdmin;

	const canDeleteLocation = (): boolean => isAdmin;

	return {
		canEditCompany,
		canEditLocation,
		canDeleteCompany,
		canDeleteLocation,
	};
}
