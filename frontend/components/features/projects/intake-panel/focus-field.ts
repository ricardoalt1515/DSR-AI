type FocusFieldOptions = {
	sectionId: string;
	fieldId?: string | undefined;
	behavior?: ScrollBehavior | undefined;
	onOpenSection?: ((sectionId: string) => void) | undefined;
};

const WAIT_TIMEOUT = 1500;

async function waitForElement(
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

function applyHighlight(target: HTMLElement, behavior: ScrollBehavior) {
	target.scrollIntoView({ behavior, block: "center" });

	const focusable = target.querySelector<HTMLElement>(
		'input, textarea, select, button, [tabindex]:not([tabindex="-1"])',
	);
	focusable?.focus({ preventScroll: true });

	target.classList.add("animate-apply-burst");
	setTimeout(() => target.classList.remove("animate-apply-burst"), 1000);
}

export async function focusField({
	sectionId,
	fieldId,
	behavior = "smooth",
	onOpenSection,
}: FocusFieldOptions): Promise<boolean> {
	onOpenSection?.(sectionId);

	if (fieldId) {
		const fieldTarget = await waitForElement(`field-${sectionId}-${fieldId}`);
		if (fieldTarget) {
			applyHighlight(fieldTarget, behavior);
			return true;
		}
	}

	const sectionTarget = await waitForElement(`section-${sectionId}`);
	if (sectionTarget) {
		applyHighlight(sectionTarget, behavior);
		return true;
	}

	return false;
}
