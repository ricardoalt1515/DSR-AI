"use client";

import { Loader2, NotebookPen, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DEBOUNCE } from "@/lib/constants";
import { useIntakePanelStore } from "@/lib/stores/intake-store";
import { cn } from "@/lib/utils";

interface IntakeNotesSectionProps {
	projectId: string;
	disabled?: boolean;
	onSave?: (notes: string) => Promise<void>;
	onAnalyze?: (notes: string) => Promise<void>;
}

export function IntakeNotesSection({
	projectId: _projectId,
	disabled = false,
	onSave,
	onAnalyze,
}: IntakeNotesSectionProps) {
	const intakeNotes = useIntakePanelStore((state) => state.intakeNotes);
	const notesSaveStatus = useIntakePanelStore((state) => state.notesSaveStatus);
	const notesLastSavedISO = useIntakePanelStore(
		(state) => state.notesLastSavedISO,
	);
	const setIntakeNotes = useIntakePanelStore((state) => state.setIntakeNotes);
	const setNotesSaveStatus = useIntakePanelStore(
		(state) => state.setNotesSaveStatus,
	);
	const setNotesLastSavedISO = useIntakePanelStore(
		(state) => state.setNotesLastSavedISO,
	);

	const [localValue, setLocalValue] = useState(intakeNotes);
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const notesLastSavedDate = notesLastSavedISO
		? new Date(notesLastSavedISO)
		: null;

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
				setNotesLastSavedISO(new Date().toISOString());
			}
		} catch {
			setNotesSaveStatus("error");
		}
	},
	[disabled, onSave, setIntakeNotes, setNotesSaveStatus, setNotesLastSavedISO],
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
		if (!notesLastSavedDate) return null;

		const seconds = Math.floor(
			(Date.now() - notesLastSavedDate.getTime()) / 1000,
		);

		if (seconds < 5) return "Saved just now";
		if (seconds < 60) return `Saved ${seconds}s ago`;

		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `Saved ${minutes}m ago`;

		return `Saved at ${notesLastSavedDate.toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
		})}`;
	};

	const canAnalyze =
		Boolean(onAnalyze) &&
		!disabled &&
		!isAnalyzing &&
		localValue.trim().length >= 20 &&
		notesLastSavedISO !== null;

	const handleAnalyze = useCallback(async () => {
		if (!onAnalyze) return;
		setIsAnalyzing(true);
		try {
			await onAnalyze(localValue);
		} catch (error) {
			if (error instanceof Error && error.name === "AbortError") return;
		} finally {
			setIsAnalyzing(false);
		}
	}, [localValue, onAnalyze]);

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
			<div>
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
			</div>
			<div
				className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"
				aria-live="polite"
			>
				{onAnalyze && (
					<Button
						variant="secondary"
						size="sm"
						onClick={handleAnalyze}
						disabled={!canAnalyze}
						title={
							notesLastSavedISO === null ? "Save notes first" : undefined
						}
					>
						{isAnalyzing ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin" />
								Analyzing...
							</>
						) : (
							<>
								<Sparkles className="h-4 w-4" />
								Analyze Notes
							</>
						)}
					</Button>
				)}
				<div className="flex items-center gap-1.5">
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
