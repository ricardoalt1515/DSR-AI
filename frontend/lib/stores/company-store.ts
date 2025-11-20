/**
 * Company store - Zustand state management for companies
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { CompaniesAPI } from "@/lib/api/companies";
import type {
	CompanyCreate,
	CompanyDetail,
	CompanySummary,
	CompanyUpdate,
} from "@/lib/types/company";
import { logger } from "@/lib/utils/logger";

interface CompanyState {
	// State
	companies: CompanySummary[];
	currentCompany: CompanyDetail | null;
	loading: boolean;
	error: string | null;

	// Actions
	loadCompanies: () => Promise<void>;
	loadCompany: (id: string) => Promise<void>;
	createCompany: (data: CompanyCreate) => Promise<CompanyDetail>;
	updateCompany: (id: string, data: CompanyUpdate) => Promise<CompanyDetail>;
	deleteCompany: (id: string) => Promise<void>;
	clearError: () => void;
	setLoading: (loading: boolean) => void;
}

export const useCompanyStore = create<CompanyState>()(
	persist(
		immer((set, get) => ({
			// Initial state
			companies: [],
			currentCompany: null,
			loading: false,
			error: null,

			// Load all companies
			loadCompanies: async () => {
				set((state) => {
					state.loading = true;
					state.error = null;
				});

				try {
					const companies = await CompaniesAPI.list();
					set((state) => {
						state.companies = companies;
						state.loading = false;
					});
				} catch (error) {
					const message =
						error instanceof Error ? error.message : "Failed to load companies";
					logger.error("Failed to load companies", error, "CompanyStore");
					set((state) => {
						state.error = message;
						state.loading = false;
					});
					throw error;
				}
			},

			// Load single company with details
			loadCompany: async (id: string) => {
				set((state) => {
					state.loading = true;
					state.error = null;
				});

				try {
					const company = await CompaniesAPI.get(id);
					set((state) => {
						state.currentCompany = company;
						state.loading = false;
					});
				} catch (error) {
					const message =
						error instanceof Error ? error.message : "Failed to load company";
					logger.error(`Failed to load company ${id}`, error, "CompanyStore");
					set((state) => {
						state.error = message;
						state.loading = false;
					});
					throw error;
				}
			},

			// Create new company
			createCompany: async (data: CompanyCreate) => {
				set((state) => {
					state.loading = true;
					state.error = null;
				});

				try {
					const company = await CompaniesAPI.create(data);
					set((state) => {
						state.companies.push(company);
						state.currentCompany = company;
						state.loading = false;
					});
					logger.info(`Company created: ${company.name}`, "CompanyStore");
					return company;
				} catch (error) {
					const message =
						error instanceof Error ? error.message : "Failed to create company";
					logger.error("Failed to create company", error, "CompanyStore");
					set((state) => {
						state.error = message;
						state.loading = false;
					});
					throw error;
				}
			},

			// Update company
			updateCompany: async (id: string, data: CompanyUpdate) => {
				set((state) => {
					state.loading = true;
					state.error = null;
				});

				try {
					const company = await CompaniesAPI.update(id, data);
					set((state) => {
						const index = state.companies.findIndex((c) => c.id === id);
						if (index !== -1) {
							state.companies[index] = company;
						}
						if (state.currentCompany?.id === id) {
							state.currentCompany = company;
						}
						state.loading = false;
					});
					logger.info(`Company updated: ${company.name}`, "CompanyStore");
					return company;
				} catch (error) {
					const message =
						error instanceof Error ? error.message : "Failed to update company";
					logger.error(`Failed to update company ${id}`, error, "CompanyStore");
					set((state) => {
						state.error = message;
						state.loading = false;
					});
					throw error;
				}
			},

			// Delete company
			deleteCompany: async (id: string) => {
				set((state) => {
					state.loading = true;
					state.error = null;
				});

				try {
					await CompaniesAPI.delete(id);
					set((state) => {
						state.companies = state.companies.filter((c) => c.id !== id);
						if (state.currentCompany?.id === id) {
							state.currentCompany = null;
						}
						state.loading = false;
					});
					logger.info(`Company deleted: ${id}`, "CompanyStore");
				} catch (error) {
					const message =
						error instanceof Error ? error.message : "Failed to delete company";
					logger.error(`Failed to delete company ${id}`, error, "CompanyStore");
					set((state) => {
						state.error = message;
						state.loading = false;
					});
					throw error;
				}
			},

			// Clear error
			clearError: () =>
				set((state) => {
					state.error = null;
				}),

			// Set loading
			setLoading: (loading: boolean) =>
				set((state) => {
					state.loading = loading;
				}),
		})),
		{
			name: "waste-company-store",
			partialize: (state) => ({
				companies: state.companies,
			}),
		},
	),
);
