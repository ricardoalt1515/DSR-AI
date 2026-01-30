"use client";

import { ChevronDown, FileText, Loader2, StickyNote, X } from "lucide-react";
import { memo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AISuggestion } from "@/lib/types/intake";
import { cn } from "@/lib/utils";
import { ConfidenceIndicator } from "./confidence-indicator";
import {
	applyBurst,
	focusField,
	waitForElement,
	waitForStableRect,
} from "./focus-field";
import { formatSuggestionValue } from "./format-suggestion-value";

const LONG_VALUE_THRESHOLD = 80;
const ENABLE_FLY_ANIMATION = true;
const FLY_DURATION_MS = 500;

interface SuggestionCardProps {
	suggestion: AISuggestion;
	onApply: (id: string) => Promise<void>;
	onReject: (id: string) => Promise<void>;
	disabled?: boolean | undefined;
	onOpenSection?: ((sectionId: string) => void) | undefined;
}

export const SuggestionCard = memo(function SuggestionCard({
	suggestion,
	onApply,
	onReject,
	disabled = false,
	onOpenSection,
}: SuggestionCardProps) {
	const [isApplying, setIsApplying] = useState(false);
	const [isRejecting, setIsRejecting] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const applyButtonRef = useRef<HTMLButtonElement>(null);
	const runIdRef = useRef<number>(0);

	const handleApply = async () => {
		if (disabled || isApplying || isRejecting) return;

		// Capture button rect before async operation (component may unmount)
		const buttonRect = applyButtonRef.current?.getBoundingClientRect();

		setIsApplying(true);
		const currentRunId = ++runIdRef.current;

		// Check reduced motion preference
		const prefersReducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;

		// Start fly animation if enabled and not reduced motion
		const shouldFly =
			ENABLE_FLY_ANIMATION && buttonRect && !prefersReducedMotion;

		if (shouldFly) {
			// Start fly animation (non-blocking)
			void startReliableFlyAnimation(
				buttonRect,
				suggestion,
				onOpenSection,
				currentRunId,
				runIdRef,
			);
		} else if (onOpenSection) {
			// Reduced motion or no fly: just focus with scroll + highlight
			void focusField({
				sectionId: suggestion.sectionId,
				fieldId: suggestion.fieldId,
				onOpenSection,
				highlight: true,
				scroll: true,
			});
		}

		// Kick off apply immediately (don't block on animation)
		try {
			await onApply(suggestion.id);
		} finally {
			// Only clear applying state if this is still the current run
			if (runIdRef.current === currentRunId) {
				setIsApplying(false);
			}
		}
	};

	const startReliableFlyAnimation = async (
		sourceRect: DOMRect,
		suggestion: AISuggestion,
		onOpenSection: ((sectionId: string) => void) | undefined,
		runId: number,
		runIdRef: React.MutableRefObject<number>,
	) => {
		const formattedValue = formatSuggestionValue(
			suggestion.value,
			suggestion.unit,
		);

		// 1. Open section immediately (no scroll yet)
		onOpenSection?.(suggestion.sectionId);

		// 2. Wait for target element to exist
		const fieldId = `field-${suggestion.sectionId}-${suggestion.fieldId}`;
		const targetEl = await waitForElement(fieldId, 1500);

		// Check if this run was cancelled
		if (runIdRef.current !== runId) return;

		// Fallback to section if field not found
		const finalTargetEl =
			targetEl ??
			(await waitForElement(`section-${suggestion.sectionId}`, 500));

		if (runIdRef.current !== runId) return;

		if (!finalTargetEl) {
			// Fallback: just focus without fly
			void focusField({
				sectionId: suggestion.sectionId,
				fieldId: suggestion.fieldId,
				onOpenSection,
				highlight: true,
				scroll: true,
			});
			return;
		}

		// 3. Wait for rect to stabilize (element not moving)
		await waitForStableRect(finalTargetEl, {
			timeoutMs: 1000,
			stableFrames: 2,
			epsilonPx: 2,
		});

		if (runIdRef.current !== runId) return;

		// 4. Scroll into view instantly (no animation during fly)
		finalTargetEl.scrollIntoView({ behavior: "auto", block: "center" });

		// Wait one frame for scroll to apply
		await new Promise((r) => requestAnimationFrame(r));

		if (runIdRef.current !== runId) return;

		// 5. Get final rect after scroll
		const targetRect = finalTargetEl.getBoundingClientRect();

		// 6. Create flying chip
		const chip = document.createElement("div");
		chip.className =
			"fixed z-50 px-2 py-1 bg-primary text-primary-foreground text-xs rounded-md shadow-lg pointer-events-none";
		chip.textContent =
			formattedValue.length > 20
				? `${formattedValue.slice(0, 20)}...`
				: formattedValue;
		chip.style.left = `${sourceRect.left}px`;
		chip.style.top = `${sourceRect.top}px`;
		chip.style.transition = `all ${FLY_DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`;

		document.body.appendChild(chip);

		// Force reflow
		void chip.offsetWidth;

		// 7. Animate to target
		chip.style.left = `${targetRect.left + targetRect.width / 2 - 20}px`;
		chip.style.top = `${targetRect.top}px`;
		chip.style.opacity = "0";
		chip.style.transform = "scale(0.8)";

		// 8. After animation completes: burst + focus
		setTimeout(() => {
			if (runIdRef.current !== runId) {
				chip.remove();
				return;
			}

			chip.remove();

			// Apply burst
			applyBurst(finalTargetEl);

			// Focus input
			const focusable = finalTargetEl.querySelector<HTMLElement>(
				'input, textarea, select, button, [tabindex]:not([tabindex="-1"])',
			);
			focusable?.focus({ preventScroll: true });
		}, FLY_DURATION_MS);
	};

	const handleReject = async () => {
		if (disabled || isApplying || isRejecting) return;
		setIsRejecting(true);
		try {
			await onReject(suggestion.id);
		} finally {
			setIsRejecting(false);
		}
	};

	const formattedValue = formatSuggestionValue(
		suggestion.value,
		suggestion.unit,
	);
	const isLongValue = formattedValue.length > LONG_VALUE_THRESHOLD;
	const isProcessing = isApplying || isRejecting;
	const isFromNotes = !suggestion.sourceFileId;

	return (
		<div
			className={cn(
				"rounded-xl p-4 border-l-4 transition-colors",
				isFromNotes
					? "border-l-accent/40 bg-accent/5"
					: "border-l-info/40 bg-info/5",
				isProcessing && "opacity-50 pointer-events-none",
			)}
		>
			{/* Header: Source + Confidence */}
			<div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mb-3">
				<div className="flex items-center gap-1.5">
					{isFromNotes ? (
						<StickyNote className="h-3.5 w-3.5" />
					) : (
						<FileText className="h-3.5 w-3.5" />
					)}
					<span>
						{isFromNotes
							? "From notes"
							: (suggestion.evidence?.filename ?? "From file")}
					</span>
					{suggestion.evidence?.page && (
						<span className="text-muted-foreground/60">
							p. {suggestion.evidence.page}
						</span>
					)}
				</div>
				<ConfidenceIndicator confidence={suggestion.confidence} />
			</div>

			{/* Field name */}
			<p className="text-base font-semibold text-foreground mb-2">
				{suggestion.fieldLabel}
			</p>

			{/* Value box */}
			<div className="rounded-lg bg-background/50 border p-3 mb-2">
				<p
					className={cn(
						"text-sm",
						!isExpanded && isLongValue && "line-clamp-2",
					)}
				>
					"{formattedValue}"
				</p>
				{isLongValue && (
					<button
						type="button"
						onClick={() => setIsExpanded(!isExpanded)}
						className="mt-1 py-2 px-1 text-xs text-primary flex items-center gap-0.5 hover:underline"
						aria-label={isExpanded ? "Show less text" : "Show more text"}
					>
						{isExpanded ? "Show less" : "Show more"}
						<ChevronDown
							className={cn(
								"h-3 w-3 transition-transform",
								isExpanded && "rotate-180",
							)}
						/>
					</button>
				)}
			</div>

			{/* Target section */}
			<p className="text-xs text-muted-foreground mb-4">
				→ {suggestion.sectionTitle}
			</p>

			{/* Actions */}
			<div className="flex items-center justify-end gap-2">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-8 px-3 text-xs"
					onClick={handleReject}
					disabled={disabled || isProcessing}
					aria-label={`Skip ${suggestion.fieldLabel} suggestion`}
				>
					{isRejecting ? (
						<Loader2 className="h-3.5 w-3.5 animate-spin" />
					) : (
						<>
							<X className="h-3.5 w-3.5 mr-1" />
							Skip
						</>
					)}
				</Button>
				<Button
					ref={applyButtonRef}
					type="button"
					size="sm"
					className="h-8 px-4 text-xs"
					onClick={handleApply}
					disabled={disabled || isProcessing}
					aria-label={`Apply ${suggestion.fieldLabel} value`}
				>
					{isApplying ? (
						<Loader2 className="h-3.5 w-3.5 animate-spin" />
					) : (
						"Apply"
					)}
				</Button>
			</div>
		</div>
	);
});
