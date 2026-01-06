const RADIX_OPEN_SELECTOR = [
	"[role=\"dialog\"][data-state=\"open\"]",
	"[role=\"alertdialog\"][data-state=\"open\"]",
	"[role=\"menu\"][data-state=\"open\"]",
	"[role=\"listbox\"][data-state=\"open\"]",
	"[data-slot=\"dialog-overlay\"]",
	"[data-slot=\"sheet-overlay\"]",
	"[data-slot=\"alert-dialog-overlay\"]",
].join(",");

function hasOpenRadixLayer(): boolean {
	if (typeof document === "undefined") return false;
	return Boolean(document.querySelector(RADIX_OPEN_SELECTOR));
}

export function releaseStalePointerEvents(): void {
	if (typeof document === "undefined") return;
	if (document.body.style.pointerEvents !== "none") return;
	if (hasOpenRadixLayer()) return;

	document.body.style.pointerEvents = "";
}

export function schedulePointerEventsRelease(): void {
	if (typeof window === "undefined") return;
	window.requestAnimationFrame(() => {
		releaseStalePointerEvents();
	});
	window.setTimeout(() => {
		releaseStalePointerEvents();
	}, 50);
	window.setTimeout(() => {
		releaseStalePointerEvents();
	}, 150);
}
