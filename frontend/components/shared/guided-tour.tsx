"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TourStep = {
	id: string;
	target: string; // CSS selector for the target element
	title: string;
	content: string;
	placement?: "top" | "bottom" | "left" | "right";
};

type GuidedTourProps = {
	steps: TourStep[];
	tourId: string; // Unique ID to track completion in localStorage
	onComplete?: () => void;
	onSkip?: () => void;
};

const TOUR_STORAGE_PREFIX = "guided-tour-completed-";

export function GuidedTour({
	steps,
	tourId,
	onComplete,
	onSkip,
}: GuidedTourProps) {
	const [currentStep, setCurrentStep] = useState(0);
	const [isVisible, setIsVisible] = useState(false);
	const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
	const [mounted, setMounted] = useState(false);

	// Check if tour was already completed
	useEffect(() => {
		setMounted(true);
		const completed = localStorage.getItem(`${TOUR_STORAGE_PREFIX}${tourId}`);
		if (!completed) {
			// Small delay to let the page render
			const timer = setTimeout(() => setIsVisible(true), 500);
			return () => clearTimeout(timer);
		}
		return undefined;
	}, [tourId]);

	// Scroll target into view when step changes (not on scroll/resize to avoid jitter)
	useEffect(() => {
		const step = steps[currentStep];
		if (!isVisible || !step) return;

		const target = document.querySelector(step.target);
		if (target) {
			target.scrollIntoView({ behavior: "smooth", block: "center" });
		}
	}, [isVisible, currentStep, steps]);

	// Update target position on scroll/resize (without scrollIntoView to prevent jitter)
	useEffect(() => {
		const step = steps[currentStep];
		if (!isVisible || !step) return;

		const updatePosition = () => {
			const target = document.querySelector(step.target);
			if (target) {
				setTargetRect(target.getBoundingClientRect());
			}
		};

		updatePosition();
		window.addEventListener("resize", updatePosition);
		window.addEventListener("scroll", updatePosition);

		return () => {
			window.removeEventListener("resize", updatePosition);
			window.removeEventListener("scroll", updatePosition);
		};
	}, [isVisible, currentStep, steps]);

	const handleNext = useCallback(() => {
		if (currentStep < steps.length - 1) {
			setCurrentStep((prev) => prev + 1);
		} else {
			// Tour complete
			localStorage.setItem(`${TOUR_STORAGE_PREFIX}${tourId}`, "true");
			setIsVisible(false);
			onComplete?.();
		}
	}, [currentStep, steps.length, tourId, onComplete]);

	const handlePrevious = useCallback(() => {
		if (currentStep > 0) {
			setCurrentStep((prev) => prev - 1);
		}
	}, [currentStep]);

	const handleSkip = useCallback(() => {
		localStorage.setItem(`${TOUR_STORAGE_PREFIX}${tourId}`, "true");
		setIsVisible(false);
		onSkip?.();
	}, [tourId, onSkip]);

	if (!mounted || !isVisible || !steps[currentStep]) return null;

	const step = steps[currentStep];
	const placement = step.placement || "bottom";

	// Calculate tooltip position
	const getTooltipStyle = (): React.CSSProperties => {
		if (!targetRect) return { opacity: 0 };

		const padding = 16;
		const tooltipWidth = 320;
		const tooltipHeight = 180;

		let top = 0;
		let left = 0;

		switch (placement) {
			case "top":
				top = targetRect.top - tooltipHeight - padding;
				left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
				break;
			case "bottom":
				top = targetRect.bottom + padding;
				left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
				break;
			case "left":
				top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
				left = targetRect.left - tooltipWidth - padding;
				break;
			case "right":
				top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
				left = targetRect.right + padding;
				break;
		}

		// Keep tooltip in viewport
		left = Math.max(
			padding,
			Math.min(left, window.innerWidth - tooltipWidth - padding),
		);
		top = Math.max(
			padding,
			Math.min(top, window.innerHeight - tooltipHeight - padding),
		);

		return { top, left, width: tooltipWidth };
	};

	// Calculate spotlight clip path
	const getSpotlightStyle = (): React.CSSProperties => {
		if (!targetRect) return {};

		const padding = 8;
		const x = targetRect.left - padding;
		const y = targetRect.top - padding;
		const width = targetRect.width + padding * 2;
		const height = targetRect.height + padding * 2;
		const radius = 8;

		return {
			clipPath: `polygon(
				0% 0%, 0% 100%,
				${x}px 100%, ${x}px ${y + radius}px,
				${x + radius}px ${y}px, ${x + width - radius}px ${y}px,
				${x + width}px ${y + radius}px, ${x + width}px ${y + height - radius}px,
				${x + width - radius}px ${y + height}px, ${x + radius}px ${y + height}px,
				${x}px ${y + height - radius}px, ${x}px 100%,
				100% 100%, 100% 0%
			)`,
		};
	};

	return createPortal(
		<div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
			{/* Overlay with spotlight cutout */}
			<button
				type="button"
				className="absolute inset-0 bg-black/70 transition-all duration-300 cursor-default"
				style={getSpotlightStyle()}
				onClick={handleSkip}
				aria-label="Click to skip tour"
			/>

			{/* Highlight ring around target */}
			{targetRect && (
				<div
					className="absolute border-2 border-primary rounded-lg pointer-events-none animate-pulse"
					style={{
						top: targetRect.top - 4,
						left: targetRect.left - 4,
						width: targetRect.width + 8,
						height: targetRect.height + 8,
					}}
				/>
			)}

			{/* Tooltip */}
			<div
				className={cn(
					"absolute bg-card border border-border rounded-lg shadow-2xl p-4",
					"animate-in fade-in slide-in-from-bottom-2 duration-300",
				)}
				style={getTooltipStyle()}
			>
				{/* Close button */}
				<button
					type="button"
					onClick={handleSkip}
					className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
					aria-label="Skip tour"
				>
					<X className="h-4 w-4" />
				</button>

				{/* Step indicator */}
				<div className="flex items-center gap-1 mb-3">
					{steps.map((step, index) => (
						<div
							key={step.id}
							className={cn(
								"h-1.5 rounded-full transition-all",
								index === currentStep
									? "w-6 bg-primary"
									: index < currentStep
										? "w-1.5 bg-primary/50"
										: "w-1.5 bg-muted",
							)}
						/>
					))}
					<span className="ml-2 text-xs text-muted-foreground">
						{currentStep + 1} of {steps.length}
					</span>
				</div>

				{/* Content */}
				<h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
				<p className="text-sm text-muted-foreground mb-4">{step.content}</p>

				{/* Navigation */}
				<div className="flex items-center justify-between">
					<Button
						variant="ghost"
						size="sm"
						onClick={handlePrevious}
						disabled={currentStep === 0}
						className="gap-1"
					>
						<ChevronLeft className="h-4 w-4" />
						Back
					</Button>
					<div className="flex gap-2">
						<Button variant="ghost" size="sm" onClick={handleSkip}>
							Skip
						</Button>
						<Button size="sm" onClick={handleNext} className="gap-1">
							{currentStep === steps.length - 1 ? "Finish" : "Next"}
							{currentStep < steps.length - 1 && (
								<ChevronRight className="h-4 w-4" />
							)}
						</Button>
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
}

// Hook to reset a tour (for testing or re-showing)
export function useResetTour(tourId: string) {
	return useCallback(() => {
		localStorage.removeItem(`${TOUR_STORAGE_PREFIX}${tourId}`);
	}, [tourId]);
}

// Hook to check if tour was completed
export function useTourCompleted(tourId: string) {
	const [completed, setCompleted] = useState(true); // Default to true to prevent flash

	useEffect(() => {
		const value = localStorage.getItem(`${TOUR_STORAGE_PREFIX}${tourId}`);
		setCompleted(value === "true");
	}, [tourId]);

	return completed;
}
