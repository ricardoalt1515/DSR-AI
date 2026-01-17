import { create } from "zustand";
import { type Organization, organizationsAPI } from "@/lib/api/organizations";
import { SELECTED_ORG_STORAGE_KEY } from "@/lib/constants/storage";
import { logger } from "@/lib/utils/logger";
import { useCompanyStore } from "./company-store";
import { useLocationStore } from "./location-store";
import { useProjectStore } from "./project-store";

function resetScopedStores(): void {
	useCompanyStore.getState().resetStore();
	useLocationStore.getState().resetStore();
	useProjectStore.getState().resetStore();
}

interface OrganizationState {
	currentOrganization: Organization | null;
	organizations: Organization[];
	selectedOrgId: string | null;
	isOrgSwitchModalOpen: boolean;
	loadCurrentOrganization: () => Promise<void>;
	loadOrganizations: () => Promise<void>;
	selectOrganization: (orgId: string) => void;
	clearSelection: () => void;
	resetStore: () => void;
	upsertOrganization: (org: Organization) => void;
	openOrgSwitchModal: () => void;
	closeOrgSwitchModal: () => void;
}

function getStoredOrgId(): string | null {
	if (typeof window === "undefined") return null;
	return localStorage.getItem(SELECTED_ORG_STORAGE_KEY);
}

export const useOrganizationStore = create<OrganizationState>((set) => ({
	currentOrganization: null,
	organizations: [],
	selectedOrgId: getStoredOrgId(),
	isOrgSwitchModalOpen: false,

	loadCurrentOrganization: async () => {
		try {
			const org = await organizationsAPI.getCurrent();
			set({ currentOrganization: org });
		} catch (_error) {
			logger.warn("Failed to load current organization", "OrganizationStore");
			set({ currentOrganization: null });
		}
	},

	loadOrganizations: async () => {
		try {
			const orgs = await organizationsAPI.list();
			set({ organizations: orgs });
		} catch (_error) {
			logger.warn("Failed to load organizations", "OrganizationStore");
			set({ organizations: [] });
		}
	},

	selectOrganization: (orgId: string) => {
		resetScopedStores();

		set({ selectedOrgId: orgId, currentOrganization: null });
		if (typeof window !== "undefined") {
			localStorage.setItem(SELECTED_ORG_STORAGE_KEY, orgId);
		}
	},

	clearSelection: () => {
		resetScopedStores();

		set({ selectedOrgId: null, currentOrganization: null });
		if (typeof window !== "undefined") {
			localStorage.removeItem(SELECTED_ORG_STORAGE_KEY);
		}
	},

	resetStore: () => {
		set({
			currentOrganization: null,
			organizations: [],
			selectedOrgId: null,
			isOrgSwitchModalOpen: false,
		});
		if (typeof window !== "undefined") {
			localStorage.removeItem(SELECTED_ORG_STORAGE_KEY);
		}
	},

	upsertOrganization: (org: Organization) => {
		set((state) => {
			const existing = state.organizations.some((item) => item.id === org.id);
			return {
				organizations: existing
					? state.organizations.map((item) => (item.id === org.id ? org : item))
					: [...state.organizations, org],
			};
		});
	},

	openOrgSwitchModal: () => {
		set({ isOrgSwitchModalOpen: true });
	},

	closeOrgSwitchModal: () => {
		set({ isOrgSwitchModalOpen: false });
	},
}));
