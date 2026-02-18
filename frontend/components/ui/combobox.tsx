"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ComboboxProps {
	value: string;
	onChange: (value: string) => void;
	options: string[];
	placeholder?: string;
	searchPlaceholder?: string;
	emptyMessage?: string;
	helperText?: string;
	className?: string;
	disabled?: boolean;
}

/**
 * Combobox component with creatable functionality
 * Based on shadcn/ui combobox pattern
 * Allows selecting from options OR creating custom values
 */
export function Combobox({
	value,
	onChange,
	options = [],
	placeholder = "Search or type...",
	searchPlaceholder = "Type to filter or create...",
	emptyMessage = "No results found.",
	helperText,
	className,
	disabled = false,
}: ComboboxProps) {
	const [open, setOpen] = React.useState(false);
	const [searchQuery, setSearchQuery] = React.useState("");

	// ✅ Auto-open on focus for better UX (less clicks needed)
	const handleOpenChange = React.useCallback((isOpen: boolean) => {
		setOpen(isOpen);
		if (!isOpen) {
			setSearchQuery(""); // Clear search when closing
		}
	}, []);

	// Filter options based on search query
	const filteredOptions = React.useMemo(() => {
		if (!searchQuery) return options;

		return options.filter((option) =>
			option.toLowerCase().includes(searchQuery.toLowerCase()),
		);
	}, [options, searchQuery]);

	// Check if search query would create a new value
	const trimmedQuery = searchQuery.trim();

	const canCreateNew = React.useMemo(() => {
		if (!trimmedQuery) return false;

		// Don't allow creating if exact match exists (case insensitive)
		return !options.some(
			(option) => option.toLowerCase() === trimmedQuery.toLowerCase(),
		);
	}, [options, trimmedQuery]);

	// Handle selection from list
	const handleSelect = (selectedValue: string) => {
		onChange(selectedValue);
		handleOpenChange(false);
	};

	// Handle creating new value
	const handleCreateNew = () => {
		if (trimmedQuery) {
			onChange(trimmedQuery);
			handleOpenChange(false);
		}
	};

	// Display value
	const displayValue = value || placeholder;

	return (
		<div className="space-y-1">
			<Popover open={open} onOpenChange={handleOpenChange}>
				<PopoverTrigger asChild>
					<Button
						type="button"
						variant="outline"
						role="combobox"
						aria-expanded={open}
						disabled={disabled}
						className={cn(
							"w-full justify-between font-normal",
							!value && "text-muted-foreground",
							className,
						)}
					>
						<span className="truncate">{displayValue}</span>
						<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent
					className="p-0"
					align="start"
					style={{ width: "var(--radix-popover-trigger-width)" }}
				>
					<Command shouldFilter={false}>
						<CommandInput
							placeholder={searchPlaceholder}
							value={searchQuery}
							onValueChange={setSearchQuery}
							autoFocus
						/>
						<CommandList>
							{/* Show existing options */}
							{filteredOptions.length > 0 && (
								<CommandGroup>
									{filteredOptions.map((option) => (
										<CommandItem
											key={option}
											value={option}
											onSelect={() => handleSelect(option)}
										>
											<Check
												className={cn(
													"mr-2 h-4 w-4",
													value === option ? "opacity-100" : "opacity-0",
												)}
											/>
											{option}
										</CommandItem>
									))}
								</CommandGroup>
							)}

							{/* Show "no results" if no matches and can't create */}
							{filteredOptions.length === 0 && !canCreateNew && (
								<CommandEmpty>{emptyMessage}</CommandEmpty>
							)}

							{/* Show "create new" option if user typed something not in list */}
							{canCreateNew && (
								<CommandGroup>
									<CommandItem
										value={`create-${trimmedQuery}`}
										onSelect={handleCreateNew}
										className="text-primary"
									>
										<Check className="mr-2 h-4 w-4 opacity-0" />
										<span className="font-medium">Use custom answer:</span>{" "}
										<span className="ml-1 truncate">"{trimmedQuery}"</span>
									</CommandItem>
								</CommandGroup>
							)}
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
			{helperText && (
				<p className="text-xs text-muted-foreground">{helperText}</p>
			)}
		</div>
	);
}
