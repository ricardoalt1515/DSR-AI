"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "dashboard-recent-searches";
const MAX_SEARCHES = 5;

export function useRecentSearches() {
	const [recentSearches, setRecentSearches] = useState<string[]>([]);

	// Load from localStorage on mount
	useEffect(() => {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			try {
				setRecentSearches(JSON.parse(stored));
			} catch {
				localStorage.removeItem(STORAGE_KEY);
			}
		}
	}, []);

	const addSearch = useCallback((query: string) => {
		const trimmed = query.trim();
		if (!trimmed || trimmed.length < 2) return;

		setRecentSearches((prev) => {
			// Remove duplicates and add to front
			const filtered = prev.filter(
				(s) => s.toLowerCase() !== trimmed.toLowerCase(),
			);
			const updated = [trimmed, ...filtered].slice(0, MAX_SEARCHES);

			localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
			return updated;
		});
	}, []);

	const removeSearch = useCallback((query: string) => {
		setRecentSearches((prev) => {
			const filtered = prev.filter((s) => s !== query);
			localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
			return filtered;
		});
	}, []);

	const clearSearches = useCallback(() => {
		setRecentSearches([]);
		localStorage.removeItem(STORAGE_KEY);
	}, []);

	return {
		recentSearches,
		addSearch,
		removeSearch,
		clearSearches,
	};
}
