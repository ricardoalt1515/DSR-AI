"use client";

import { useCallback, useEffect, useState } from "react";

const RECENT_PROJECTS_KEY = "command-palette-recent-projects";
const MAX_RECENT_PROJECTS = 5;

type RecentProject = {
	id: string;
	name: string;
	visitedAt: number;
};

export function useCommandPalette() {
	const [open, setOpen] = useState(false);

	// Keyboard shortcut listener
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Cmd+K or Ctrl+K to open
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				setOpen((prev) => !prev);
			}

			// Escape to close
			if (e.key === "Escape" && open) {
				setOpen(false);
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [open]);

	const openPalette = useCallback(() => setOpen(true), []);
	const closePalette = useCallback(() => setOpen(false), []);

	return {
		open,
		setOpen,
		openPalette,
		closePalette,
	};
}

export function useRecentProjects() {
	const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);

	// Load from localStorage on mount
	useEffect(() => {
		const stored = localStorage.getItem(RECENT_PROJECTS_KEY);
		if (stored) {
			try {
				setRecentProjects(JSON.parse(stored));
			} catch {
				// Invalid JSON, reset
				localStorage.removeItem(RECENT_PROJECTS_KEY);
			}
		}
	}, []);

	const addRecentProject = useCallback((project: { id: string; name: string }) => {
		setRecentProjects((prev) => {
			// Remove if already exists
			const filtered = prev.filter((p) => p.id !== project.id);
			// Add to front
			const updated = [
				{ id: project.id, name: project.name, visitedAt: Date.now() },
				...filtered,
			].slice(0, MAX_RECENT_PROJECTS);

			localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(updated));
			return updated;
		});
	}, []);

	const clearRecentProjects = useCallback(() => {
		setRecentProjects([]);
		localStorage.removeItem(RECENT_PROJECTS_KEY);
	}, []);

	return {
		recentProjects,
		addRecentProject,
		clearRecentProjects,
	};
}
