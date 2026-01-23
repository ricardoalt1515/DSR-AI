"use client";

import { AlertTriangle, ChevronDown, FileText, Pencil, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useUnmappedNotesCount } from "@/lib/stores/intake-store";
import type { UnmappedNote } from "@/lib/types/intake";
import type { TableSection } from "@/lib/types/technical-data";
import { cn } from "@/lib/utils";
import { ConfidenceBadge } from "./confidence-badge";

interface UnmappedNotesSectionProps {
	notes: UnmappedNote[];
	sections: TableSection[];
	onMapToField: (
		noteId: string,
		fieldId: string,
		sectionId: string,
		fieldLabel: string,
		sectionTitle: string,
	) => void;
	onDismiss: (noteId: string) => void;
	disabled?: boolean;
}

interface FieldOption {
	fieldId: string;
	fieldLabel: string;
	sectionId: string;
	sectionTitle: string;
}

export function UnmappedNotesSection({
	notes,
	sections,
	onMapToField,
	onDismiss,
	disabled = false,
}: UnmappedNotesSectionProps) {
	const count = useUnmappedNotesCount();
	const [isOpen, setIsOpen] = useState(false);

	// Build grouped field options - memoized to avoid recreation on every render
	const groupedOptions = useMemo(
		() =>
			sections.map((section) => ({
				sectionTitle: section.title,
				fields: section.fields.map((field) => ({
					fieldId: field.id,
					fieldLabel: field.label,
					sectionId: section.id,
					sectionTitle: section.title,
				})),
			})),
		[sections],
	);

	if (notes.length === 0) {
		return null;
	}

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen}>
			<Card className="rounded-3xl border-none bg-muted/20">
				<CollapsibleTrigger asChild>
					<CardHeader className="cursor-pointer pb-3 hover:bg-muted/10 transition-colors rounded-t-3xl">
						<div className="flex items-center justify-between">
							<CardTitle className="flex items-center gap-2 text-base">
								<AlertTriangle className="h-4 w-4 text-warning" />
								Unmapped Notes
								<Badge variant="secondary" className="ml-1 text-[10px]">
									{count}
								</Badge>
							</CardTitle>
							<ChevronDown
								className={cn(
									"h-4 w-4 text-muted-foreground transition-transform duration-200",
									isOpen && "rotate-180",
								)}
							/>
						</div>
						<CardDescription>
							Low-confidence extractions requiring manual mapping.
						</CardDescription>
					</CardHeader>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<CardContent className="space-y-3 pt-0">
						{notes.map((note) => (
							<UnmappedNoteCard
								key={note.id}
								note={note}
								groupedOptions={groupedOptions}
								onMapToField={onMapToField}
								onDismiss={onDismiss}
								disabled={disabled}
							/>
						))}
					</CardContent>
				</CollapsibleContent>
			</Card>
		</Collapsible>
	);
}

interface UnmappedNoteCardProps {
	note: UnmappedNote;
	groupedOptions: { sectionTitle: string; fields: FieldOption[] }[];
	onMapToField: (
		noteId: string,
		fieldId: string,
		sectionId: string,
		fieldLabel: string,
		sectionTitle: string,
	) => void;
	onDismiss: (noteId: string) => void;
	disabled?: boolean;
}

function UnmappedNoteCard({
	note,
	groupedOptions,
	onMapToField,
	onDismiss,
	disabled,
}: UnmappedNoteCardProps) {
	const [popoverOpen, setPopoverOpen] = useState(false);

	const handleSelectField = (option: FieldOption) => {
		onMapToField(
			note.id,
			option.fieldId,
			option.sectionId,
			option.fieldLabel,
			option.sectionTitle,
		);
		setPopoverOpen(false);
	};

	return (
		<div className="rounded-2xl border border-dashed border-warning/30 bg-warning/5 p-3 space-y-2">
			{/* Excerpt */}
			<blockquote className="text-sm text-foreground line-clamp-2">
				"{note.extractedText}"
			</blockquote>

			{/* Source + confidence */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
					<FileText className="h-3 w-3" />
					<span className="truncate max-w-[150px]">{note.sourceFile}</span>
				</div>
				<ConfidenceBadge confidence={note.confidence} />
			</div>

			{/* Actions */}
			<div className="flex items-center gap-2">
				<Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							className="flex-1 h-7 rounded-xl text-xs"
							disabled={disabled}
						>
							<Pencil className="mr-1 h-3 w-3" />
							Map to field
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-[280px] p-0" align="start">
						<Command>
							<CommandInput placeholder="Search fields..." />
							<CommandList>
								<CommandEmpty>No fields found.</CommandEmpty>
								{groupedOptions.map((group) => (
									<CommandGroup
										key={group.sectionTitle}
										heading={group.sectionTitle}
									>
										{group.fields.map((option) => (
											<CommandItem
												key={`${option.sectionId}-${option.fieldId}`}
												onSelect={() => handleSelectField(option)}
												className="cursor-pointer"
											>
												{option.fieldLabel}
											</CommandItem>
										))}
									</CommandGroup>
								))}
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>

				<Button
					variant="ghost"
					size="sm"
					className="h-7 w-7 p-0 rounded-xl hover:text-destructive"
					onClick={() => onDismiss(note.id)}
					disabled={disabled}
					aria-label="Dismiss note"
				>
					<X className="h-3 w-3" />
				</Button>
			</div>
		</div>
	);
}
