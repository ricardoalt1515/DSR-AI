"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { PROJECT_STATUS_GROUPS } from "@/lib/project-status";

export type DashboardFilterKey = keyof typeof PROJECT_STATUS_GROUPS;

const DEFAULT_FILTER: DashboardFilterKey = "all";

const isValidFilter = (value: string | null): value is DashboardFilterKey => {
	if (!value) return false;
	return Object.hasOwn(PROJECT_STATUS_GROUPS, value);
};

export const useDashboardFilters = () => {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const filter = useMemo<DashboardFilterKey>(() => {
		const param = searchParams.get("status");
		return isValidFilter(param) ? param : DEFAULT_FILTER;
	}, [searchParams]);

	const searchTerm = useMemo(() => {
		return searchParams.get("q") ?? "";
	}, [searchParams]);

	const replaceParams = useCallback(
		(params: URLSearchParams) => {
			const query = params.toString();
			const url = query ? `${pathname}?${query}` : pathname;
			router.replace(url, { scroll: false });
		},
		[router, pathname],
	);

	const setFilter = useCallback(
		(nextFilter: DashboardFilterKey) => {
			if (nextFilter === filter) return;

			const params = new URLSearchParams(searchParams.toString());
			if (nextFilter === DEFAULT_FILTER) {
				params.delete("status");
			} else {
				params.set("status", nextFilter);
			}
			replaceParams(params);
		},
		[filter, replaceParams, searchParams],
	);

	const setSearchTerm = useCallback(
		(value: string) => {
			if (value === searchTerm) return;

			const params = new URLSearchParams(searchParams.toString());
			if (value.trim().length === 0) {
				params.delete("q");
			} else {
				params.set("q", value);
			}
			replaceParams(params);
		},
		[replaceParams, searchParams, searchTerm],
	);

	const clearFilters = useCallback(() => {
		const hasQuery = searchParams.size > 0;
		if (!hasQuery) return;

		const params = new URLSearchParams(searchParams.toString());
		params.delete("status");
		params.delete("q");
		replaceParams(params);
	}, [replaceParams, searchParams]);

	const hasActiveFilters =
		filter !== DEFAULT_FILTER || searchTerm.trim().length > 0;

	return {
		filter,
		searchTerm,
		hasActiveFilters,
		setFilter,
		setSearchTerm,
		clearFilters,
	};
};
