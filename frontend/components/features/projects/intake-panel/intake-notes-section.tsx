"use client";

import { Loader2, NotebookPen } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { DEBOUNCE } from "@/lib/constants";
import { useIntakePanelStore } from "@/lib/stores/intake-store";
import { cn } from "@/lib/utils";

interface IntakeNotesSectionProps {
	projectId: string;
	disabled?: boolean;
	onSave?: (notes: string) => Promise<void>;
}

export function IntakeNotesSection({
	projectId: _projectId,
	disabled = false,
	onSave,
}: IntakeNotesSectionProps) {
	const intakeNotes = useIntakePanelStore((state) => state.intakeNotes);
	const notesSaveStatus = useIntakePanelStore((state) => state.notesSaveStatus);
	const notesLastSaved = useIntakePanelStore((state) => state.notesLastSaved);
	const setIntakeNotes = useIntakePanelStore((state) => state.setIntakeNotes);
	const setNotesSaveStatus = useIntakePanelStore(
		(state) => state.setNotesSaveStatus,
	);
	const setNotesLastSaved = useIntakePanelStore(
		(state) => state.setNotesLastSaved,
	);

	const [localValue, setLocalValue] = useState(intakeNotes);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Sync local value when store changes (e.g., from external load)
	useEffect(() => {
		setLocalValue(intakeNotes);
	}, [intakeNotes]);

	const handleSave = useCallback(
		async (value: string) => {
			if (disabled) return;

			setNotesSaveStatus("saving");

			try {
				// Update store immediately
				setIntakeNotes(value);

				// Call external save if provided
				if (onSave) {
					await onSave(value);
				}

				setNotesSaveStatus("saved");
				if (!onSave) {
					setNotesLastSaved(new Date());
				}
			} catch {
				setNotesSaveStatus("error");
			}
		},
		[disabled, onSave, setIntakeNotes, setNotesSaveStatus, setNotesLastSaved],
	);

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			const value = e.target.value;
			setLocalValue(value);

			// Clear existing debounce
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}

			// Debounce save
			debounceRef.current = setTimeout(() => {
				void handleSave(value);
			}, DEBOUNCE.AUTO_SAVE);
		},
		[handleSave],
	);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}
		};
	}, []);

	const formatLastSaved = () => {
		if (!notesLastSaved) return null;

		const seconds = Math.floor((Date.now() - notesLastSaved.getTime()) / 1000);

		if (seconds < 5) return "Saved just now";
		if (seconds < 60) return `Saved ${seconds}s ago`;

		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `Saved ${minutes}m ago`;

		return `Saved at ${notesLastSaved.toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
		})}`;
	};

	return (
		<Card className="rounded-3xl border-none bg-card/80">
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-base">
					<NotebookPen className="h-4 w-4 text-primary" />
					Intake Notes
				</CardTitle>
				<CardDescription>
					Free-form observations from field surveys.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="relative">
					<Textarea
						value={localValue}
						onChange={handleChange}
						placeholder="Record survey findings, risks, client agreements or relevant assumptions..."
						className={cn(
							"min-h-[120px] resize-none rounded-2xl border-transparent bg-muted/30",
							"focus:border-primary/30 focus:ring-1 focus:ring-primary/20",
							disabled && "cursor-not-allowed opacity-60",
						)}
						disabled={disabled}
						aria-label="Intake notes"
					/>
					<div
						className="absolute bottom-2 right-2 flex items-center gap-1.5 text-xs text-muted-foreground"
						aria-live="polite"
					>
						{notesSaveStatus === "saving" && (
							<>
								<Loader2 className="h-3 w-3 animate-spin" />
								<span>Saving...</span>
							</>
						)}
						{notesSaveStatus === "saved" && (
							<span className="text-success">{formatLastSaved()}</span>
						)}
						{notesSaveStatus === "error" && (
							<span className="text-destructive">Failed to save</span>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
