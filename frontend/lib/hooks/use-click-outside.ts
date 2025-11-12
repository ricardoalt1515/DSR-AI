import { type RefObject, useEffect } from "react";

/**
 * Hook to detect clicks outside of a specified element
 *
 * @param ref - React ref to the element to watch
 * @param handler - Callback function to execute when clicking outside
 * @param enabled - Whether the hook is active (default: true)
 *
 * @example
 * const ref = useRef<HTMLDivElement>(null)
 * useClickOutside(ref, () => console.log('Clicked outside!'), isEditing)
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
	ref: RefObject<T>,
	handler: (event: MouseEvent | TouchEvent) => void,
	enabled: boolean = true,
) {
	useEffect(() => {
		if (!enabled) return;

		const listener = (event: MouseEvent | TouchEvent) => {
			const el = ref?.current;
			const target = event.target as Node;

			// Do nothing if clicking ref's element or descendent elements
			if (!el || el.contains(target)) {
				return;
			}

			// ✅ FIX: Ignore clicks inside Radix UI Portals (Select, Combobox, Dialog, etc.)
			// Radix renders dropdowns/overlays outside the DOM tree in portals
			const targetElement = target as HTMLElement;
			if (targetElement.closest?.("[data-radix-popper-content-wrapper]")) {
				return;
			}

			handler(event);
		};

		// Use mousedown/touchstart instead of click to capture before other handlers
		document.addEventListener("mousedown", listener);
		document.addEventListener("touchstart", listener);

		return () => {
			document.removeEventListener("mousedown", listener);
			document.removeEventListener("touchstart", listener);
		};
	}, [ref, handler, enabled]);
}
