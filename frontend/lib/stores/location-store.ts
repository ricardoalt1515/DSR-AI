/**
 * Location store - Zustand state management for locations
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { type ArchivedFilter, locationsAPI } from "@/lib/api/companies";
import type {
	LocationCreate,
	LocationDetail,
	LocationSummary,
	LocationUpdate,
} from "@/lib/types/company";
import { getErrorMessage, logger } from "@/lib/utils/logger";

interface LocationState {
	// State
	locations: LocationSummary[];
	currentLocation: LocationDetail | null;
	loading: boolean;
	error: string | null;

	// Actions
	loadAllLocations: (archived?: ArchivedFilter) => Promise<void>;
	loadLocationsByCompany: (
		companyId: string,
		archived?: ArchivedFilter,
	) => Promise<void>;
	loadLocation: (id: string, archived?: ArchivedFilter) => Promise<void>;
	createLocation: (
		companyId: string,
		data: LocationCreate,
	) => Promise<LocationSummary>;
	updateLocation: (id: string, data: LocationUpdate) => Promise<LocationDetail>;
	deleteLocation: (id: string) => Promise<void>;
	archiveLocation: (id: string) => Promise<void>;
	restoreLocation: (id: string) => Promise<void>;
	purgeLocation: (id: string, confirmName: string) => Promise<void>;
	clearError: () => void;
	setLoading: (loading: boolean) => void;
	resetStore: () => void;
}

export const useLocationStore = create<LocationState>()(
	persist(
		immer((set, get) => ({
			// Initial state
			locations: [],
			currentLocation: null,
			loading: false,
			error: null,

			// Load all locations (optionally cached in store)
			loadAllLocations: async (archived?: ArchivedFilter) => {
				set((state) => {
					state.loading = true;
					state.error = null;
				});

				try {
					const locations = await locationsAPI.listAll(undefined, archived);
					set((state) => {
						state.locations = locations;
						state.loading = false;
					});
					logger.info(
						`Loaded ${locations.length} total locations`,
						"LocationStore",
					);
				} catch (error) {
					const message = getErrorMessage(error, "Failed to load locations");
					logger.error("Failed to load locations", error, "LocationStore");
					set((state) => {
						state.error = message;
						state.loading = false;
					});
					throw error;
				}
			},

			// Load locations for a company
			loadLocationsByCompany: async (
				companyId: string,
				archived?: ArchivedFilter,
			) => {
				set((state) => {
					state.loading = true;
					state.error = null;
				});

				try {
					const locations = await locationsAPI.listByCompany(
						companyId,
						archived,
					);

					set((state) => {
						const otherCompanies = state.locations.filter(
							(location) => location.companyId !== companyId,
						);
						const merged = [...otherCompanies, ...locations];
						state.locations = Array.from(
							new Map(
								merged.map((location) => [location.id, location]),
							).values(),
						);
						state.loading = false;
					});

					logger.info(
						`Loaded ${locations.length} locations for company ${companyId}`,
						"LocationStore",
					);
				} catch (error) {
					const message = getErrorMessage(error, "Failed to load locations");

					logger.error(
						`Failed to load locations for company ${companyId}`,
						error,
						"LocationStore",
					);

					set((state) => {
						state.error = message;
						state.loading = false;
					});

					throw error;
				}
			},

			// Load single location with details
			loadLocation: async (id: string, archived?: ArchivedFilter) => {
				set((state) => {
					state.loading = true;
					state.error = null;
				});

				try {
					const location = await locationsAPI.get(id, archived);
					set((state) => {
						state.currentLocation = location;
						state.loading = false;
					});
				} catch (error) {
					const message = getErrorMessage(error, "Failed to load location");
					logger.error(`Failed to load location ${id}`, error, "LocationStore");
					set((state) => {
						state.error = message;
						state.loading = false;
					});
					throw error;
				}
			},

			// Create new location
			createLocation: async (companyId: string, data: LocationCreate) => {
				set((state) => {
					state.loading = true;
					state.error = null;
				});

				try {
					const location = await locationsAPI.create(companyId, data);
					set((state) => {
						state.locations.push(location);
						// Don't set currentLocation since it's only a summary
						state.loading = false;
					});
					logger.info(`Location created: ${location.name}`, "LocationStore");
					return location;
				} catch (error) {
					const message = getErrorMessage(error, "Failed to create location");
					logger.error("Failed to create location", error, "LocationStore");
					set((state) => {
						state.error = message;
						state.loading = false;
					});
					throw error;
				}
			},

			// Update location
			updateLocation: async (id: string, data: LocationUpdate) => {
				set((state) => {
					state.loading = true;
					state.error = null;
				});

				try {
					const location = await locationsAPI.update(id, data);
					set((state) => {
						const index = state.locations.findIndex((l) => l.id === id);
						if (index !== -1) {
							state.locations[index] = location;
						}
						if (state.currentLocation?.id === id) {
							state.currentLocation = location;
						}
						state.loading = false;
					});
					logger.info(`Location updated: ${location.name}`, "LocationStore");
					return location;
				} catch (error) {
					const message = getErrorMessage(error, "Failed to update location");
					logger.error(
						`Failed to update location ${id}`,
						error,
						"LocationStore",
					);
					set((state) => {
						state.error = message;
						state.loading = false;
					});
					throw error;
				}
			},

			// Delete location
			deleteLocation: async (id: string) => {
				set((state) => {
					state.loading = true;
					state.error = null;
				});

				try {
					await locationsAPI.delete(id);
					set((state) => {
						state.locations = state.locations.filter((l) => l.id !== id);
						if (state.currentLocation?.id === id) {
							state.currentLocation = null;
						}
						state.loading = false;
					});
					logger.info(`Location deleted: ${id}`, "LocationStore");
				} catch (error) {
					const message = getErrorMessage(error, "Failed to delete location");
					logger.error(
						`Failed to delete location ${id}`,
						error,
						"LocationStore",
					);
					set((state) => {
						state.error = message;
						state.loading = false;
					});
					throw error;
				}
			},

			// Archive location
			archiveLocation: async (id: string) => {
				try {
					await locationsAPI.archiveLocation(id);
					set((state) => {
						state.locations = state.locations.filter((l) => l.id !== id);
						if (state.currentLocation?.id === id) {
							state.currentLocation = {
								...state.currentLocation,
								archivedAt: new Date().toISOString(),
							};
						}
					});
					logger.info(`Location archived: ${id}`, "LocationStore");
				} catch (error) {
					const message = getErrorMessage(error, "Failed to archive location");
					logger.error(
						`Failed to archive location ${id}`,
						error,
						"LocationStore",
					);
					set((state) => {
						state.error = message;
					});
					throw error;
				}
			},

			// Restore location
			restoreLocation: async (id: string) => {
				try {
					await locationsAPI.restoreLocation(id);
					// Reload location to get updated state
					await get().loadLocation(id);
					logger.info(`Location restored: ${id}`, "LocationStore");
				} catch (error) {
					const message = getErrorMessage(error, "Failed to restore location");
					logger.error(
						`Failed to restore location ${id}`,
						error,
						"LocationStore",
					);
					set((state) => {
						state.error = message;
					});
					throw error;
				}
			},

			// Purge location permanently
			purgeLocation: async (id: string, confirmName: string) => {
				try {
					await locationsAPI.purgeLocation(id, confirmName);
					set((state) => {
						state.locations = state.locations.filter((l) => l.id !== id);
						if (state.currentLocation?.id === id) {
							state.currentLocation = null;
						}
					});
					logger.info(`Location purged: ${id}`, "LocationStore");
				} catch (error) {
					const message = getErrorMessage(error, "Failed to purge location");
					logger.error(
						`Failed to purge location ${id}`,
						error,
						"LocationStore",
					);
					set((state) => {
						state.error = message;
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

			resetStore: () => {
				set((state) => {
					state.locations = [];
					state.currentLocation = null;
					state.loading = false;
					state.error = null;
				});
				if (typeof window !== "undefined") {
					localStorage.removeItem("waste-location-store");
				}
			},
		})),
		{
			name: "waste-location-store",
			storage:
				typeof window === "undefined"
					? undefined
					: createJSONStorage(() => localStorage),
			partialize: (state) => ({
				locations: state.locations,
			}),
		},
	),
);
