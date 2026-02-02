"use client";

import { motion } from "framer-motion";
import { ChevronDown, FileText, Loader2, StickyNote, X } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
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
const FLY_DURATION_MS = 850; // Longer duration to appreciate the enhanced animation
const ARC_HEIGHT = 0.45; // More pronounced curve for visibility

// ============================================================================
// CURVED ARC + PHYSICS-BASED FLY ANIMATION
// Uses Web Animations API for bezier curve path + spring-like physics
// ============================================================================

/** Calculate point on quadratic bezier curve at parameter t (0-1) */
function getQuadraticBezierPoint(
	t: number,
	p0: { x: number; y: number },
	p1: { x: number; y: number }, // control point
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
	// Lift perpendicular to line, always upward for "throw" effect
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

		// Spring-like scale: grows at peak (t≈0.4), shrinks on landing
		const peakScale = 1.15;
		const endScale = 0.85;
		let scale: number;
		if (t < 0.4) {
			// Grow from 1.1 to peak
			scale = 1.1 + (peakScale - 1.1) * (t / 0.4);
		} else {
			// Shrink from peak to end
			scale = peakScale - (peakScale - endScale) * ((t - 0.4) / 0.6);
		}

		// Rotation follows curve direction (subtle tilt during arc)
		// Rotate CCW going up, CW going down
		const rotation = t < 0.4 ? -6 * (t / 0.4) : -6 + 12 * ((t - 0.4) / 0.6);

		// Opacity: stay visible, fade only in final 25%
		const opacity = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25;

		// Glow intensity pulses - peaks at arc apex
		const glowBase = 0.35;
		const glowPulse = 0.25 * Math.sin(t * Math.PI);
		const glowIntensity = glowBase + glowPulse;

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

		// Simplified keyframes - only position and opacity
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

interface SuggestionCardProps {
	suggestion: AISuggestion;
	/** Returns true if applied immediately, false if modal was shown */
	onApply: (id: string, sourceRect?: DOMRect) => Promise<boolean>;
	onReject: (id: string) => Promise<void>;
	disabled?: boolean | undefined;
	onOpenSection?: ((sectionId: string) => void) | undefined;
	/** Animation delay for staggered list entry */
	animationDelay?: number | undefined;
}

export const SuggestionCard = memo(function SuggestionCard({
	suggestion,
	onApply,
	onReject,
	disabled = false,
	onOpenSection,
	animationDelay = 0,
}: SuggestionCardProps) {
	const [isApplying, setIsApplying] = useState(false);
	const [isRejecting, setIsRejecting] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const [isFocused, setIsFocused] = useState(false);
	const applyButtonRef = useRef<HTMLButtonElement>(null);
	const cardRef = useRef<HTMLDivElement>(null);
	const runIdRef = useRef<number>(0);

	// Run fly animation helper - extracted for reuse
	const runFlyAnimation = useCallback(
		async (buttonRect: DOMRect, runId: number) => {
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

			// 6. Launch burst effect at origin
			createLaunchBurst(buttonRect);

			// 7. Create flying chip with gradient and Sparkles icon
			const chip = document.createElement("div");
			chip.className =
				"fixed z-50 flex items-center gap-1.5 rounded-lg pointer-events-none";
			chip.style.background =
				"linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.8) 100%)";
			chip.style.color = "hsl(var(--primary-foreground))";
			// Larger size for better visibility
			chip.style.padding = "10px 16px";
			chip.style.fontSize = "14px";
			chip.style.fontWeight = "500";
			// Enhanced shadow glow for visibility
			chip.style.boxShadow = "0 4px 20px hsl(var(--primary) / 0.4)";
			chip.style.border = "1px solid hsl(var(--primary-foreground) / 0.2)";

			// Add Sparkles icon (slightly larger)
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

			// Position at start
			chip.style.left = `${buttonRect.left}px`;
			chip.style.top = `${buttonRect.top}px`;
			chip.style.transform = "scale(1.1)";

			document.body.appendChild(chip);

			// 8. Generate curved path keyframes
			const keyframes = generateFlightKeyframes(buttonRect, targetRect);

			// 9. Create sparkle trail (follows chip with staggered delay)
			createSparkleTrail(keyframes, FLY_DURATION_MS, buttonRect);

			// 10. Animate chip with Web Animations API
			const animation = chip.animate(keyframes, {
				duration: FLY_DURATION_MS,
				easing: "cubic-bezier(0.22, 1, 0.36, 1)", // ease-out-quint for smooth decel
				fill: "forwards",
			});

			// 8. Wait for animation to complete, then burst + focus
			animation.onfinish = () => {
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
			};
		},
		[onOpenSection, suggestion],
	);

	const handleApply = useCallback(async () => {
		if (disabled || isApplying || isRejecting) return;

		// Capture button rect before async operation (component may unmount)
		const buttonRect = applyButtonRef.current?.getBoundingClientRect();

		setIsApplying(true);
		const currentRunId = ++runIdRef.current;

		try {
			// Call onApply FIRST - returns true if applied, false if modal shown
			const wasApplied = await onApply(suggestion.id, buttonRect);

			// Only animate if actually applied (no modal was shown)
			if (wasApplied && buttonRect) {
				const prefersReducedMotion = window.matchMedia(
					"(prefers-reduced-motion: reduce)",
				).matches;

				if (ENABLE_FLY_ANIMATION && !prefersReducedMotion) {
					void runFlyAnimation(buttonRect, currentRunId);
				} else if (onOpenSection) {
					// Reduced motion: just focus with scroll + highlight
					void focusField({
						sectionId: suggestion.sectionId,
						fieldId: suggestion.fieldId,
						onOpenSection,
						highlight: true,
						scroll: true,
					});
				}
			}
		} finally {
			// Only clear applying state if this is still the current run
			if (runIdRef.current === currentRunId) {
				setIsApplying(false);
			}
		}
	}, [
		disabled,
		isApplying,
		isRejecting,
		onApply,
		onOpenSection,
		runFlyAnimation,
		suggestion,
	]);

	const handleReject = useCallback(async () => {
		if (disabled || isApplying || isRejecting) return;
		setIsRejecting(true);
		try {
			await onReject(suggestion.id);
		} finally {
			setIsRejecting(false);
		}
	}, [disabled, isApplying, isRejecting, onReject, suggestion.id]);

	// Keyboard support: Enter to apply, Backspace to skip
	useEffect(() => {
		const card = cardRef.current;
		if (!card || !isFocused) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (disabled || isApplying || isRejecting) return;

			if (e.key === "Enter") {
				e.preventDefault();
				void handleApply();
			} else if (e.key === "Backspace") {
				e.preventDefault();
				void handleReject();
			}
		};

		card.addEventListener("keydown", handleKeyDown);
		return () => card.removeEventListener("keydown", handleKeyDown);
	}, [isFocused, disabled, isApplying, isRejecting, handleApply, handleReject]);

	const formattedValue = formatSuggestionValue(
		suggestion.value,
		suggestion.unit,
	);
	const isLongValue = formattedValue.length > LONG_VALUE_THRESHOLD;
	const isProcessing = isApplying || isRejecting;
	const isFromNotes = !suggestion.sourceFileId;

	// Check for reduced motion preference
	const prefersReducedMotion =
		typeof window !== "undefined" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	return (
		<motion.div
			ref={cardRef}
			initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				duration: 0.3,
				delay: animationDelay,
				ease: [0.4, 0, 0.2, 1],
			}}
			tabIndex={0}
			onFocus={() => setIsFocused(true)}
			onBlur={() => setIsFocused(false)}
			className={cn(
				// Glassmorphism base
				"glass-liquid-subtle rounded-xl p-4 border transition-all duration-200",
				// Left accent border
				isFromNotes
					? "border-l-4 border-l-accent/50"
					: "border-l-4 border-l-info/50",
				// Hover: lift + glow
				"hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5",
				// Focus ring for keyboard nav
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
				// Disabled state
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
		</motion.div>
	);
});
