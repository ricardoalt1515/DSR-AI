import { create } from "zustand";
import { organizationsAPI, type Organization } from "@/lib/api";
import { logger } from "@/lib/utils/logger";
import { useCompanyStore } from "./company-store";
import { useLocationStore } from "./location-store";
import { useProjectStore } from "./project-store";

type OrgModalReason = "switching" | null;

interface OrganizationState {
	currentOrganization: Organization | null;
	organizations: Organization[];
	selectedOrgId: string | null;
	// Modal state for org switching
	modalOpen: boolean;
	modalReason: OrgModalReason;
	loadCurrentOrganization: () => Promise<void>;
	loadOrganizations: () => Promise<void>;
	selectOrganization: (orgId: string) => void;
	clearSelection: () => void;
	resetStore: () => void;
	// Modal actions
	openSelectionModal: (reason?: OrgModalReason) => void;
	closeSelectionModal: () => void;
}

const getStoredOrgId = () => {
	if (typeof window === "undefined") return null;
	return localStorage.getItem("selected_org_id");
};

export const useOrganizationStore = create<OrganizationState>((set) => ({
	currentOrganization: null,
	organizations: [],
	selectedOrgId: getStoredOrgId(),
	modalOpen: false,
	modalReason: null,

	loadCurrentOrganization: async () => {
		try {
			const org = await organizationsAPI.getCurrent();
			set({ currentOrganization: org });
		} catch (error) {
			logger.warn("Failed to load current organization", "OrganizationStore");
			set({ currentOrganization: null });
		}
	},

	loadOrganizations: async () => {
		try {
			const orgs = await organizationsAPI.list();
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

	clearSelection: () => {
		useCompanyStore.getState().resetStore();
		useLocationStore.getState().resetStore();
		useProjectStore.getState().resetStore();

		set({ selectedOrgId: null, currentOrganization: null });
		if (typeof window !== "undefined") {
			localStorage.removeItem("selected_org_id");
		}
	},

	resetStore: () => {
		set({
			currentOrganization: null,
			organizations: [],
			selectedOrgId: null,
			modalOpen: false,
			modalReason: null,
		});
		if (typeof window !== "undefined") {
			localStorage.removeItem("selected_org_id");
		}
	},

	openSelectionModal: (reason = null) => {
		set({ modalOpen: true, modalReason: reason });
	},

	closeSelectionModal: () => {
		set({ modalOpen: false, modalReason: null });
	},
}));
