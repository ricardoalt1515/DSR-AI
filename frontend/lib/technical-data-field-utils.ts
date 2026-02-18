import type { FieldType } from "@/lib/constants";

interface SaveOnEnterPolicyInput {
	fieldType: FieldType;
	multiline: boolean;
	defaultPrevented: boolean;
	isComposing: boolean;
}

export function hasFieldValue(value: unknown): boolean {
	if (value === undefined || value === null) {
		return false;
	}

	if (typeof value === "string") {
		return value.trim().length > 0;
	}

	if (Array.isArray(value)) {
		return value.length > 0;
	}

	if (typeof value === "number") {
		return Number.isFinite(value);
	}

	return true;
}

export function shouldSaveOnEnter({
	fieldType,
	multiline,
	defaultPrevented,
	isComposing,
}: SaveOnEnterPolicyInput): boolean {
	if (multiline || defaultPrevented || isComposing) {
		return false;
	}

	return !(
		fieldType === "combobox" ||
		fieldType === "tags" ||
		fieldType === "select" ||
		fieldType === "radio"
	);
}

export function normalizeLegacyFieldType(type: string | undefined): {
	type: FieldType;
	multiline?: true;
} {
	if (type === "textarea") {
		return {
			type: "text",
			multiline: true,
		};
	}

	if (
		type === "text" ||
		type === "number" ||
		type === "select" ||
		type === "unit" ||
		type === "tags" ||
		type === "combobox" ||
		type === "radio"
	) {
		return {
			type,
		};
	}

	return {
		type: "text",
	};
}
