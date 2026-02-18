import { useCallback, useEffect, useMemo, useState } from "react";
import { hasFieldValue } from "@/lib/technical-data-field-utils";
import type { TableField } from "@/lib/types/technical-data";
import { useDebounce } from "./use-debounce";

/**
 * ✅ Hook compartido para lógica de edición de campos
 * Centraliza estado, validación y auto-save
 * Patrón CONTROLADO: siempre usa field.value como fuente de verdad
 */

type EditMode = "viewing" | "editing" | "notes" | "deleting";

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
	autoSaveDelay = 500,
}: UseFieldEditorOptions) {
	// ✅ Estado local SOLO para draft durante edición
	const [mode, setMode] = useState<EditMode>("viewing");
	const [draftValue, setDraftValue] = useState<
		string | number | string[] | null
	>(null);
	const [draftUnit, setDraftUnit] = useState<string | null>(null);
	const [draftNotes, setDraftNotes] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	// ✅ Fuente única de verdad: siempre usa field.* cuando no estamos editando
	const value = mode === "editing" ? draftValue : field.value;
	const unit =
		mode === "editing" ? (draftUnit ?? field.unit ?? "") : (field.unit ?? "");
	const notes =
		mode === "notes" ? (draftNotes ?? field.notes ?? "") : (field.notes ?? "");

	// ✅ Validación centralizada
	const validateValue = useCallback(
		(val: string | number | string[] | null): string | null => {
			// Required field validation
			if (field.required && !hasFieldValue(val)) {
				return "This field is required";
			}

			// Custom validation rule
			if (field.validationRule && val) {
				const isValid = field.validationRule(val);
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
		if (!hasFieldValue(value)) return null;
		const err = validateValue(value);
		return err ? "invalid" : "valid";
	}, [value, validateValue]);

	// ✅ Auto-save con debounce (solo si está habilitado)
	const debouncedValue = useDebounce(draftValue, autoSaveDelay);
	const debouncedUnit = useDebounce(draftUnit, autoSaveDelay);

	useEffect(() => {
		if (!autoSave || !onSave) return;
		if (mode !== "editing") return;
		if (validationStatus === "invalid") return;

		// ✅ FIX: Solo guardar si hay un draft activo del usuario
		const hasValueChanged =
			debouncedValue !== null && debouncedValue !== field.value;
		const hasUnitChanged =
			debouncedUnit !== null && debouncedUnit !== field.unit;

		if (hasValueChanged || hasUnitChanged) {
			onSave(debouncedValue ?? "", debouncedUnit ?? field.unit ?? "", notes);
		}
	}, [
		autoSave,
		debouncedValue,
		debouncedUnit,
		field.value,
		field.unit,
		mode,
		notes,
		onSave,
		validationStatus,
	]);

	// ✅ Acciones
	const startEdit = useCallback(() => {
		setDraftValue(field.value);
		setDraftUnit(field.unit ?? "");
		setError(null);
		setMode("editing");
	}, [field.value, field.unit]);

	const startNotes = useCallback(() => {
		setDraftNotes(field.notes ?? "");
		setMode((prev) => (prev === "notes" ? "viewing" : "notes"));
	}, [field.notes]);

	const startDelete = useCallback(() => {
		setMode((prev) => (prev === "deleting" ? "viewing" : "deleting"));
	}, []);

	const updateValue = useCallback(
		(val: string | number | string[]) => {
			setDraftValue(val);
			// Clear error when user starts typing
			if (error) setError(null);
		},
		[error],
	);

	const updateUnit = useCallback((u: string) => {
		setDraftUnit(u);
	}, []);

	const updateNotes = useCallback((n: string) => {
		setDraftNotes(n);
	}, []);

	const handleSave = useCallback(() => {
		const val = draftValue ?? field.value ?? "";
		const err = validateValue(val);
		if (err) {
			setError(err);
			return false;
		}

		if (onSave) {
			onSave(
				val,
				draftUnit ?? field.unit ?? "",
				draftNotes ?? field.notes ?? "",
			);
		}
		setDraftValue(null);
		setDraftUnit(null);
		setError(null);
		setMode("viewing");
		return true;
	}, [
		draftValue,
		draftUnit,
		draftNotes,
		field.value,
		field.unit,
		field.notes,
		validateValue,
		onSave,
	]);

	const handleSaveNotes = useCallback(() => {
		if (onSave) {
			onSave(field.value, field.unit ?? "", draftNotes ?? field.notes ?? "");
		}
		setDraftNotes(null);
		setMode("viewing");
	}, [field.value, field.unit, field.notes, draftNotes, onSave]);

	const handleCancel = useCallback(() => {
		setDraftValue(null);
		setDraftUnit(null);
		setDraftNotes(null);
		setError(null);
		setMode("viewing");
	}, []);

	return {
		state: {
			mode,
			value,
			unit,
			notes,
			error,
		},
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
