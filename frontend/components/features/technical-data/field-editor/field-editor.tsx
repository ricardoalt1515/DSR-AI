"use client";

import {
	AlertCircle,
	Check,
	CheckCircle2,
	Edit3,
	Info,
	MessageSquare,
	Save,
	X,
} from "lucide-react";
import React, { useRef, useMemo } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { TagInput } from "@/components/ui/tag-input";
import { Textarea } from "@/components/ui/textarea";
import { useClickOutside } from "@/lib/hooks/use-click-outside";
import { useFieldEditor } from "@/lib/hooks/use-field-editor";
import type { DataSource, TableField } from "@/lib/types/technical-data";
import { cn } from "@/lib/utils";

/**
 * ✅ Componente compartido para editar campos técnicos
 * Soporta: text, number, select, combobox, unit, tags, multiline
 * Modos: inline (dynamic-section), table (engineering-table), dialog (futuro)
 */

interface FieldEditorProps {
	field: TableField;
	sectionId: string;
	mode?: "inline" | "table";
	onSave: (
		sectionId: string,
		fieldId: string,
		value: string | number | string[],
		unit?: string,
		notes?: string,
	) => void;
	onRemove?: (sectionId: string, fieldId: string) => void;
	showRemove?: boolean;
	showLabel?: boolean;
	showNotes?: boolean;
	autoSave?: boolean;
	className?: string;
}

const sourceConfig: Record<
	DataSource,
	{
		label: string;
		variant: "default" | "secondary" | "destructive" | "outline";
		icon: React.ComponentType<{ className?: string }>;
	}
> = {
	manual: {
		label: "Manual",
		variant: "outline",
		icon: Edit3,
	},
	imported: {
		label: "Importado",
		variant: "secondary",
		icon: ({ className }) => <span className={className}>📁</span>,
	},
	ai: {
		label: "IA",
		variant: "default",
		icon: ({ className }) => <span className={className}>🤖</span>,
	},
};

