"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useCallback, useState } from "react";
import { FlyingValueTarget } from "@/components/features/projects/flying-value-target";
import { FieldEditor } from "@/components/features/technical-data/field-editor";
import { Badge } from "@/components/ui/badge";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { TableField, TableSection } from "@/lib/types/technical-data";
import { cn } from "@/lib/utils";

interface DynamicSectionProps {
	section: TableSection;
	onFieldChange: (
		sectionId: string,
		fieldId: string,
		value: string | number | string[],
		unit?: string,
		notes?: string,
	) => void;
	isCollapsible?: boolean;
	defaultOpen?: boolean;
}

// ✅ REFACTOR: sourceConfig eliminado - ahora manejado por FieldEditor
// ✅ REFACTOR: EditableCell migrado a usar componente compartido FieldEditor
interface EditableCellProps {
	field: TableField;
	sectionId: string;
	onFieldChange: (
		sectionId: string,
		fieldId: string,
		value: string | number | string[],
		unit?: string,
		notes?: string,
	) => void;
}

function EditableCell({ field, sectionId, onFieldChange }: EditableCellProps) {
	return (
		<FieldEditor
			field={field}
			sectionId={sectionId}
			mode="inline"
			onSave={onFieldChange}
			showLabel
			showNotes
			autoSave
		/>
	);
}

// AddFieldDialog removed - questionnaire fields are fixed, no custom fields needed

export function DynamicSection({
	section,
	onFieldChange,
	isCollapsible = true,
	defaultOpen = true,
}: DynamicSectionProps) {
	const [isOpen, setIsOpen] = useState(defaultOpen);

	// ✅ OPTIMIZACIÓN: Filtrar campos condicionales
	const visibleFields = section.fields.filter((field) => {
		// Si no tiene condición, siempre visible
		if (!field.conditional) return true;

		// Buscar el campo del que depende
		const dependsOnField = section.fields.find(
			(f) => f.id === field.conditional?.field,
		);
		if (!dependsOnField) return true; // If field not found, show anyway

		// Verificar si el valor cumple la condición
		const conditionValue = field.conditional.value;
		if (Array.isArray(conditionValue)) {
			return conditionValue.includes(String(dependsOnField.value));
		}
		return String(dependsOnField.value) === String(conditionValue);
	});

	const handleValueLanded = useCallback(
		(fieldId: string) => {
			const el = document.getElementById(`field-${section.id}-${fieldId}`);
			if (el) {
				el.classList.add("animate-apply-burst");
				setTimeout(() => el.classList.remove("animate-apply-burst"), 1000);
			}
		},
		[section.id],
	);

	const content = (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
			{visibleFields.map((field) => (
				<div
					key={field.id}
					id={`field-${section.id}-${field.id}`}
					className={cn(
						"field-container relative",
						// Multiline fields take full width
						field.multiline && "md:col-span-2",
						// Tags take full width (multi-select needs space)
						field.type === "tags" && "md:col-span-2",
						// Multiline text takes full width (handled by multiline prop)
						// Combobox with long options takes full width
						field.type === "combobox" &&
							field.options &&
							field.options.some((opt) => opt.length > 30) &&
							"md:col-span-2",
					)}
				>
					<FlyingValueTarget
						fieldId={field.id}
						sectionId={section.id}
						onValueLanded={() => handleValueLanded(field.id)}
					/>
					<EditableCell
						field={field}
						sectionId={section.id}
						onFieldChange={onFieldChange}
					/>
				</div>
			))}
		</div>
	);

	if (!isCollapsible) {
		// When used inside accordion, no need for extra wrapper/header
		return content;
	}

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen}>
			<div className="border rounded-lg">
				<CollapsibleTrigger asChild>
					<div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer">
						<div className="flex items-center gap-2">
							{isOpen ? (
								<ChevronDown className="h-4 w-4" />
							) : (
								<ChevronRight className="h-4 w-4" />
							)}
							<div className="space-y-1">
								<h3 className="text-lg font-serif font-semibold">
									{section.title}
								</h3>
								{section.description && (
									<p className="text-sm text-muted-foreground">
										{section.description}
									</p>
								)}
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Badge variant="secondary" className="text-xs">
								{section.fields.length} fields
							</Badge>
						</div>
					</div>
				</CollapsibleTrigger>

				<CollapsibleContent>
					<div className="p-4 pt-0 border-t">{content}</div>
				</CollapsibleContent>
			</div>
		</Collapsible>
	);
}
