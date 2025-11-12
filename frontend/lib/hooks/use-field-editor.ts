import { useCallback, useEffect, useMemo, useReducer } from "react";
import type { TableField } from "@/lib/types/technical-data";
import { useDebounce } from "./use-debounce";

/**
 * ✅ Hook compartido para lógica de edición de campos
 * Centraliza estado, validación y auto-save
 */

type EditMode = "viewing" | "editing" | "notes" | "deleting";

export interface FieldEditorState {
	mode: EditMode;
	value: string | number | string[];
	unit: string;
	notes: string;
	error: string | null;
}

type FieldEditorAction =
	| { type: "START_EDIT" }
	| { type: "START_NOTES" }
	| { type: "START_DELETE" }
	| { type: "UPDATE_VALUE"; payload: string | number | string[] }
	| { type: "UPDATE_UNIT"; payload: string }
	| { type: "UPDATE_NOTES"; payload: string }
	| { type: "SET_ERROR"; payload: string | null }
	| {
			type: "CANCEL";
			payload: {
				value: string | number | string[];
				unit: string;
				notes: string;
			};
	  }
	| { type: "SAVE" }
	| { type: "SAVE_NOTES" };

function fieldEditorReducer(
	state: FieldEditorState,
	action: FieldEditorAction,
): FieldEditorState {
	switch (action.type) {
		case "START_EDIT":
			return { ...state, mode: "editing", error: null };
		case "START_NOTES":
			return { ...state, mode: state.mode === "notes" ? "viewing" : "notes" };
		case "START_DELETE":
			return {
				...state,
				mode: state.mode === "deleting" ? "viewing" : "deleting",
			};
		case "UPDATE_VALUE":
			return { ...state, value: action.payload };
		case "UPDATE_UNIT":
			return { ...state, unit: action.payload };
		case "UPDATE_NOTES":
			return { ...state, notes: action.payload };
		case "SET_ERROR":
			return { ...state, error: action.payload };
		case "CANCEL":
			return {
				...state,
				mode: "viewing",
				value: action.payload.value,
				unit: action.payload.unit,
				notes: action.payload.notes,
				error: null,
			};
		case "SAVE":
			return { ...state, mode: "viewing", error: null };
		case "SAVE_NOTES":
			return { ...state, mode: "viewing" };
		default:
			return state;
	}
}

interface UseFieldEditorOptions {
	field: TableField;
	onSave?: (
		value: string | number | string[],
		unit?: string,
		notes?: string,
	) => void;
	autoSave?: boolean;
	autoSaveDelay?: number;
}

export function useFieldEditor({
	field,
	onSave,
	autoSave = false,
	autoSaveDelay = 500, // ✅ 500ms prevents race conditions with Select/Combobox interactions
}: UseFieldEditorOptions) {
	// ✅ Estado consolidado con useReducer
	const [state, dispatch] = useReducer(fieldEditorReducer, {
		mode: "viewing" as const,
		value: field.value,
		unit: field.unit || "",
		notes: field.notes || "",
		error: null,
	});

	// ✅ Validación centralizada
	const validateValue = useCallback(
		(value: string | number | string[]): string | null => {
			// Required field validation
			if (
				field.required &&
				(!value || value === "" || (Array.isArray(value) && value.length === 0))
			) {
				return "This field is required";
			}

			// Custom validation rule
			if (field.validationRule && value) {
				const isValid = field.validationRule(value);
				if (!isValid && field.validationMessage) {
					return field.validationMessage;
				}
			}

			return null;
		},
		[field.required, field.validationRule, field.validationMessage],
	);

	// ✅ Validación en tiempo real
	const validationStatus = useMemo(() => {
		if (!state.value && state.value !== 0) return null;
		const error = validateValue(state.value);
		return error ? "invalid" : "valid";
	}, [state.value, validateValue]);

	// ✅ Auto-save con debounce (solo si está habilitado)
	const debouncedValue = useDebounce(state.value, autoSaveDelay);
	const debouncedUnit = useDebounce(state.unit, autoSaveDelay);

	useEffect(() => {
		if (!autoSave || !onSave) return;

		// Solo auto-guardar si:
		// 1. Estamos en modo edición
		// 2. El valor cambió
		// 3. El valor es válido o está vacío
		if (
			state.mode === "editing" &&
			(debouncedValue !== field.value || debouncedUnit !== field.unit) &&
			validationStatus !== "invalid"
		) {
			onSave(debouncedValue, debouncedUnit, state.notes);
			// ✅ FIX: NO cerrar modo edición en auto-save
			// El usuario sale explícitamente con: click fuera, Enter, o Escape
			// dispatch({ type: 'SAVE' }) ← REMOVIDO
		}
	}, [
		autoSave,
		debouncedValue,
		debouncedUnit,
		validationStatus,
		state.notes,
		state.mode,
		field.value,
		field.unit,
		onSave,
	]);

	// ✅ Acciones
	const startEdit = useCallback(() => {
		dispatch({ type: "START_EDIT" });
	}, []);

	const startNotes = useCallback(() => {
		dispatch({ type: "START_NOTES" });
	}, []);

	const startDelete = useCallback(() => {
		dispatch({ type: "START_DELETE" });
	}, []);

	const updateValue = useCallback((value: string | number | string[]) => {
		dispatch({ type: "UPDATE_VALUE", payload: value });
	}, []);

	const updateUnit = useCallback((unit: string) => {
		dispatch({ type: "UPDATE_UNIT", payload: unit });
	}, []);

	const updateNotes = useCallback((notes: string) => {
		dispatch({ type: "UPDATE_NOTES", payload: notes });
	}, []);

	const handleSave = useCallback(() => {
		const error = validateValue(state.value);
		if (error) {
			dispatch({ type: "SET_ERROR", payload: error });
			return false;
		}

		if (onSave) {
			onSave(state.value, state.unit, state.notes);
		}
		dispatch({ type: "SAVE" });
		return true;
	}, [state.value, state.unit, state.notes, validateValue, onSave]);

	const handleSaveNotes = useCallback(() => {
		if (onSave) {
			onSave(field.value, field.unit, state.notes);
		}
		dispatch({ type: "SAVE_NOTES" });
	}, [field.value, field.unit, state.notes, onSave]);

	const handleCancel = useCallback(() => {
		dispatch({
			type: "CANCEL",
			payload: {
				value: field.value,
				unit: field.unit || "",
				notes: field.notes || "",
			},
		});
	}, [field.value, field.unit, field.notes]);

	return {
		state,
		validationStatus,
		actions: {
			startEdit,
			startNotes,
			startDelete,
			updateValue,
			updateUnit,
			updateNotes,
			save: handleSave,
			saveNotes: handleSaveNotes,
			cancel: handleCancel,
		},
	};
}