export function FieldEditor({
	field,
	sectionId,
	mode = "inline",
	onSave,
	onRemove,
	showRemove = false,
	showLabel = true,
	showNotes = true,
	autoSave = true,
	className,
}: FieldEditorProps) {
	const { state, validationStatus, actions } = useFieldEditor({
		field,
		autoSave,
		onSave: (value, unit, notes) =>
			onSave(sectionId, field.id, value, unit, notes),
	});

	// ✅ Defensive: fallback to "manual" if source is undefined (legacy data)
	const sourceInfo = sourceConfig[field.source ?? "manual"];

	// ✅ Click outside to save and close editing mode
	// Note: useClickOutside ignores Radix Portals (Select dropdowns, Combobox, etc.)
	// so clicking on dropdown options won't trigger premature save
	const editorRef = useRef<HTMLDivElement>(null);
	useClickOutside(
		editorRef as React.RefObject<HTMLElement>,
		() => {
			if (state.mode === "editing" && autoSave) {
				actions.save();
			}
		},
		state.mode === "editing",
	);

	// ✅ Keyboard shortcuts
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey && !field.multiline) {
			e.preventDefault();
			actions.save();
		} else if (e.key === "Escape") {
			e.preventDefault();
			actions.cancel();
		}
	};

	// ✅ Renderizar input según tipo de campo
	const renderInput = () => {
		switch (field.type) {
			case "select":
				return (
					<Select
						value={state.value?.toString() ?? ""}
						onValueChange={(v) => actions.updateValue(v)}
					>
						<SelectTrigger className={mode === "table" ? "h-8" : "h-8"}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{field.options?.map((option) => (
								<SelectItem key={option} value={option}>
									{option}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				);

			case "combobox":
				return (
					<Combobox
						value={state.value?.toString() ?? ""}
						onChange={(v) => actions.updateValue(v)}
						options={field.options || []}
						placeholder={field.placeholder || "Select or type..."}
						className={mode === "table" ? "h-8" : "h-8"}
					/>
				);

			case "unit":
				return (
					<div className="flex gap-1">
						<Input
							value={state.value ?? ""}
							onChange={(e) => actions.updateValue(e.target.value)}
							className={mode === "table" ? "h-8 flex-1" : "h-8 flex-1"}
							type="number"
							step="any"
							onKeyDown={handleKeyDown}
						/>
						{field.units && field.units.length > 0 && (
							<Select
								value={state.unit}
								onValueChange={(v) => actions.updateUnit(v)}
							>
								<SelectTrigger className="h-8 w-20">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{field.units.map((unit) => (
										<SelectItem key={unit} value={unit}>
											{unit}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					</div>
				);

			case "tags":
				return (
					<TagInput
						tags={Array.isArray(state.value) ? state.value : []}
						onChange={(tags) => actions.updateValue(tags)}
						placeholder={field.placeholder || "Seleccione opciones..."}
						suggestions={field.options || []}
						className="min-h-[32px]"
					/>
				);

			default:
				return field.multiline ? (
					<Textarea
						value={state.value?.toString() ?? ""}
						onChange={(e) => actions.updateValue(e.target.value)}
						rows={6}
						placeholder={field.placeholder}
						className="resize-none"
					/>
				) : (
					<Input
						value={state.value ?? ""}
						onChange={(e) => actions.updateValue(e.target.value)}
						className={mode === "table" ? "h-8" : "h-8"}
						type={field.type === "number" ? "number" : "text"}
						step={field.type === "number" ? "any" : undefined}
						placeholder={field.placeholder}
						onKeyDown={handleKeyDown}
					/>
				);
		}
	};

	// ✅ Display value para modo viewing
	const displayValue = React.useMemo(() => {
		if (field.type === "unit" && field.unit) {
			return field.value ? `${field.value} ${field.unit}` : "";
		}
		if (field.type === "tags" && Array.isArray(field.value)) {
			return field.value.length > 0 ? field.value.join(", ") : "Unselected";
		}
		return field.value || field.value === 0 ? String(field.value) : "";
	}, [field.value, field.type, field.unit]);

	// ✅ MODE: TABLE - Vista compacta para tabla
	if (mode === "table") {
		if (state.mode === "editing") {
			return (
				<div className={cn("flex items-center gap-2 min-w-0", className)}>
					{renderInput()}
					<div className="flex gap-1">
						<Button
							type="button"
							size="sm"
							variant="ghost"
							onClick={() => actions.save()}
							className="h-8 w-8 p-0"
						>
							<Check className="h-4 w-4 text-success" />
						</Button>
						<Button
							type="button"
							size="sm"
							variant="ghost"
							onClick={() => actions.cancel()}
							className="h-8 w-8 p-0"
						>
							<X className="h-4 w-4 text-destructive" />
						</Button>
					</div>
				</div>
			);
		}

		return (
			<button
				type="button"
				className={cn(
					"flex items-center gap-2 p-2 rounded hover:bg-accent/50 transition-colors w-full text-left",
					className,
				)}
				onClick={() => actions.startEdit()}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						actions.startEdit();
					}
				}}
			>
				<span className="flex-1 text-sm truncate">{displayValue}</span>
				{!displayValue && (
					<span className="text-muted-foreground text-xs italic">
						Click to edit
					</span>
				)}
			</button>
		);
	}

	const hasValue =
		field.value !== undefined && field.value !== "" && field.value !== null;

	// ✅ MODE: INLINE - Vista completa para dynamic-section
	return (
		<div ref={editorRef} className={cn("group space-y-1.5", className)}>
			{/* Header */}
			{showLabel && (
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-1.5">
						<Label className="text-sm font-medium text-foreground/80">
							{field.label}
							{field.required && (
								<span className="text-destructive ml-0.5">*</span>
							)}
						</Label>
						{hasValue && (
							<CheckCircle2 className="h-3.5 w-3.5 text-success animate-checkmark" />
						)}
						{field.description && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-4 w-4 p-0"
								title={field.description}
							>
								<Info className="h-3 w-3 text-muted-foreground" />
							</Button>
						)}
						{showNotes && field.notes && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-4 w-4 p-0"
								onClick={() => actions.startNotes()}
								title="View/edit notes"
							>
								<MessageSquare className="h-3 w-3 text-primary fill-primary/20" />
							</Button>
						)}
					</div>
					{showRemove && onRemove && (
						<>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
								onClick={() => actions.startDelete()}
							>
								<X className="h-3 w-3" />
							</Button>
							<AlertDialog
								open={state.mode === "deleting"}
								onOpenChange={(open) => !open && actions.cancel()}
							>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>Delete field?</AlertDialogTitle>
										<AlertDialogDescription>
											You are about delete field "<strong>{field.label}</strong>
											". This action cannot be undone.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction
											onClick={() => onRemove?.(sectionId, field.id)}
											className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
										>
											Delete
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</>
					)}
				</div>
			)}

			{/* Editing Mode */}
			{state.mode === "editing" ? (
				// biome-ignore lint/a11y/useSemanticElements: Using role="form" instead of <form> because this is inline editing without form submission
				<div
					role="form"
					aria-label="Edit field"
					className={cn(
						"space-y-2",
						mode === "inline" && "p-2 rounded-md border bg-card",
						mode !== "inline" && "p-1",
					)}
					ref={editorRef}
					onKeyDown={handleKeyDown}
				>
					{renderInput()}
					{/* Validation feedback */}
					{state.error && (
						<div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 px-2 py-1.5 rounded">
							<AlertCircle className="h-3 w-3 flex-shrink-0" />
							<span className="font-medium">{state.error}</span>
						</div>
					)}
					{/* ✅ FIX: Solo mostrar "Válido" si NO hay autoSave */}
					{validationStatus === "valid" && !state.error && !autoSave && (
						<div className="flex items-center gap-1.5 text-xs text-success">
							<CheckCircle2 className="h-3 w-3" />
							<span>Válido</span>
						</div>
					)}
					{!autoSave && (
						<div className="flex gap-1 justify-end">
							<Button
								type="button"
								size="sm"
								variant="ghost"
								onClick={() => actions.cancel()}
								title="Esc para cancelar"
							>
								<X className="h-3 w-3" />
							</Button>
							<Button
								type="button"
								size="sm"
								onClick={() => actions.save()}
								title="Enter para guardar"
								disabled={validationStatus === "invalid"}
							>
								<Edit3 className="h-3 w-3" />
							</Button>
						</div>
					)}
				</div>
			) : (
				/* Viewing Mode - Simplified, click to edit */
				<button
					type="button"
					className={cn(
						"field-input-display px-3 py-2 rounded-md border border-input bg-background transition-colors w-full text-left",
						"hover:border-primary/50 hover:bg-accent/30 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
						field.multiline ? "min-h-[80px]" : "h-9",
						field.required &&
							!hasValue &&
							"border-destructive/50 bg-destructive/5",
					)}
					onClick={() => actions.startEdit()}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							actions.startEdit();
						}
					}}
				>
					{field.multiline ? (
						displayValue ? (
							<p className="text-sm whitespace-pre-wrap text-foreground leading-relaxed line-clamp-3">
								{displayValue}
							</p>
						) : (
							<p className="text-sm text-muted-foreground">
								{field.placeholder || "Click to add..."}
							</p>
						)
					) : (
						<span
							className={cn(
								"text-sm truncate block",
								hasValue ? "text-foreground" : "text-muted-foreground",
							)}
						>
							{displayValue || field.placeholder || "Enter value..."}
						</span>
					)}
				</button>
			)}

			{/* Notes Editor */}
			{showNotes && state.mode === "notes" && (
				<div className="space-y-2 pt-2 border-t">
					<div className="flex items-center justify-between">
						<Label className="text-xs font-medium">Field notes</Label>
						<span className="text-xs text-muted-foreground">
							Contexto, supuestos, fuente
						</span>
					</div>
					<Textarea
						value={state.notes}
						onChange={(e) => actions.updateNotes(e.target.value)}
						placeholder="Example: The client mentioned that this value may vary by ±20% during peak season."
						rows={3}
						className="text-xs"
					/>
					<div className="flex justify-end gap-2">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => actions.cancel()}
						>
							Cancel
						</Button>
						<Button
							type="button"
							size="sm"
							onClick={() => actions.saveNotes()}
							disabled={state.notes === field.notes}
						>
							<Save className="h-3 w-3 mr-1" />
							Save
						</Button>
					</div>
				</div>
			)}

			{/* Notes Preview */}
			{showNotes && field.notes && state.mode === "viewing" && (
				<div className="flex items-start gap-2 px-3 py-2 bg-muted/50 rounded-md text-xs">
					<MessageSquare className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
					<p className="text-muted-foreground line-clamp-2">{field.notes}</p>
				</div>
			)}
		</div>
	);
}
