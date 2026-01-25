"use client";

import { useCallback, useEffect } from "react";
import {
	useIntakePanelStore,
	useSelectedCount,
} from "@/lib/stores/intake-store";

interface UseIntakeKeyboardShortcutsOptions {
	containerRef: React.RefObject<HTMLElement | null>;
	visibleIds: string[];
	onApplySelected: () => Promise<void>;
	onRejectSelected: () => Promise<void>;
	disabled?: boolean;
}

/**
 * Keyboard shortcuts for intake panel batch operations.
 *
 * Shortcuts:
 * - 'a' = apply selected suggestions
 * - 'r' = reject selected suggestions
 * - Escape = clear selection
 * - Ctrl/Cmd + a = select all visible
 */
export function useIntakeKeyboardShortcuts({
	containerRef,
	visibleIds,
	onApplySelected,
	onRejectSelected,
	disabled = false,
}: UseIntakeKeyboardShortcutsOptions) {
	const selectedCount = useSelectedCount();
	const selectAllVisible = useIntakePanelStore((s) => s.selectAllVisible);
	const clearSelection = useIntakePanelStore((s) => s.clearSelection);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (disabled) return;

			// Don't trigger when typing in inputs
			const target = e.target as HTMLElement;
			if (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable
			) {
				return;
			}

			// Check if focus is within the container
			if (containerRef.current && !containerRef.current.contains(target)) {
				return;
			}

			switch (e.key) {
				case "a":
					// Ctrl/Cmd + a = select all
					if (e.ctrlKey || e.metaKey) {
						e.preventDefault();
						selectAllVisible(visibleIds);
					} else if (selectedCount > 0) {
						// Just 'a' = apply selected
						e.preventDefault();
						onApplySelected();
					}
					break;

				case "r":
					// 'r' = reject selected
					if (selectedCount > 0 && !e.ctrlKey && !e.metaKey) {
						e.preventDefault();
						onRejectSelected();
					}
					break;

				case "Escape":
					// Escape = clear selection
					if (selectedCount > 0) {
						e.preventDefault();
						clearSelection();
					}
					break;
			}
		},
		[
			containerRef,
			clearSelection,
			disabled,
			onApplySelected,
			onRejectSelected,
			selectAllVisible,
			selectedCount,
			visibleIds,
		],
	);

	useEffect(() => {
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [handleKeyDown]);
}
