"use client";

import { ArrowDownAZ, Calendar, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { FileSortBy } from "./types";

interface FilesSearchBarProps {
	searchTerm: string;
	onSearchChange: (term: string) => void;
	sortBy: FileSortBy;
	onSortChange: (sort: FileSortBy) => void;
}

const SORT_OPTIONS: {
	value: FileSortBy;
	label: string;
	icon: typeof Calendar;
}[] = [
	{ value: "date", label: "Date", icon: Calendar },
	{ value: "name", label: "Name", icon: ArrowDownAZ },
];

export function FilesSearchBar({
	searchTerm,
	onSearchChange,
	sortBy,
	onSortChange,
}: FilesSearchBarProps) {
	// Local state for debounced input
	const [localTerm, setLocalTerm] = useState(searchTerm);

	// Sync external changes
	useEffect(() => {
		setLocalTerm(searchTerm);
	}, [searchTerm]);

	// Debounce search input
	useEffect(() => {
		const timer = setTimeout(() => {
			if (localTerm !== searchTerm) {
				onSearchChange(localTerm);
			}
		}, 300);

		return () => clearTimeout(timer);
	}, [localTerm, searchTerm, onSearchChange]);

	const handleClear = () => {
		setLocalTerm("");
		onSearchChange("");
	};

	return (
		<div className="flex gap-3">
			{/* Search input */}
			<div className="relative flex-1">
				<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder="Search files..."
					value={localTerm}
					onChange={(e) => setLocalTerm(e.target.value)}
					className="pl-9 pr-9"
					autoComplete="off"
				/>
				{localTerm && (
					<Button
						variant="ghost"
						size="icon"
						onClick={handleClear}
						className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
						aria-label="Clear search"
					>
						<X className="h-4 w-4" />
					</Button>
				)}
			</div>

			{/* Sort dropdown */}
			<Select
				value={sortBy}
				onValueChange={(v) => onSortChange(v as FileSortBy)}
			>
				<SelectTrigger className="w-[120px] shrink-0">
					<SelectValue placeholder="Sort" />
				</SelectTrigger>
				<SelectContent>
					{SORT_OPTIONS.map((opt) => (
						<SelectItem key={opt.value} value={opt.value}>
							<span className="flex items-center gap-2">
								<opt.icon className="h-4 w-4" />
								{opt.label}
							</span>
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
