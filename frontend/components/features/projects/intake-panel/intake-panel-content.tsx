"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { SectionErrorBoundary } from "@/components/features/proposals/overview/section-error-boundary";
import { intakeAPI } from "@/lib/api/intake";
import { projectsAPI } from "@/lib/api/projects";
import {
	useConflictingSuggestions,
	useIntakePanelStore,
} from "@/lib/stores/intake-store";
import { useTechnicalDataActions } from "@/lib/stores/technical-data-store";
import type { AISuggestion } from "@/lib/types/intake";
import type { TableSection } from "@/lib/types/technical-data";
import { cn } from "@/lib/utils";
import { AISuggestionsSection } from "./ai-suggestions-section";
import { ConfirmReplaceDialog } from "./confirm-replace-dialog";
import { ConflictCard } from "./conflict-card";
import {
	applyBurst,
	focusField,
	waitForElement,
	waitForStableRect,
} from "./focus-field";
import { formatSuggestionValue } from "./format-suggestion-value";

// Animation constants (must match suggestion-card.tsx)
const FLY_DURATION_MS = 850;
const ARC_HEIGHT = 0.45;

// ============================================================================
// CURVED ARC + PHYSICS-BASED FLY ANIMATION
// Duplicated from suggestion-card.tsx for modal confirm flow
// ============================================================================

