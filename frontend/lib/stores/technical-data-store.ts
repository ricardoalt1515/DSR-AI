import { useEffect, useMemo, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
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
	sourceBreakdown,
	updateFieldInSections,
} from "@/lib/technical-sheet-data";
import type { TableField, TableSection } from "@/lib/types/technical-data";
import { logger } from "@/lib/utils/logger";
import {
	formatValidationErrors,
	validateTechnicalSections,
} from "@/lib/validation/template-schema";
import { projectDataAPI } from "../api/project-data";

type FieldValue = TableField["value"];

interface TechnicalDataState {
	activeProjectId: string | null;
	technicalData: Record<string, TableSection[]>;
	versions: Record<string, TechnicalDataVersion[]>;
	loading: boolean;
	error: string | null;

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
	applyTemplate: (
		projectId: string,
		templateSections: TableSection[],
		mode?: "replace" | "merge",
		options?: { label?: string },
	) => Promise<void>;
	copyFromProject: (
		projectId: string,
		fromProjectId: string,
		mode?: "replace" | "merge",
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

export const useTechnicalDataStore = create<TechnicalDataState>()(
	persist(
		immer((set, get) => ({
			activeProjectId: null,
			technicalData: {},
			versions: {},
			loading: false,
			error: null,

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
			loadTechnicalData: async (projectId: string) => {
				const currentState = get();

				// Fail fast: Prevent concurrent loads
				if (currentState.loading) {
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
					const errorMessage =
						error instanceof Error
							? error.message
							: "Unknown error loading data";

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

				// Crear snapshot para rollback en caso de error
				const previousSnapshot = deepCloneSections(sections);

				// Actualizar localmente primero (optimistic update)
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

				// Guardar en localStorage y sincronizar con backend JSONB
				try {
					await saveTechnicalSheetData(projectId, updated);
				} catch (error) {
					logger.error(
						"Failed to save field update",
						error,
						"TechnicalDataStore",
					);

					// ROLLBACK: Revertir al estado anterior
					set((state) => {
						state.technicalData[projectId] = previousSnapshot;
						state.error = "Error al actualizar campo. Cambios revertidos.";
					});
					saveTechnicalSheetData(projectId, previousSnapshot);

					// Re-throw error para que el componente pueda manejarlo
					throw error;
				}

				get().saveSnapshot(projectId, {
					label: `Actualización ${new Date().toLocaleString("es-ES")}`,
					source,
				});
			},

			applyFieldUpdates: async (projectId, updates) => {
				const sections = get().technicalData[projectId] ?? [];

				// Crear snapshot para rollback en caso de error
				const previousSnapshot = deepCloneSections(sections);

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

				// Aplicar localmente primero (optimistic update)
				const updated = applyFieldUpdatesHelper(sections, normalizedUpdates);

				set((state) => {
					state.technicalData[projectId] = updated;
					state.error = null;
				});

				try {
					// Sincronizar con backend JSONB
					await saveTechnicalSheetData(projectId, updated);
				} catch (error) {
					logger.error(
						"Failed to sync batch update",
						error,
						"TechnicalDataStore",
					);

					// ROLLBACK: Revertir al estado anterior
					set((state) => {
						state.technicalData[projectId] = previousSnapshot;
						state.error = `Error al aplicar ${updates.length} actualizaciones. Cambios revertidos.`;
					});
					saveTechnicalSheetData(projectId, previousSnapshot);

					// Re-throw error para que el componente pueda manejarlo
					throw error;
				}

				get().saveSnapshot(projectId, {
					label: "Data import",
					source: updates[0]?.source ?? "import",
				});
			},

			applyTemplate: async (projectId, templateSections, _mode, options) => {
				// En fase de desarrollo: siempre reemplazar
				const next = templateSections;

				set((state) => {
					state.technicalData[projectId] = next;
					state.error = null;
				});

				try {
					await saveTechnicalSheetData(projectId, next);
				} catch (_e) {
					logger.warn("Failed to persist template", "TechnicalDataStore");
				}

				get().saveSnapshot(projectId, {
					label: options?.label ?? "Template applied",
					source: "import",
					notes: "Template was applied",
				});
			},

			copyFromProject: async (projectId, fromProjectId, mode = "merge") => {
				const other = await projectDataAPI.getData(fromProjectId);
				const templateSections =
					(other.technical_sections as TableSection[]) || [];
				await get().applyTemplate(projectId, templateSections, mode, {
					label: `Copiado de proyecto ${fromProjectId}`,
				});
			},

			updateSectionNotes: async (projectId, sectionId, notes) => {
				const sections = get().technicalData[projectId] ?? [];
				const next = sections.map((section) =>
					section.id === sectionId
						? {
								...section,
								notes,
							}
						: section,
				);

				set((state) => {
					state.technicalData[projectId] = next;
				});
				saveTechnicalSheetData(projectId, next);
			},

			addCustomSection: async (projectId, section) => {
				set((state) => {
					const sections = state.technicalData[projectId] ?? [];
					state.technicalData[projectId] = [...sections, section];
				});
				const next = get().technicalData[projectId] ?? [];
				saveTechnicalSheetData(projectId, next);
				get().saveSnapshot(projectId, {
					label: section.title,
					source: "manual",
					notes: "Se agregó una sección personalizada",
				});
			},

			removeSection: async (projectId, sectionId) => {
				set((state) => {
					const sections = state.technicalData[projectId] ?? [];
					state.technicalData[projectId] = sections.filter(
						(section) => section.id !== sectionId,
					);
				});
				const next = get().technicalData[projectId] ?? [];
				saveTechnicalSheetData(projectId, next);
				get().saveSnapshot(projectId, {
					label: `Sección eliminada (${sectionId})`,
					source: "manual",
				});
			},

			addField: async (projectId, sectionId, field) => {
				set((state) => {
					const sections = state.technicalData[projectId] ?? [];
					state.technicalData[projectId] = sections.map((section) =>
						section.id === sectionId
							? {
									...section,
									fields: [...section.fields, field],
								}
							: section,
					);
				});
				const next = get().technicalData[projectId] ?? [];
				saveTechnicalSheetData(projectId, next);
				get().saveSnapshot(projectId, {
					label: `Campo agregado (${field.label})`,
					source: "manual",
				});
			},

			removeField: async (projectId, sectionId, fieldId) => {
				set((state) => {
					const sections = state.technicalData[projectId] ?? [];
					state.technicalData[projectId] = sections.map((section) =>
						section.id === sectionId
							? {
									...section,
									fields: section.fields.filter(
										(field) => field.id !== fieldId,
									),
								}
							: section,
					);
				});
				const next = get().technicalData[projectId] ?? [];
				saveTechnicalSheetData(projectId, next);
				get().saveSnapshot(projectId, {
					label: `Campo eliminado (${sectionId}:${fieldId})`,
					source: "manual",
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
					label: `${field.label} (copia)`,
					value: "",
					source: "manual",
				};

				set((state) => {
					const sections = state.technicalData[projectId] ?? [];
					state.technicalData[projectId] = sections.map((section) =>
						section.id === sectionId
							? {
									...section,
									fields: [...section.fields, duplicated],
								}
							: section,
					);
				});
				const next = get().technicalData[projectId] ?? [];
				saveTechnicalSheetData(projectId, next);
				get().saveSnapshot(projectId, {
					label: `Campo duplicado (${field.label})`,
					source: "manual",
				});
			},

			updateFieldLabel: async (projectId, sectionId, fieldId, newLabel) => {
				set((state) => {
					const sections = state.technicalData[projectId] ?? [];
					state.technicalData[projectId] = sections.map((section) =>
						section.id === sectionId
							? {
									...section,
									fields: section.fields.map((field) =>
										field.id === fieldId
											? { ...field, label: newLabel }
											: field,
									),
								}
							: section,
					);
				});
				const next = get().technicalData[projectId] ?? [];
				saveTechnicalSheetData(projectId, next);
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
						`Ficha técnica ${new Date().toLocaleString("es-ES")}`,
					createdAt: new Date().toISOString(),
					createdBy: "Usuario actual",
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
				saveTechnicalSheetData(projectId, snapshot);

				const newVersionLabel = `Rollback a ${version.versionLabel}`;
				get().saveSnapshot(projectId, {
					label: newVersionLabel,
					source: "rollback",
					...(reason ? { notes: reason } : {}),
				});
			},

			/**
			 * Reset technical data to empty state
			 *
			 * Clean code principles:
			 * - Good names: Clear what this does
			 * - Fail fast: Validates project exists
			 * - Proper error handling: Catches and logs errors
			 *
			 * Note: Backend should provide initial template in project creation.
			 * This is a manual reset for users.
			 */
			resetToInitial: async (projectId: string) => {
				try {
					// Clear current data
					const emptyData: TableSection[] = [];

					set((state) => {
						state.technicalData[projectId] = emptyData;
					});

					// Save to backend
					await saveTechnicalSheetData(projectId, emptyData);

					// Create snapshot for history
					get().saveSnapshot(projectId, {
						label: "Technical sheet reset",
						source: "manual",
						notes: "User manually reset technical data to empty state",
					});
				} catch (error) {
					logger.error(
						"Failed to reset technical data",
						error,
						"TechnicalDataStore",
					);
					throw error; // Re-throw for caller to handle
				}
			},

			clearError: () => {
				set((state) => {
					state.error = null;
				});
			},
		})),
		{
			name: "h2o-technical-data-store",
			storage: createJSONStorage(() => localStorage),
			partialize: (state) => ({
				technicalData: state.technicalData,
				versions: state.versions,
			}),
		},
	),
);

// Hydration-safe selectors that return stable empty arrays
export const useTechnicalSections = (projectId: string) => {
	const [isHydrated, setIsHydrated] = useState(false);
	const storeData = useTechnicalDataStore(
		(state) => state.technicalData?.[projectId],
	);

	useEffect(() => {
		setIsHydrated(true);
	}, []);

	return isHydrated ? storeData || EMPTY_SECTIONS : EMPTY_SECTIONS;
};

export const useTechnicalVersions = (projectId: string) => {
	const [isHydrated, setIsHydrated] = useState(false);
	const storeData = useTechnicalDataStore(
		(state) => state.versions?.[projectId],
	);

	useEffect(() => {
		setIsHydrated(true);
	}, []);

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
	applyTemplate: async () => {},
	copyFromProject: async () => {},
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
	updateSectionNotes: async () => {},
};

export const useTechnicalDataActions = () => {
	const [isHydrated, setIsHydrated] = useState(false);

	useEffect(() => {
		setIsHydrated(true);
	}, []);

	// ✅ Acceder directamente al store - las funciones son estables
	const setActiveProject = useTechnicalDataStore((s) => s.setActiveProject);
	const loadTechnicalData = useTechnicalDataStore((s) => s.loadTechnicalData);
	const updateField = useTechnicalDataStore((s) => s.updateField);
	const applyFieldUpdates = useTechnicalDataStore((s) => s.applyFieldUpdates);
	const applyTemplate = useTechnicalDataStore((s) => s.applyTemplate);
	const copyFromProject = useTechnicalDataStore((s) => s.copyFromProject);
	const addCustomSection = useTechnicalDataStore((s) => s.addCustomSection);
	const removeSection = useTechnicalDataStore((s) => s.removeSection);
	const addField = useTechnicalDataStore((s) => s.addField);
	const removeField = useTechnicalDataStore((s) => s.removeField);
	const duplicateField = useTechnicalDataStore((s) => s.duplicateField);
	const updateFieldLabel = useTechnicalDataStore((s) => s.updateFieldLabel);
	const saveSnapshot = useTechnicalDataStore((s) => s.saveSnapshot);
	const revertToVersion = useTechnicalDataStore((s) => s.revertToVersion);
	const resetToInitial = useTechnicalDataStore((s) => s.resetToInitial);
	const clearError = useTechnicalDataStore((s) => s.clearError);
	const updateSectionNotes = useTechnicalDataStore((s) => s.updateSectionNotes);

	// Memoizar el objeto de acciones para mantener referencia estable
	const actions = useMemo(
		() => ({
			setActiveProject,
			loadTechnicalData,
			updateField,
			applyFieldUpdates,
			applyTemplate,
			copyFromProject,
			addCustomSection,
			removeSection,
			addField,
			removeField,
			duplicateField,
			updateFieldLabel,
			saveSnapshot,
			revertToVersion,
			resetToInitial,
			clearError,
			updateSectionNotes,
		}),
		[
			setActiveProject,
			loadTechnicalData,
			updateField,
			applyFieldUpdates,
			applyTemplate,
			copyFromProject,
			addCustomSection,
			removeSection,
			addField,
			removeField,
			duplicateField,
			updateFieldLabel,
			saveSnapshot,
			revertToVersion,
			resetToInitial,
			clearError,
			updateSectionNotes,
		],
	);

	return isHydrated ? actions : EMPTY_ACTIONS;
};
