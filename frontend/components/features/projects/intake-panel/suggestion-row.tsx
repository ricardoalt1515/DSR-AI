"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, FileText, RefreshCw, X } from "lucide-react";
import { useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFlyingValueStore } from "@/lib/stores/flying-value-store";
import {
	useIntakePanelStore,
	useIsSuggestionSelected,
} from "@/lib/stores/intake-store";
import type { AISuggestion } from "@/lib/types/intake";
import { cn } from "@/lib/utils";
import { focusField } from "./focus-field";
import { formatSuggestionValue } from "./format-suggestion-value";

// --- Sub-components ---

interface ConfidenceDotsProps {
	confidence: number;
}

const CONFIDENCE_THRESHOLDS = {
	HIGH: 85,
	MEDIUM: 70,
} as const;

const DOT_DIVISOR = 25;

function ConfidenceDots({
	confidence,
}: ConfidenceDotsProps): React.ReactElement {
	const level = Math.ceil(confidence / DOT_DIVISOR);
	const colorClass =
		confidence >= CONFIDENCE_THRESHOLDS.HIGH
			? "text-success"
			: confidence >= CONFIDENCE_THRESHOLDS.MEDIUM
				? "text-warning"
				: "text-muted-foreground";
	const bgClass = colorClass.replace("text-", "bg-");

	return (
		<div className="flex items-center gap-1">
			<div className="flex gap-0.5" aria-hidden>
				{[0, 1, 2, 3].map((dot) => (
					<div
						key={`dot-${dot}`}
						className={cn(
							"h-1.5 w-1.5 rounded-full",
							dot < level ? bgClass : "bg-muted",
						)}
					/>
				))}
			</div>
			<span className={cn("text-xs font-medium tabular-nums", colorClass)}>
				{Math.round(confidence)}%
			</span>
		</div>
	);
}

interface ValueBadgeProps {
	value: string;
	layoutId: string;
	isFlying: boolean;
}

function ValueBadge({
	value,
	layoutId,
	isFlying,
}: ValueBadgeProps): React.ReactElement | null {
	return (
		<AnimatePresence mode="wait">
			{!isFlying && (
				<Tooltip>
					<TooltipTrigger asChild>
						<motion.div
							layoutId={layoutId}
							className="flex w-full min-w-0 rounded-md border bg-primary/10 px-2.5 py-1"
							initial={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.15 }}
						>
							<span className="min-w-0 flex-1 truncate text-sm font-medium">
								{value}
							</span>
						</motion.div>
					</TooltipTrigger>
					<TooltipContent side="top">{value}</TooltipContent>
				</Tooltip>
			)}
		</AnimatePresence>
	);
}

// --- Main component ---

interface SuggestionRowProps {
	suggestion: AISuggestion;
	visibleIds: string[];
	index: number;
	onApply: (id: string) => Promise<void>;
	onReject: (id: string) => Promise<void>;
	onOpenSection?: ((sectionId: string) => void) | undefined;
	disabled?: boolean | undefined;
	willReplace?: boolean | undefined;
}

const MAX_STAGGER_INDEX = 10;
const STAGGER_DELAY = 0.03;

