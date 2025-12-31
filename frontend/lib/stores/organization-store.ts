import { create } from "zustand";
import { apiClient } from "@/lib/api";
import { logger } from "@/lib/utils/logger";
import { useCompanyStore } from "./company-store";
import { useLocationStore } from "./location-store";
import { useProjectStore } from "./project-store";

export interface Organization {
	id: string;
	name: string;
	slug: string;
	isActive: boolean;
}

interface OrganizationState {
	currentOrganization: Organization | null;
	organizations: Organization[];
	selectedOrgId: string | null;
	loadCurrentOrganization: () => Promise<void>;
	loadOrganizations: () => Promise<void>;
	selectOrganization: (orgId: string) => void;
	resetStore: () => void;
}

const getStoredOrgId = () => {
	if (typeof window === "undefined") return null;
	return localStorage.getItem("selected_org_id");
};

export const useOrganizationStore = create<OrganizationState>((set) => ({
	currentOrganization: null,
	organizations: [],
	selectedOrgId: getStoredOrgId(),

	loadCurrentOrganization: async () => {
		try {
			const org = await apiClient.get<Organization>("/organizations/current");
			set({ currentOrganization: org });
		} catch (error) {
			logger.warn("Failed to load current organization", "OrganizationStore");
			set({ currentOrganization: null });
		}
	},

	loadOrganizations: async () => {
		try {
			const orgs = await apiClient.get<Organization[]>("/organizations");
			set({ organizations: orgs });
		} catch (error) {
			logger.warn("Failed to load organizations", "OrganizationStore");
			set({ organizations: [] });
		}
	},

	selectOrganization: (orgId: string) => {
		useCompanyStore.getState().resetStore();
		useLocationStore.getState().resetStore();
		useProjectStore.getState().resetStore();

		set({ selectedOrgId: orgId, currentOrganization: null });
		if (typeof window !== "undefined") {
			localStorage.setItem("selected_org_id", orgId);
		}
	},

	resetStore: () => {
		set({ currentOrganization: null, organizations: [], selectedOrgId: null });
		if (typeof window !== "undefined") {
			localStorage.removeItem("selected_org_id");
		}
	},
}));
