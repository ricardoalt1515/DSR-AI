type FocusFieldOptions = {
	sectionId: string;
	fieldId?: string | undefined;
	behavior?: ScrollBehavior | undefined;
	onOpenSection?: ((sectionId: string) => void) | undefined;
	/** Whether to apply highlight burst animation (default: true) */
	highlight?: boolean;
	/** Whether to scroll into view (default: true) */
	scroll?: boolean;
};

const WAIT_TIMEOUT = 1500;
const STABLE_RECT_FRAMES = 2;
const STABLE_RECT_EPSILON = 2; // pixels

/**
 * Wait for an element to appear in the DOM
 */
export async function waitForElement(
	id: string,
	timeout = WAIT_TIMEOUT,
): Promise<HTMLElement | null> {
	const start = Date.now();
	while (Date.now() - start < timeout) {
		const el = document.getElementById(id);
		if (el) return el;
		await new Promise((r) => requestAnimationFrame(r));
	}
	return null;
}

/**
 * Wait for an element's bounding rect to stabilize (not moving)
 */
export async function waitForStableRect(
	el: HTMLElement,
	opts?: {
		timeoutMs?: number;
		stableFrames?: number;
		epsilonPx?: number;
	},
): Promise<DOMRect | null> {
	const timeoutMs = opts?.timeoutMs ?? WAIT_TIMEOUT;
	const stableFrames = opts?.stableFrames ?? STABLE_RECT_FRAMES;
	const epsilonPx = opts?.epsilonPx ?? STABLE_RECT_EPSILON;

	const start = Date.now();
	let lastRect = el.getBoundingClientRect();
	let stableCount = 0;

	while (Date.now() - start < timeoutMs) {
		await new Promise((r) => requestAnimationFrame(r));

		const currentRect = el.getBoundingClientRect();
		const isStable =
			Math.abs(currentRect.x - lastRect.x) < epsilonPx &&
			Math.abs(currentRect.y - lastRect.y) < epsilonPx &&
			Math.abs(currentRect.width - lastRect.width) < epsilonPx &&
			Math.abs(currentRect.height - lastRect.height) < epsilonPx;

		if (isStable) {
			stableCount++;
			if (stableCount >= stableFrames) {
				return currentRect;
			}
		} else {
			stableCount = 0;
		}

		lastRect = currentRect;
	}

	// Timeout - return last known rect
	return lastRect;
}

/**
 * Apply multi-stage highlight burst animation to an element.
 * Stage 1: Initial burst with inset border glow (0-1000ms)
 * Stage 2: Sustained glow that fades out (700ms-2800ms, overlaps)
 */
export function applyBurst(target: HTMLElement): void {
	// Remove any existing animation classes first
	target.classList.remove("animate-apply-burst", "animate-sustained-glow");
	// Force reflow to reset animations
	void target.offsetWidth;
	// Add both animation classes - sustained-glow has animation-delay built in
	target.classList.add("animate-apply-burst", "animate-sustained-glow");
	// Clean up after all animations complete (burst: 1000ms + sustained: 700ms delay + 2000ms duration = 2700ms)
	setTimeout(() => {
		target.classList.remove("animate-apply-burst", "animate-sustained-glow");
	}, 2800);
}

export async function focusField({
	sectionId,
	fieldId,
	behavior = "smooth",
	onOpenSection,
	highlight = true,
	scroll = true,
}: FocusFieldOptions): Promise<boolean> {
	onOpenSection?.(sectionId);

	if (fieldId) {
		const fieldTarget = await waitForElement(`field-${sectionId}-${fieldId}`);
		if (fieldTarget) {
			if (scroll || highlight) {
				if (scroll) {
					fieldTarget.scrollIntoView({ behavior, block: "center" });
				}
				if (highlight) {
					applyBurst(fieldTarget);
				}
				const focusable = fieldTarget.querySelector<HTMLElement>(
					'input, textarea, select, button, [tabindex]:not([tabindex="-1"])',
				);
				focusable?.focus({ preventScroll: true });
			}
			return true;
		}
	}

	const sectionTarget = await waitForElement(`section-${sectionId}`);
	if (sectionTarget) {
		if (scroll || highlight) {
			if (scroll) {
				sectionTarget.scrollIntoView({ behavior, block: "center" });
			}
			if (highlight) {
				applyBurst(sectionTarget);
			}
		}
		return true;
	}

	return false;
}
