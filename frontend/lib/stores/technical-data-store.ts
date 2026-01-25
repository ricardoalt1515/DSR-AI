import { useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";
import { useIsHydrated } from "@/lib/hooks/use-is-hydrated";
import type {
	TechnicalDataVersion,
	VersionChange,
	VersionSource,
} from "@/lib/project-types";
import {
	applyFieldUpdates as applyFieldUpdatesHelper,
	type FieldUpdate,
	mapSectionsToSummaryRows,
	overallCompletion,
	rehydrateFieldsFromLibrary,
	saveTechnicalSheetData,
	sortSectionsByOrder,
	sourceBreakdown,
	updateFieldInSections,
} from "@/lib/technical-sheet-data";
import type { TableField, TableSection } from "@/lib/types/technical-data";
import { getErrorMessage, logger } from "@/lib/utils/logger";
import {
	formatValidationErrors,
	validateTechnicalSections,
} from "@/lib/validation/template-schema";
import { projectDataAPI } from "../api/project-data";
import { useProjectStore } from "./project-store";

type FieldValue = TableField["value"];

interface TechnicalDataState {
	activeProjectId: string | null;
	technicalData: Record<string, TableSection[]>;
	versions: Record<string, TechnicalDataVersion[]>;
	loading: boolean;
	saving: boolean;
	lastSaved: Date | null;
	error: string | null;
	// Sync error state - for backend failures that don't rollback local changes
	syncError: string | null;
	pendingChanges: boolean;

	// Selectors
	getSections: (projectId: string) => TableSection[];
	getVersions: (projectId: string) => TechnicalDataVersion[];

	// Actions
	setActiveProject: (projectId: string | null) => void;
	loadTechnicalData: (projectId: string) => Promise<void>;
	updateField: (
		projectId: string,
		payload: {
			sectionId: string;
			fieldId: string;
			value: FieldValue;
			unit?: string;
			source?: VersionSource;
			notes?: string;
		},
	) => Promise<void>;
	applyFieldUpdates: (
		projectId: string,
		updates: {
			sectionId: string;
			fieldId: string;
			value: FieldValue;
			unit?: string;
			source?: VersionSource;
		}[],
	) => Promise<void>;
	addCustomSection: (projectId: string, section: TableSection) => Promise<void>;
	removeSection: (projectId: string, sectionId: string) => Promise<void>;
	addField: (
		projectId: string,
		sectionId: string,
		field: TableField,
	) => Promise<void>;
	removeField: (
		projectId: string,
		sectionId: string,
		fieldId: string,
	) => Promise<void>;
	duplicateField: (
		projectId: string,
		sectionId: string,
		fieldId: string,
	) => Promise<void>;
	updateFieldLabel: (
		projectId: string,
		sectionId: string,
		fieldId: string,
		newLabel: string,
	) => Promise<void>;
	saveSnapshot: (
		projectId: string,
		options?: { label?: string; source?: VersionSource; notes?: string },
	) => TechnicalDataVersion | null;
	revertToVersion: (
		projectId: string,
		versionId: string,
		reason?: string,
	) => Promise<void>;
	resetToInitial: (projectId: string) => Promise<void>;
	clearError: () => void;
	clearSyncError: () => void;
	retrySync: (projectId: string) => Promise<void>;
	updateSectionNotes: (
		projectId: string,
		sectionId: string,
		notes: string,
	) => Promise<void>;
}

// Stable empty arrays to prevent unnecessary re-renders
const EMPTY_SECTIONS: TableSection[] = [];
const EMPTY_VERSIONS: TechnicalDataVersion[] = [];

const deepCloneSections = (sections: TableSection[]): TableSection[] =>
	JSON.parse(JSON.stringify(sections));

const syncTechnicalSheetData = async (
	projectId: string,
	sections: TableSection[],
) => {
	const result = await saveTechnicalSheetData(projectId, sections);
	if (typeof result?.progress === "number") {
		useProjectStore
			.getState()
			.updateProjectProgress(projectId, result.progress);
	}
	return result;
};

const computeVersionChanges = (
	previous: TableSection[] | undefined,
	current: TableSection[],
	source: VersionSource,
): VersionChange[] => {
	if (!previous) {
		return current.flatMap((section) =>
			section.fields.map((field) => ({
				id: `${section.id}:${field.id}`,
				sectionId: section.id,
				fieldId: field.id,
				label: field.label,
				oldValue: null,
				newValue: field.value ?? null,
				...(field.unit !== undefined ? { unit: field.unit } : {}),
				source,
				changeType: "added" as const,
			})),
		);
	}

	const prevMap = new Map<
		string,
		{ sectionId: string; fieldId: string; field: TableField }
	>();
	previous.forEach((section) => {
		section.fields.forEach((field) => {
			prevMap.set(`${section.id}:${field.id}`, {
				sectionId: section.id,
				fieldId: field.id,
				field,
			});
		});
	});

	const changes: VersionChange[] = [];

	current.forEach((section) => {
		section.fields.forEach((field) => {
			const key = `${section.id}:${field.id}`;
			const prev = prevMap.get(key);
			if (!prev) {
				changes.push({
					id: key,
					sectionId: section.id,
					fieldId: field.id,
					label: field.label,
					oldValue: null,
					newValue: field.value ?? null,
					...(field.unit !== undefined && { unit: field.unit }),
					source,
					changeType: "added",
				});
				return;
			}

			const valueChanged = prev.field.value !== field.value;
			const unitChanged = prev.field.unit !== field.unit;

			if (valueChanged || unitChanged) {
				const change: VersionChange = {
					id: key,
					sectionId: section.id,
					fieldId: field.id,
					label: field.label,
					oldValue: prev.field.value ?? null,
					newValue: field.value ?? null,
					source,
					changeType: "modified",
				};
				if (field.unit !== undefined) change.unit = field.unit;
				changes.push(change);
			}

			prevMap.delete(key);
		});
	});

	// Remaining fields in prevMap were removed
	prevMap.forEach(({ sectionId, fieldId, field }) => {
		const change: VersionChange = {
			id: `${sectionId}:${fieldId}`,
			sectionId,
			fieldId,
			label: field.label,
			oldValue: field.value ?? null,
			newValue: null,
			source,
			changeType: "removed",
		};
		if (field.unit !== undefined) change.unit = field.unit;
		changes.push(change);
	});

	return changes;
};

const mapVersionSourceToDataSource = (
	source?: VersionSource,
): FieldUpdate["source"] => {
	if (!source) return undefined;
	switch (source) {
		case "manual":
			return "manual";
		case "ai":
			return "ai";
		case "import":
			return "imported";
		case "rollback":
			return "manual";
		default:
			return undefined;
	}
};

interface SyncActionOptions {
	projectId: string;
	sections: TableSection[];
	snapshot?: { label: string; source?: VersionSource; notes?: string };
	errorContext: string;
}

type StoreGet = () => TechnicalDataState;
type StoreSet = (fn: (state: TechnicalDataState) => void) => void;

const executeSyncAction = async (
	get: StoreGet,
	set: StoreSet,
	options: SyncActionOptions,
): Promise<void> => {
	const { projectId, sections, snapshot, errorContext } = options;

	set((state) => {
		state.saving = true;
		state.syncError = null;
	});

	try {
		await syncTechnicalSheetData(projectId, sections);
		set((state) => {
			state.saving = false;
			state.lastSaved = new Date();
			state.pendingChanges = false;
			state.syncError = null;
		});

		if (snapshot) {
			get().saveSnapshot(projectId, snapshot);
		}
	} catch (error) {
		const errorMessage = getErrorMessage(error, "Sync failed");
		logger.error(errorContext, error, "TechnicalDataStore");

		set((state) => {
			state.saving = false;
			state.syncError = errorMessage;
			state.pendingChanges = true;
		});
	}
};

export const useTechnicalDataStore = create<TechnicalDataState>()(
	persist(
		immer((set, get) => ({
			activeProjectId: null,
			technicalData: {},
			versions: {},
			loading: false,
			saving: false,
			lastSaved: null,
			error: null,
			syncError: null,
			pendingChanges: false,

			getSections: (projectId) =>
				get().technicalData?.[projectId] || EMPTY_SECTIONS,
			getVersions: (projectId) => get().versions?.[projectId] || EMPTY_VERSIONS,

			setActiveProject: (projectId) => {
				set((state) => {
					state.activeProjectId = projectId;
					state.error = null;
				});
			},

			/**
			 * Load technical data for a project
			 *
			 * Clean code principles:
			 * - Fail fast: Check loading state immediately
			 * - Good names: Clear parameter and variable names
			 * - Single responsibility: Only loads data
			 * - Proper error handling: Catches and logs errors
			 */
			loadTechnicalData: async (projectId: string, force = false) => {
				const currentState = get();

				// Fail fast: Prevent concurrent loads
				if (currentState.loading && !force) {
					logger.debug(
						"Load already in progress, skipping",
						"TechnicalDataStore",
					);
					return;
				}

				set({ loading: true });

				try {
					// Load data from backend
					const projectData = await projectDataAPI.getData(projectId);
					const rawSections = projectData.technical_sections as
						| TableSection[]
						| undefined;

					// No data yet - backend may still be applying template
					if (!rawSections || rawSections.length === 0) {
						logger.info(
							"No technical data found - backend may still be applying template",
							"TechnicalDataStore",
						);

						// Backend applies template automatically in background (1-2 seconds)
						// Don't create frontend template - wait for backend
						set((state) => {
							state.technicalData[projectId] = [];
							state.loading = false;
						});

						return;
					}

					// Validate backend response with Zod
					const validationResult = validateTechnicalSections(rawSections);
					if (!validationResult.success) {
						const errors = formatValidationErrors(validationResult.error);
						logger.error(
							"Invalid backend data",
							{ projectId, errors },
							"TechnicalDataStore",
						);
					}

					// Rehydrate: Restore JS functions and library metadata
					// (Backend JSON can't serialize functions)
					const rehydratedSections = rehydrateFieldsFromLibrary(rawSections);

					// Save to store
					set((state) => {
						state.technicalData[projectId] = rehydratedSections;
						state.loading = false;
						state.error = null; // Clear any previous errors
					});
				} catch (error) {
					// Proper error handling: Log and set error state
					const errorMessage = getErrorMessage(
						error,
						"Unknown error loading data",
					);

					logger.error(
						"Failed to load technical data",
						error,
						"TechnicalDataStore",
					);

					// Set error state with empty data (fail gracefully)
					set((state) => {
						state.technicalData[projectId] = [];
						state.loading = false;
						state.error = errorMessage;
					});
				}
			},

			updateField: async (
				projectId,
				{ sectionId, fieldId, value, unit, source = "manual", notes },
			) => {
				const sections = get().technicalData[projectId] ?? [];

				// Optimistic update
				const updatePayload: FieldUpdate = { sectionId, fieldId, value };
				if (unit !== undefined) updatePayload.unit = unit;
				if (notes !== undefined) updatePayload.notes = notes;
				const mapped = mapVersionSourceToDataSource(source);
				if (mapped) updatePayload.source = mapped;
				const updated = updateFieldInSections(sections, updatePayload);

				set((state) => {
					state.technicalData[projectId] = updated;
					state.error = null;
				});

				await executeSyncAction(get, set, {
					projectId,
					sections: updated,
					snapshot: {
						label: `Update ${new Date().toLocaleString("en-US")}`,
						source,
					},
					errorContext: "Failed to save field update",
				});
			},

			applyFieldUpdates: async (projectId, updates) => {
				const sections = get().technicalData[projectId] ?? [];

				const normalizedUpdates: FieldUpdate[] = updates.map((update) => {
					const mapped = mapVersionSourceToDataSource(update.source);
					const obj: FieldUpdate = {
						sectionId: update.sectionId,
						fieldId: update.fieldId,
						value: update.value,
					};
					if (update.unit !== undefined) obj.unit = update.unit;
					if (mapped) obj.source = mapped;
					return obj;
				});

				// Optimistic update
				const updated = applyFieldUpdatesHelper(sections, normalizedUpdates);

				set((state) => {
					state.technicalData[projectId] = updated;
					state.error = null;
				});

				await executeSyncAction(get, set, {
					projectId,
					sections: updated,
					snapshot: {
						label: "Data import",
						source: updates[0]?.source ?? "import",
					},
					errorContext: "Failed to sync batch update",
				});
			},

			updateSectionNotes: async (projectId, sectionId, notes) => {
				const sections = get().technicalData[projectId] ?? [];
				const next = sections.map((section) =>
					section.id === sectionId ? { ...section, notes } : section,
				);

				set((state) => {
					state.technicalData[projectId] = next;
				});

				await executeSyncAction(get, set, {
					projectId,
					sections: next,
					errorContext: "Failed to update section notes",
				});
			},

			addCustomSection: async (projectId, section) => {
				const sections = get().technicalData[projectId] ?? [];
				const next = [...sections, section];

				set((state) => {
					state.technicalData[projectId] = next;
				});

				await executeSyncAction(get, set, {
					projectId,
					sections: next,
					snapshot: {
						label: section.title,
						source: "manual",
						notes: "Custom section added",
					},
					errorContext: "Failed to add custom section",
				});
			},

			removeSection: async (projectId, sectionId) => {
				const sections = get().technicalData[projectId] ?? [];
				const next = sections.filter((section) => section.id !== sectionId);

				set((state) => {
					state.technicalData[projectId] = next;
				});

				await executeSyncAction(get, set, {
					projectId,
					sections: next,
					snapshot: {
						label: `Section removed (${sectionId})`,
						source: "manual",
					},
					errorContext: "Failed to remove section",
				});
			},

			addField: async (projectId, sectionId, field) => {
				const sections = get().technicalData[projectId] ?? [];
				const next = sections.map((section) =>
					section.id === sectionId
						? { ...section, fields: [...section.fields, field] }
						: section,
				);

				set((state) => {
					state.technicalData[projectId] = next;
				});

				await executeSyncAction(get, set, {
					projectId,
					sections: next,
					snapshot: {
						label: `Field added (${field.label})`,
						source: "manual",
					},
					errorContext: "Failed to add field",
				});
			},

			removeField: async (projectId, sectionId, fieldId) => {
				const sections = get().technicalData[projectId] ?? [];
				const next = sections.map((section) =>
					section.id === sectionId
						? {
								...section,
								fields: section.fields.filter((f) => f.id !== fieldId),
							}
						: section,
				);

				set((state) => {
					state.technicalData[projectId] = next;
				});

				await executeSyncAction(get, set, {
					projectId,
					sections: next,
					snapshot: {
						label: `Field removed (${sectionId}:${fieldId})`,
						source: "manual",
					},
					errorContext: "Failed to remove field",
				});
			},

			duplicateField: async (projectId, sectionId, fieldId) => {
				const sections = get().technicalData[projectId] ?? [];
				const section = sections.find((s) => s.id === sectionId);
				const field = section?.fields.find((f) => f.id === fieldId);
				if (!field) return;

				const duplicated: TableField = {
					...field,
					id: crypto.randomUUID(),
					label: `${field.label} (copy)`,
					value: "",
					source: "manual",
				};

				const next = sections.map((s) =>
					s.id === sectionId ? { ...s, fields: [...s.fields, duplicated] } : s,
				);

				set((state) => {
					state.technicalData[projectId] = next;
				});

				await executeSyncAction(get, set, {
					projectId,
					sections: next,
					snapshot: {
						label: `Field duplicated (${field.label})`,
						source: "manual",
					},
					errorContext: "Failed to duplicate field",
				});
			},

			updateFieldLabel: async (projectId, sectionId, fieldId, newLabel) => {
				const sections = get().technicalData[projectId] ?? [];
				const next = sections.map((section) =>
					section.id === sectionId
						? {
								...section,
								fields: section.fields.map((f) =>
									f.id === fieldId ? { ...f, label: newLabel } : f,
								),
							}
						: section,
				);

				set((state) => {
					state.technicalData[projectId] = next;
				});

				await executeSyncAction(get, set, {
					projectId,
					sections: next,
					errorContext: "Failed to update field label",
				});
			},

			saveSnapshot: (projectId, options): TechnicalDataVersion | null => {
				const sections = get().technicalData[projectId];
				if (!sections) {
					return null;
				}

				const previousVersions = get().versions[projectId];
				const previousSnapshot = previousVersions?.[0]?.snapshot;

				const source = options?.source ?? "manual";
				const changes = computeVersionChanges(
					previousSnapshot,
					sections,
					source,
				);

				if (
					changes.length === 0 &&
					previousVersions?.length &&
					options?.source !== "manual"
				) {
					const existingVersion = previousVersions[0];
					return existingVersion !== undefined ? existingVersion : null;
				}

				const version: TechnicalDataVersion = {
					id: crypto.randomUUID(),
					projectId,
					versionLabel:
						options?.label ??
						`Technical sheet ${new Date().toLocaleString("en-US")}`,
					createdAt: new Date().toISOString(),
					createdBy: "Current user",
					source,
					snapshot: deepCloneSections(sections),
					changes,
					...(options?.notes ? { notes: options.notes } : {}),
				};

				set((state) => {
					const existing = state.versions[projectId] || [];
					state.versions[projectId] = [version, ...existing];
				});

				return version;
			},

			revertToVersion: async (projectId, versionId, reason) => {
				const versions = get().versions[projectId] ?? [];
				const version = versions.find((v) => v.id === versionId);
				if (!version) return;

				const snapshot = deepCloneSections(version.snapshot);
				set((state) => {
					state.technicalData[projectId] = snapshot;
				});

				await executeSyncAction(get, set, {
					projectId,
					sections: snapshot,
					snapshot: {
						label: `Rollback to ${version.versionLabel}`,
						source: "rollback",
						...(reason ? { notes: reason } : {}),
					},
					errorContext: "Failed to revert to version",
				});
			},

			resetToInitial: async (projectId: string) => {
				const emptyData: TableSection[] = [];

				set((state) => {
					state.technicalData[projectId] = emptyData;
				});

				await executeSyncAction(get, set, {
					projectId,
					sections: emptyData,
					snapshot: {
						label: "Technical sheet reset",
						source: "manual",
						notes: "User manually reset technical data to empty state",
					},
					errorContext: "Failed to reset technical data",
				});
			},

			clearError: () => {
				set((state) => {
					state.error = null;
				});
			},

			clearSyncError: () => {
				set((state) => {
					state.syncError = null;
				});
			},

			retrySync: async (projectId: string) => {
				const sections = get().technicalData[projectId];
				if (!sections) return;

				await executeSyncAction(get, set, {
					projectId,
					sections,
					errorContext: "Retry sync failed",
				});
			},
		})),
		{
			name: "h2o-technical-data-store",
			storage:
				typeof window === "undefined"
					? undefined
					: createJSONStorage(() => localStorage),
			partialize: (state) => ({
				technicalData: state.technicalData,
				versions: state.versions,
			}),
		},
	),
);

// Hydration-safe selectors that return stable empty arrays
export const useTechnicalSections = (projectId: string) => {
	const isHydrated = useIsHydrated();
	const storeData = useTechnicalDataStore(
		(state) => state.technicalData?.[projectId],
	);

	const sections = isHydrated ? storeData || EMPTY_SECTIONS : EMPTY_SECTIONS;
	return useMemo(() => sortSectionsByOrder(sections), [sections]);
};

export const useTechnicalVersions = (projectId: string) => {
	const isHydrated = useIsHydrated();
	const storeData = useTechnicalDataStore(
		(state) => state.versions?.[projectId],
	);

	return isHydrated ? storeData || EMPTY_VERSIONS : EMPTY_VERSIONS;
};

export const useTechnicalSummaryData = (projectId: string) => {
	const sections = useTechnicalSections(projectId);

	return useMemo(
		() => ({
			sections,
			summaryRows: mapSectionsToSummaryRows(sections),
			completion: overallCompletion(sections),
			sources: sourceBreakdown(sections),
		}),
		[sections],
	);
};

export const getTechnicalDataCompleteness = (projectId: string) => {
	const store = useTechnicalDataStore.getState();
	const sections = store.technicalData[projectId] || [];
	return overallCompletion(sections);
};

// Stable empty actions object for SSR
const EMPTY_ACTIONS = {
	setActiveProject: () => {},
	loadTechnicalData: async () => {},
	updateField: async () => {},
	applyFieldUpdates: async () => {},
	addCustomSection: async () => null,
	removeSection: async () => {},
	addField: async () => {},
	removeField: async () => {},
	duplicateField: async () => {},
	updateFieldLabel: async () => {},
	saveSnapshot: () => null,
	revertToVersion: async () => {},
	resetToInitial: async () => {},
	clearError: () => {},
	clearSyncError: () => {},
	retrySync: async () => {},
	updateSectionNotes: async () => {},
};

const actionsSelector = (s: TechnicalDataState) => ({
	setActiveProject: s.setActiveProject,
	loadTechnicalData: s.loadTechnicalData,
	updateField: s.updateField,
	applyFieldUpdates: s.applyFieldUpdates,
	addCustomSection: s.addCustomSection,
	removeSection: s.removeSection,
	addField: s.addField,
	removeField: s.removeField,
	duplicateField: s.duplicateField,
	updateFieldLabel: s.updateFieldLabel,
	saveSnapshot: s.saveSnapshot,
	revertToVersion: s.revertToVersion,
	resetToInitial: s.resetToInitial,
	clearError: s.clearError,
	clearSyncError: s.clearSyncError,
	retrySync: s.retrySync,
	updateSectionNotes: s.updateSectionNotes,
});

export const useTechnicalDataActions = () => {
	const isHydrated = useIsHydrated();
	const actions = useTechnicalDataStore(useShallow(actionsSelector));
	return isHydrated ? actions : EMPTY_ACTIONS;
};