/** Calculate point on quadratic bezier curve at parameter t (0-1) */
function getQuadraticBezierPoint(
	t: number,
	p0: { x: number; y: number },
	p1: { x: number; y: number },
	p2: { x: number; y: number },
): { x: number; y: number } {
	const x = (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * p1.x + t ** 2 * p2.x;
	const y = (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * p1.y + t ** 2 * p2.y;
	return { x, y };
}

/** Calculate control point for arc - lifts the curve above the straight line */
function getArcControlPoint(
	start: { x: number; y: number },
	end: { x: number; y: number },
	arcHeight = ARC_HEIGHT,
): { x: number; y: number } {
	const midX = (start.x + end.x) / 2;
	const midY = (start.y + end.y) / 2;
	const distance = Math.hypot(end.x - start.x, end.y - start.y);
	return {
		x: midX,
		y: midY - distance * arcHeight,
	};
}

/** Generate keyframes along curved bezier path with spring-like physics */
function generateFlightKeyframes(
	start: DOMRect,
	end: DOMRect,
	steps = 16,
): Keyframe[] {
	const p0 = {
		x: start.left + start.width / 2,
		y: start.top + start.height / 2,
	};
	const p2 = { x: end.left + end.width / 2 - 30, y: end.top };
	const p1 = getArcControlPoint(p0, p2);

	const keyframes: Keyframe[] = [];

	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		const pos = getQuadraticBezierPoint(t, p0, p1, p2);

		const peakScale = 1.15;
		const endScale = 0.85;
		let scale: number;
		if (t < 0.4) {
			scale = 1.1 + (peakScale - 1.1) * (t / 0.4);
		} else {
			scale = peakScale - (peakScale - endScale) * ((t - 0.4) / 0.6);
		}

		const rotation = t < 0.4 ? -6 * (t / 0.4) : -6 + 12 * ((t - 0.4) / 0.6);
		const opacity = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25;
		const glowIntensity = 0.35 + 0.25 * Math.sin(t * Math.PI);

		keyframes.push({
			left: `${pos.x - start.width / 2}px`,
			top: `${pos.y - start.height / 2}px`,
			transform: `scale(${scale}) rotate(${rotation}deg)`,
			opacity,
			boxShadow: `0 4px 20px hsl(var(--primary) / ${glowIntensity})`,
			offset: t,
		});
	}

	return keyframes;
}

/** Create expanding burst effect at launch point */
function createLaunchBurst(rect: DOMRect): void {
	const burst = document.createElement("div");
	burst.style.cssText = `
		position: fixed;
		left: ${rect.left + rect.width / 2}px;
		top: ${rect.top + rect.height / 2}px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: radial-gradient(circle, hsl(var(--primary) / 0.6) 0%, transparent 70%);
		transform: translate(-50%, -50%) scale(0);
		pointer-events: none;
		z-index: 49;
	`;
	document.body.appendChild(burst);

	const animation = burst.animate(
		[
			{ transform: "translate(-50%, -50%) scale(0)", opacity: 1 },
			{ transform: "translate(-50%, -50%) scale(4)", opacity: 0 },
		],
		{
			duration: 400,
			easing: "cubic-bezier(0.22, 1, 0.36, 1)",
		},
	);
	animation.onfinish = () => burst.remove();
}

/** Create sparkle trail that follows the chip with staggered delays */
function createSparkleTrail(
	keyframes: Keyframe[],
	duration: number,
	startRect: DOMRect,
): void {
	const sparkleConfigs = [
		{ delay: 80, size: 8 },
		{ delay: 160, size: 6 },
		{ delay: 240, size: 4 },
	];

	for (const config of sparkleConfigs) {
		const sparkle = document.createElement("div");
		sparkle.style.cssText = `
			position: fixed;
			width: ${config.size}px;
			height: ${config.size}px;
			border-radius: 50%;
			background: hsl(var(--primary));
			box-shadow: 0 0 ${config.size * 2}px hsl(var(--primary) / 0.6);
			pointer-events: none;
			z-index: 49;
			left: ${startRect.left + startRect.width / 2}px;
			top: ${startRect.top + startRect.height / 2}px;
		`;
		document.body.appendChild(sparkle);

		const posKeyframes: Keyframe[] = keyframes.map((kf) => ({
			left: kf.left as string,
			top: kf.top as string,
			opacity: kf.opacity as number,
			offset: kf.offset as number,
		}));

		const anim = sparkle.animate(posKeyframes, {
			duration,
			delay: config.delay,
			easing: "cubic-bezier(0.22, 1, 0.36, 1)",
			fill: "forwards",
		});

		anim.onfinish = () => sparkle.remove();
	}
}

import { IntakeNotesSection } from "./intake-notes-section";
import { QuickUploadSection } from "./quick-upload-section";
import { UnmappedNotesSection } from "./unmapped-notes-section";

interface IntakePanelContentProps {
	projectId: string;
	sections: TableSection[];
	disabled?: boolean | undefined;
	onOpenSection?: ((sectionId: string) => void) | undefined;
	onUploadComplete?: (() => void) | undefined;
	onHydrate: () => Promise<boolean>;
	className?: string | undefined;
}

function isConflictError(error: unknown): boolean {
	if (typeof error !== "object" || error === null) return false;
	if (!("code" in error)) return false;
	const code = error.code;
	return typeof code === "string" && code === "HTTP_409";
}

function hasExistingValue(value: unknown): boolean {
	if (value === null || value === undefined) return false;
	if (Array.isArray(value)) return value.length > 0;
	if (typeof value === "string") return value.trim().length > 0;
	return true;
}

function formatFieldValue(value: unknown): string {
	if (value === null || value === undefined) return "—";
	if (Array.isArray(value)) return value.join(", ") || "—";
	if (typeof value === "string") return value.trim() || "—";
	if (typeof value === "number") return `${value}`;
	return String(value);
}

export const IntakePanelContent = memo(function IntakePanelContent({
	projectId,
	sections,
	disabled = false,
	onOpenSection,
	onUploadComplete,
	onHydrate,
	className,
}: IntakePanelContentProps) {
	// Combine state selectors with useShallow to prevent unnecessary re-renders
	const {
		unmappedNotes,
		unmappedNotesCount,
		isLoadingSuggestions,
		isProcessingDocuments,
		processingDocumentsCount,
	} = useIntakePanelStore(
		useShallow((state) => ({
			unmappedNotes: state.unmappedNotes,
			unmappedNotesCount: state.unmappedNotesCount,
			isLoadingSuggestions: state.isLoadingSuggestions,
			isProcessingDocuments: state.isProcessingDocuments,
			processingDocumentsCount: state.processingDocumentsCount,
		})),
	);

	// Actions stay separate (stable references, no re-render trigger)
	const applySuggestion = useIntakePanelStore((state) => state.applySuggestion);
	const applySuggestions = useIntakePanelStore(
		(state) => state.applySuggestions,
	);
	const rejectSuggestion = useIntakePanelStore(
		(state) => state.rejectSuggestion,
	);
	const revertSuggestion = useIntakePanelStore(
		(state) => state.revertSuggestion,
	);
	const revertSuggestions = useIntakePanelStore(
		(state) => state.revertSuggestions,
	);
	const resolveConflict = useIntakePanelStore((state) => state.resolveConflict);
	const addSuggestion = useIntakePanelStore((state) => state.addSuggestion);
	const removeUnmappedNote = useIntakePanelStore(
		(state) => state.removeUnmappedNote,
	);
	const resetConflict = useIntakePanelStore((state) => state.resetConflict);
	const rejectConflictSiblings = useIntakePanelStore(
		(state) => state.rejectConflictSiblings,
	);
	const dismissUnmappedNote = useIntakePanelStore(
		(state) => state.dismissUnmappedNote,
	);
	const dismissUnmappedNotes = useIntakePanelStore(
		(state) => state.dismissUnmappedNotes,
	);
	const setNotesLastSavedISO = useIntakePanelStore(
		(state) => state.setNotesLastSavedISO,
	);
	const hydrateIntake = onHydrate;

	const { loadTechnicalData, updateFieldOptimistic } =
		useTechnicalDataActions();
	const conflictingSuggestions = useConflictingSuggestions();
	const animatingIds = useRef(new Set<string>());
	const [confirmSingle, setConfirmSingle] = useState<{
		suggestion: AISuggestion;
		fieldLabel: string;
		sectionTitle: string;
		currentValue: string;
		newValue: string;
		/** Button rect for fly animation after modal confirm */
		sourceRect?: DOMRect;
	} | null>(null);
	const analyzeAbortRef = useRef<AbortController | null>(null);
	const saveSeqRef = useRef(0);
	const activeProjectIdRef = useRef(projectId);

	useEffect(() => {
		return () => analyzeAbortRef.current?.abort();
	}, []);

	useEffect(() => {
		activeProjectIdRef.current = projectId;
		saveSeqRef.current = 0;
	}, [projectId]);

	// Group conflicts by fieldId
	const conflictGroups = useMemo(() => {
		const groups = new Map<string, AISuggestion[]>();
		for (const suggestion of conflictingSuggestions) {
			const key = `${suggestion.sectionId}:${suggestion.fieldId}`;
			const existing = groups.get(key);
			if (existing) {
				existing.push(suggestion);
			} else {
				groups.set(key, [suggestion]);
			}
		}
		return Array.from(groups.entries());
	}, [conflictingSuggestions]);

	const fieldStateByKey = useMemo(() => {
		const map = new Map<
			string,
			{ value: unknown; label: string; sectionTitle: string }
		>();
		for (const section of sections) {
			for (const field of section.fields) {
				map.set(`${section.id}:${field.id}`, {
					value: field.value,
					label: field.label,
					sectionTitle: section.title,
				});
			}
		}
		return map;
	}, [sections]);

	const getFieldState = useCallback(
		(sectionId: string, fieldId: string) =>
			fieldStateByKey.get(`${sectionId}:${fieldId}`),
		[fieldStateByKey],
	);

	// Apply suggestion to technical data
	const performApplySuggestion = useCallback(
		async (suggestion: AISuggestion) => {
			// Debounce rapid clicks - prevent duplicate animations
			if (animatingIds.current.has(suggestion.id)) return;
			animatingIds.current.add(suggestion.id);

			// Optimistic update in intake store
			applySuggestion(suggestion.id);
			rejectConflictSiblings(
				suggestion.sectionId,
				suggestion.fieldId,
				suggestion.id,
			);

			// Optimistic update in technical data store (value visible immediately)
			updateFieldOptimistic(
				projectId,
				suggestion.sectionId,
				suggestion.fieldId,
				suggestion.value,
				suggestion.unit,
			);

			try {
				await intakeAPI.updateSuggestionStatus(
					projectId,
					suggestion.id,
					"applied",
				);
				// Silent refresh - no skeleton because data already exists
				await loadTechnicalData(projectId, { force: true, silent: true });
				toast.success("Suggestion applied");
			} catch (_error) {
				if (isConflictError(_error)) {
					await hydrateIntake();
					await loadTechnicalData(projectId, { force: true, silent: true });
					return;
				}
				revertSuggestion(suggestion.id);
				resetConflict(suggestion.sectionId, suggestion.fieldId);
				await loadTechnicalData(projectId, { force: true, silent: true });
				throw _error;
			} finally {
				animatingIds.current.delete(suggestion.id);
			}
		},
		[
			applySuggestion,
			hydrateIntake,
			loadTechnicalData,
			projectId,
			rejectConflictSiblings,
			resetConflict,
			revertSuggestion,
			updateFieldOptimistic,
		],
	);

	const handleApplySuggestion = useCallback(
		async (
			suggestion: AISuggestion,
			sourceRect?: DOMRect,
		): Promise<boolean> => {
			const fieldState = getFieldState(
				suggestion.sectionId,
				suggestion.fieldId,
			);
			if (fieldState && hasExistingValue(fieldState.value)) {
				// Show confirmation modal - store sourceRect for animation after confirm
				setConfirmSingle({
					suggestion,
					fieldLabel: fieldState.label,
					sectionTitle: fieldState.sectionTitle,
					currentValue: formatFieldValue(fieldState.value),
					newValue: formatSuggestionValue(suggestion.value, suggestion.unit),
					// Spread conditionally to satisfy exactOptionalPropertyTypes
					...(sourceRect ? { sourceRect } : {}),
				});
				return false; // Modal shown, not applied yet
			}
			await performApplySuggestion(suggestion);
			return true; // Applied successfully
		},
		[getFieldState, performApplySuggestion],
	);

	// Reject suggestion
	const handleRejectSuggestion = useCallback(
		async (suggestion: AISuggestion) => {
			rejectSuggestion(suggestion.id);
			try {
				await intakeAPI.updateSuggestionStatus(
					projectId,
					suggestion.id,
					"rejected",
				);
			} catch (_error) {
				if (isConflictError(_error)) {
					await hydrateIntake();
					return;
				}
				revertSuggestion(suggestion.id);
				throw _error;
			}
		},
		[hydrateIntake, projectId, rejectSuggestion, revertSuggestion],
	);

	// Resolve conflict - defer state read to callback execution (rerender-defer-reads)
	const handleResolveConflict = useCallback(
		async (_fieldKey: string, selectedId: string) => {
			// Access store directly to avoid subscription-based re-renders
			const { suggestions } = useIntakePanelStore.getState();
			const selected = suggestions.find(
				(s) => s.id === selectedId && s.status === "pending",
			);
			if (!selected) return;

			resolveConflict(selected.sectionId, selected.fieldId, selectedId);

			try {
				await intakeAPI.updateSuggestionStatus(
					projectId,
					selected.id,
					"applied",
				);
				await loadTechnicalData(projectId, { force: true, silent: true });
			} catch (_error) {
				if (isConflictError(_error)) {
					await hydrateIntake();
					await loadTechnicalData(projectId, { force: true, silent: true });
					return;
				}
				revertSuggestion(selected.id);
				resetConflict(selected.sectionId, selected.fieldId);
				await loadTechnicalData(projectId, { force: true, silent: true });
				throw _error;
			}
		},
		[
			hydrateIntake,
			loadTechnicalData,
			projectId,
			resetConflict,
			resolveConflict,
			revertSuggestion,
		],
	);

	// Map unmapped note to field
	const handleMapNoteToField = useCallback(
		async (
			noteId: string,
			fieldId: string,
			sectionId: string,
			fieldLabel: string,
			sectionTitle: string,
		) => {
			try {
				const response = await intakeAPI.mapUnmappedNote(projectId, noteId, {
					fieldId,
					sectionId,
					fieldLabel,
					sectionTitle,
				});
				removeUnmappedNote(noteId);
				addSuggestion(response.suggestion);
			} catch (_error) {
				toast.error("Failed to map note. Please try again.");
				await hydrateIntake();
				return;
			}
		},
		[addSuggestion, hydrateIntake, projectId, removeUnmappedNote],
	);

	const handleDismissNote = useCallback(
		async (noteId: string) => {
			try {
				await intakeAPI.dismissUnmappedNote(projectId, noteId);
				dismissUnmappedNote(noteId);
			} catch (_error) {
				toast.error("Failed to dismiss note. Please try again.");
				await hydrateIntake();
				return;
			}
		},
		[dismissUnmappedNote, hydrateIntake, projectId],
	);

	const handleDismissBulk = useCallback(
		async (
			scope: "all" | "low_confidence" | "file",
			sourceFileId?: string | null,
		) => {
			try {
				let payload: {
					scope: "all" | "low_confidence" | "file";
					max_confidence?: number;
					source_file_id?: string | null;
				};
				if (scope === "file") {
					payload = { scope, source_file_id: sourceFileId ?? null };
				} else if (scope === "low_confidence") {
					payload = { scope, max_confidence: 70 };
				} else {
					payload = { scope };
				}
				const response = await intakeAPI.dismissUnmappedNotesBulk(
					projectId,
					payload,
				);
				if (scope === "file") {
					const ids = unmappedNotes
						.filter((note) => note.sourceFileId === (sourceFileId ?? null))
						.map((note) => note.id);
					dismissUnmappedNotes(ids);
				} else if (scope === "low_confidence") {
					const ids = unmappedNotes
						.filter((note) => note.confidence < 70)
						.map((note) => note.id);
					dismissUnmappedNotes(ids);
				} else {
					dismissUnmappedNotes(unmappedNotes.map((note) => note.id));
				}
				toast.success(`Dismissed ${response.dismissedCount} notes`);
				await hydrateIntake();
			} catch (_error) {
				toast.error("Failed to dismiss notes. Please try again.");
				await hydrateIntake();
			}
		},
		[dismissUnmappedNotes, hydrateIntake, projectId, unmappedNotes],
	);

	const handleSaveNotes = useCallback(
		async (notes: string) => {
			const requestProjectId = projectId;
			const seq = saveSeqRef.current + 1;
			saveSeqRef.current = seq;
			const response = await intakeAPI.saveNotes(projectId, notes);
			if (saveSeqRef.current !== seq) return;
			if (activeProjectIdRef.current !== requestProjectId) return;
			if (
				typeof response.updatedAt !== "string" ||
				response.updatedAt.length === 0
			) {
				throw new Error("Missing updatedAt from saveNotes");
			}
			setNotesLastSavedISO(response.updatedAt);
		},
		[projectId, setNotesLastSavedISO],
	);

	const handleAnalyzeNotes = useCallback(async () => {
		const { notesLastSavedISO: latestSavedISO } =
			useIntakePanelStore.getState();
		if (typeof latestSavedISO !== "string" || latestSavedISO.length === 0) {
			toast.error("Save notes before analysis");
			return;
		}

		analyzeAbortRef.current?.abort();
		analyzeAbortRef.current = new AbortController();
		const signal = analyzeAbortRef.current.signal;

		try {
			const result = await intakeAPI.analyzeNotes(
				projectId,
				latestSavedISO,
				signal,
			);

			if (signal.aborted) return;
			if (result.staleIgnored) {
				toast.warning("Notes changed during analysis. Try again.");
				return;
			}

			const hydratedOk = await hydrateIntake();
			if (signal.aborted) return;

			if (hydratedOk) {
				toast.success(
					`Analysis complete: ${result.suggestionsCount} suggestions`,
				);
			} else {
				toast.error("Failed to refresh suggestions");
			}
		} catch (_error) {
			if (signal.aborted) return;
			toast.error("Failed to analyze notes");
		}
	}, [hydrateIntake, projectId]);

	// Handle file upload
	const handleUpload = useCallback(
		async (file: File, category: string) => {
			const isPdf =
				file.type === "application/pdf" || file.name.endsWith(".pdf");
			const isImage = file.type.startsWith("image/");
			if (category === "photos" && !isImage) {
				throw new Error("Photo tag requires an image file.");
			}
			const processWithAi = isPdf || isImage;
			const response = await projectsAPI.uploadFile(projectId, file, {
				category,
				process_with_ai: processWithAi,
			});
			onUploadComplete?.();
			return response;
		},
		[onUploadComplete, projectId],
	);

	const performBatchApply = useCallback(
		async (ids: string[]) => {
			const { suggestions } = useIntakePanelStore.getState();
			const toApply = suggestions.filter(
				(s) => ids.includes(s.id) && s.status === "pending",
			);

			applySuggestions(ids);
			for (const s of toApply) {
				rejectConflictSiblings(s.sectionId, s.fieldId, s.id);
				updateFieldOptimistic(
					projectId,
					s.sectionId,
					s.fieldId,
					s.value,
					s.unit,
				);
			}

			try {
				const response = await intakeAPI.batchUpdateSuggestions(
					projectId,
					ids,
					"applied",
				);
				if (response.errorCount > 0) {
					toast.warning(
						`Applied ${response.appliedCount}, ${response.errorCount} failed`,
					);
					await hydrateIntake();
				}
				await loadTechnicalData(projectId, { force: true, silent: true });
				return toApply[0];
			} catch (_error) {
				if (isConflictError(_error)) {
					await hydrateIntake();
					await loadTechnicalData(projectId, { force: true, silent: true });
					return undefined;
				}
				revertSuggestions(ids);
				await loadTechnicalData(projectId, { force: true, silent: true });
				throw _error;
			}
		},
		[
			applySuggestions,
			hydrateIntake,
			loadTechnicalData,
			projectId,
			rejectConflictSiblings,
			revertSuggestions,
			updateFieldOptimistic,
		],
	);

	const handleBatchApply = useCallback(
		async (ids: string[]) => {
			const { suggestions } = useIntakePanelStore.getState();
			const pendingSuggestions = suggestions.filter(
				(s) => ids.includes(s.id) && s.status === "pending",
			);
			const fieldKeys = pendingSuggestions.map(
				(suggestion) => `${suggestion.sectionId}:${suggestion.fieldId}`,
			);
			const uniqueKeys = new Set(fieldKeys);
			if (fieldKeys.length !== uniqueKeys.size) {
				toast.error(
					"Cannot apply multiple suggestions to the same field. Resolve conflicts first.",
				);
				return;
			}
			return performBatchApply(ids);
		},
		[performBatchApply],
	);

	return (
		<SectionErrorBoundary sectionName="Intake Panel">
			<div className={cn("flex h-full flex-col gap-4 min-w-0", className)}>
				{/* Sticky processing banner - prominently visible during document analysis */}
				<AnimatePresence>
					{isProcessingDocuments && (
						<motion.div
							initial={{ opacity: 0, y: -20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
							className="sticky top-0 z-20 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 backdrop-blur-sm p-4"
							role="status"
							aria-live="polite"
						>
							{/* Animated Sparkles icon with pulse rings */}
							<div className="relative flex-shrink-0">
								<motion.div
									animate={{ scale: [1, 1.1, 1] }}
									transition={{
										repeat: Number.POSITIVE_INFINITY,
										duration: 2,
										ease: "easeInOut",
									}}
								>
									<Sparkles className="h-5 w-5 text-primary" />
								</motion.div>
								{/* Pulse ring behind icon */}
								<motion.div
									className="absolute inset-0 rounded-full bg-primary/20"
									animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
									transition={{
										repeat: Number.POSITIVE_INFINITY,
										duration: 1.5,
										ease: "easeOut",
									}}
								/>
							</div>
							<div className="flex-1 flex flex-col gap-2">
								<p className="text-sm font-medium text-foreground">
									Analyzing {processingDocumentsCount}{" "}
									{processingDocumentsCount === 1 ? "document" : "documents"}...
								</p>
								{/* Shimmer progress bar */}
								<div className="h-1.5 w-full bg-primary/20 rounded-full overflow-hidden">
									<div className="h-full w-full animate-shimmer rounded-full" />
								</div>
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				<SectionErrorBoundary sectionName="Intake Notes">
					<IntakeNotesSection
						projectId={projectId}
						disabled={disabled}
						onSave={handleSaveNotes}
						onAnalyze={handleAnalyzeNotes}
					/>
				</SectionErrorBoundary>

				<SectionErrorBoundary sectionName="Quick Upload">
					<QuickUploadSection
						projectId={projectId}
						disabled={disabled}
						onUpload={handleUpload}
					/>
				</SectionErrorBoundary>

				{/* Conflict cards */}
				{conflictGroups.map(([fieldId, suggestions]) => (
					<ConflictCard
						key={fieldId}
						fieldLabel={suggestions[0]?.fieldLabel ?? "Unknown field"}
						suggestions={suggestions}
						onResolve={handleResolveConflict}
						disabled={disabled}
					/>
				))}

				<SectionErrorBoundary sectionName="AI Suggestions">
					<AISuggestionsSection
						projectId={projectId}
						disabled={disabled}
						isLoading={isLoadingSuggestions}
						onApplySuggestion={handleApplySuggestion}
						onRejectSuggestion={handleRejectSuggestion}
						onBatchApply={handleBatchApply}
						onOpenSection={onOpenSection}
					/>
				</SectionErrorBoundary>

				<SectionErrorBoundary sectionName="Unmapped Notes">
					<UnmappedNotesSection
						notes={unmappedNotes}
						totalCount={unmappedNotesCount}
						sections={sections}
						onMapToField={handleMapNoteToField}
						onDismiss={handleDismissNote}
						onDismissAll={() => handleDismissBulk("all")}
						onDismissLowConfidence={() => handleDismissBulk("low_confidence")}
						onDismissByFile={(sourceFileId) =>
							handleDismissBulk("file", sourceFileId)
						}
						disabled={disabled}
					/>
				</SectionErrorBoundary>
			</div>
			{confirmSingle && (
				<ConfirmReplaceDialog
					open={Boolean(confirmSingle)}
					onOpenChange={(open) => {
						if (!open) setConfirmSingle(null);
					}}
					fieldLabel={confirmSingle.fieldLabel}
					sectionTitle={confirmSingle.sectionTitle}
					currentValue={confirmSingle.currentValue}
					newValue={confirmSingle.newValue}
					onConfirm={async () => {
						const pending = confirmSingle;
						setConfirmSingle(null);

						// Run fly animation if we have source rect
						const prefersReducedMotion =
							typeof window !== "undefined" &&
							window.matchMedia("(prefers-reduced-motion: reduce)").matches;

						if (pending.sourceRect && onOpenSection && !prefersReducedMotion) {
							// Run fly animation from stored button position
							void (async () => {
								const buttonRect = pending.sourceRect;
								if (!buttonRect) return;

								const formattedValue = formatSuggestionValue(
									pending.suggestion.value,
									pending.suggestion.unit,
								);

								// 1. Open section
								onOpenSection(pending.suggestion.sectionId);

								// 2. Wait for target
								const fieldId = `field-${pending.suggestion.sectionId}-${pending.suggestion.fieldId}`;
								const targetEl = await waitForElement(fieldId, 1500);
								const finalTargetEl =
									targetEl ??
									(await waitForElement(
										`section-${pending.suggestion.sectionId}`,
										500,
									));

								if (!finalTargetEl) {
									void focusField({
										sectionId: pending.suggestion.sectionId,
										fieldId: pending.suggestion.fieldId,
										onOpenSection,
										highlight: true,
										scroll: true,
									});
									return;
								}

								// 3. Wait for stable rect
								await waitForStableRect(finalTargetEl, {
									timeoutMs: 1000,
									stableFrames: 2,
									epsilonPx: 2,
								});

								// 4. Scroll
								finalTargetEl.scrollIntoView({
									behavior: "auto",
									block: "center",
								});
								await new Promise((r) => requestAnimationFrame(r));

								// 5. Get target rect
								const targetRect = finalTargetEl.getBoundingClientRect();

								// 6. Launch burst effect
								createLaunchBurst(buttonRect);

								// 7. Create flying chip
								const chip = document.createElement("div");
								chip.className =
									"fixed z-50 flex items-center gap-1.5 rounded-lg pointer-events-none";
								chip.style.background =
									"linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.8) 100%)";
								chip.style.color = "hsl(var(--primary-foreground))";
								chip.style.padding = "10px 16px";
								chip.style.fontSize = "14px";
								chip.style.fontWeight = "500";
								chip.style.boxShadow = "0 4px 20px hsl(var(--primary) / 0.4)";
								chip.style.border =
									"1px solid hsl(var(--primary-foreground) / 0.2)";

								const icon = document.createElementNS(
									"http://www.w3.org/2000/svg",
									"svg",
								);
								icon.setAttribute("width", "14");
								icon.setAttribute("height", "14");
								icon.setAttribute("viewBox", "0 0 24 24");
								icon.setAttribute("fill", "none");
								icon.setAttribute("stroke", "currentColor");
								icon.setAttribute("stroke-width", "2");
								icon.setAttribute("stroke-linecap", "round");
								icon.setAttribute("stroke-linejoin", "round");
								icon.innerHTML =
									'<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>';
								icon.style.flexShrink = "0";

								const text = document.createElement("span");
								text.textContent =
									formattedValue.length > 18
										? `${formattedValue.slice(0, 18)}...`
										: formattedValue;

								chip.appendChild(icon);
								chip.appendChild(text);

								chip.style.left = `${buttonRect.left}px`;
								chip.style.top = `${buttonRect.top}px`;
								chip.style.transform = "scale(1.1)";

								document.body.appendChild(chip);

								// 8. Generate curved path keyframes
								const keyframes = generateFlightKeyframes(
									buttonRect,
									targetRect,
								);

								// 9. Create sparkle trail
								createSparkleTrail(keyframes, FLY_DURATION_MS, buttonRect);

								// 10. Animate chip with Web Animations API
								const animation = chip.animate(keyframes, {
									duration: FLY_DURATION_MS,
									easing: "cubic-bezier(0.22, 1, 0.36, 1)",
									fill: "forwards",
								});

								animation.onfinish = () => {
									chip.remove();
									applyBurst(finalTargetEl);
									const focusable = finalTargetEl.querySelector<HTMLElement>(
										'input, textarea, select, button, [tabindex]:not([tabindex="-1"])',
									);
									focusable?.focus({ preventScroll: true });
								};
							})();
						} else if (onOpenSection) {
							// Reduced motion or no source rect: just focus with highlight
							void focusField({
								sectionId: pending.suggestion.sectionId,
								fieldId: pending.suggestion.fieldId,
								onOpenSection,
								highlight: true,
								scroll: true,
							});
						}

						try {
							await performApplySuggestion(pending.suggestion);
						} catch (error) {
							if (isConflictError(error)) {
								await hydrateIntake();
								return;
							}
							toast.error("Failed to apply suggestion");
						}
					}}
				/>
			)}
		</SectionErrorBoundary>
	);
});
