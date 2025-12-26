import type { DataSource, FieldImportance, FieldType } from "@/lib/constants";
import type { VersionChange, VersionSource } from "@/lib/project-types";

export type { DataSource, FieldType, FieldImportance };

// Re-export version types from project-types to avoid duplication
export type { VersionChange, VersionSource };

export interface TableField {
	id: string;
	label: string;
	value: string | number | string[]; // ✅ Soporta arrays para tipo "tags"
	unit?: string;
	type: FieldType;
	source: DataSource;
	options?: string[];
	units?: string[];
	required?: boolean;
	validationRule?: (value: unknown) => boolean;
	validationMessage?: string;
	description?: string;
	multiline?: boolean;
	placeholder?: string;
	suggestedValue?: string | number | string[]; // ✅ También para sugerencias
	lastUpdatedAt?: string;
	lastUpdatedBy?: string;
	importance?: FieldImportance;
	notes?: string;
	conditional?: {
		// ✅ Nuevo: soporte para campos condicionales
		field: string;
		value: string | string[];
	};
	targetSection?: string; // ✅ Metadata: usado en librería de parámetros para indicar sección destino
}

export interface TableSection {
	id: string;
	title: string;
	description?: string | undefined;
	fields: TableField[];
	notes?: string | undefined;
	allowCustomFields?: boolean | undefined;
	/** Display order (lower numbers first). Defaults to 0 if not specified. */
	order?: number;
}

// Additional technical data types
export interface TechnicalDataVersion {
	projectId: string;
	versionLabel: string;
	createdAt: string;
	createdBy: string;
	source: VersionSource;
	snapshot: TableSection[];
	changes: VersionChange[];
	notes?: string;
}