export function SuggestionRow({
	suggestion,
	visibleIds,
	index,
	onApply,
	onReject,
	onOpenSection,
	disabled = false,
	willReplace = false,
}: SuggestionRowProps): React.ReactElement {
	const shouldReduceMotion = useReducedMotion();
	const isSelected = useIsSuggestionSelected(suggestion.id);
	const toggleSelection = useIntakePanelStore(
		(s) => s.toggleSuggestionSelection,
	);
	const toggleRangeSelection = useIntakePanelStore(
		(s) => s.toggleRangeSelection,
	);
	const { activeId, startFlight } = useFlyingValueStore();
	const isFlying = activeId === suggestion.id;

	const formattedValue = formatSuggestionValue(
		suggestion.value,
		suggestion.unit,
	);

	const handleCheckboxChange = useCallback(
		(e: React.MouseEvent) => {
			if (e.shiftKey) {
				toggleRangeSelection(suggestion.id, visibleIds);
			} else {
				toggleSelection(suggestion.id);
			}
		},
		[suggestion.id, visibleIds, toggleSelection, toggleRangeSelection],
	);

	const handleCheckboxKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === " " || e.key === "Enter") {
				e.preventDefault();
				if (e.shiftKey) {
					toggleRangeSelection(suggestion.id, visibleIds);
				} else {
					toggleSelection(suggestion.id);
				}
			}
		},
		[suggestion.id, visibleIds, toggleSelection, toggleRangeSelection],
	);

	const handleApply = useCallback(async () => {
		await focusField({
			sectionId: suggestion.sectionId,
			fieldId: suggestion.fieldId,
			onOpenSection,
		});
		if (!shouldReduceMotion) {
			startFlight(
				suggestion.id,
				suggestion.sectionId,
				suggestion.fieldId,
				formattedValue,
			);
		}
		void onApply(suggestion.id);
	}, [
		suggestion.sectionId,
		suggestion.fieldId,
		suggestion.id,
		onOpenSection,
		shouldReduceMotion,
		startFlight,
		formattedValue,
		onApply,
	]);

	const handleReject = useCallback(() => {
		void onReject(suggestion.id);
	}, [onReject, suggestion.id]);

	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, x: -20 }}
			transition={{
				duration: 0.2,
				delay: Math.min(index, MAX_STAGGER_INDEX) * STAGGER_DELAY,
			}}
			className={cn(
				"group rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50",
				isSelected && "bg-primary/5 border-primary/20",
				disabled && "pointer-events-none opacity-50",
			)}
		>
			{/* Row 1: Checkbox + Field Name + Actions */}
			<div className="flex items-start gap-3">
				<Checkbox
					checked={isSelected}
					onClick={handleCheckboxChange}
					onKeyDown={handleCheckboxKeyDown}
					aria-label={`Select ${suggestion.fieldLabel}`}
					className="mt-0.5 shrink-0"
				/>

				<div className="min-w-0 flex-1">
					<span className="block truncate font-medium text-sm">
						{suggestion.fieldLabel}
					</span>
				</div>

				{/* Actions: visible on mobile, hover-reveal on desktop */}
				<div className="flex shrink-0 gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
					<Button
						variant="ghost"
						size="sm"
						className={cn(
							"h-7 w-7 p-0",
							willReplace
								? "text-warning hover:bg-warning/10 hover:text-warning"
								: "text-success hover:bg-success/10 hover:text-success",
						)}
						onClick={handleApply}
						disabled={disabled}
						aria-label={
							willReplace
								? `Replace ${suggestion.fieldLabel}`
								: `Apply ${suggestion.fieldLabel}`
						}
					>
						{willReplace ? (
							<RefreshCw className="h-3.5 w-3.5" />
						) : (
							<Check className="h-3.5 w-3.5" />
						)}
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className="h-7 w-7 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
						onClick={handleReject}
						disabled={disabled}
						aria-label={`Reject ${suggestion.fieldLabel}`}
					>
						<X className="h-3.5 w-3.5" />
					</Button>
				</div>
			</div>

			{/* Row 2: Section + Confidence */}
			<div className="ml-7 mt-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
				<span className="min-w-0 flex-1 truncate">
					{suggestion.sectionTitle}
				</span>
				<span aria-hidden>·</span>
				<div className="shrink-0">
					<ConfidenceDots confidence={suggestion.confidence} />
				</div>
			</div>

			{/* Row 3: Value Badge */}
			<div className="ml-7 mt-2">
				<ValueBadge
					value={formattedValue}
					layoutId={`flying-value-${suggestion.id}`}
					isFlying={isFlying}
				/>
			</div>

			{/* Row 4: Source (notes or file) */}
			{(suggestion.source === "notes" || suggestion.evidence) && (
				<div className="ml-7 mt-1.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
					{suggestion.source === "notes" && (
						<Badge variant="outline" className="text-xs">
							Notes
						</Badge>
					)}
					{suggestion.evidence && (
						<>
							<FileText className="h-3 w-3 shrink-0" aria-hidden />
							<span
								className="min-w-0 flex-1 truncate"
								title={suggestion.evidence.filename}
							>
								{suggestion.evidence.filename}
							</span>
							{suggestion.evidence.page && (
								<span className="shrink-0">
									p. {suggestion.evidence.page}
								</span>
							)}
						</>
					)}
				</div>
			)}
		</motion.div>
	);
}
