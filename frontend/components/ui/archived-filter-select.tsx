"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { ArchivedFilter } from "@/lib/api/companies";
import { cn } from "@/lib/utils";

interface ArchivedFilterSelectProps {
	value: ArchivedFilter;
	onChange: (value: ArchivedFilter) => void;
	className?: string;
}

const FILTER_OPTIONS: { value: ArchivedFilter; label: string }[] = [
	{ value: "active", label: "Active" },
	{ value: "archived", label: "Archived" },
	{ value: "all", label: "All" },
];

export function ArchivedFilterSelect({
	value,
	onChange,
	className,
}: ArchivedFilterSelectProps) {
	return (
		<Select value={value} onValueChange={onChange}>
			<SelectTrigger className={cn("w-[130px]", className)}>
				<SelectValue placeholder="Filter status" />
			</SelectTrigger>
			<SelectContent>
				{FILTER_OPTIONS.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
