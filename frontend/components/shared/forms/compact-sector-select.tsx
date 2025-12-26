"use client";

/**
 * CompactSectorSelect - Inline sector/subsector selection
 *
 * Two-row layout:
 * 1. Sector: Simple Select with 5 options
 * 2. Subsector: Searchable Combobox that updates based on sector, with custom option
 */

import { Check, ChevronsUpDown, Building2, Factory, Home, Store, Target } from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
    Command,
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { Sector, Subsector } from "@/lib/sectors-config";
import { sectorsConfig, getSubsectors } from "@/lib/sectors-config";
import { cn } from "@/lib/utils";

// Icon mapping for sectors
const SECTOR_ICONS = {
    municipal: Building2,
    commercial: Store,
    industrial: Factory,
    residential: Home,
    other: Target,
} as const;

interface CompactSectorSelectProps {
    sector: Sector | "";
    subsector: Subsector | string;
    onSectorChange: (sector: Sector) => void;
    onSubsectorChange: (subsector: Subsector | string) => void;
    disabled?: boolean;
    className?: string;
}

export function CompactSectorSelect({
    sector,
    subsector,
    onSectorChange,
    onSubsectorChange,
    disabled = false,
    className,
}: CompactSectorSelectProps) {
    const [subsectorOpen, setSubsectorOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");

    // Get available subsectors for selected sector
    const availableSubsectors = useMemo(() => {
        if (!sector) return [];
        return getSubsectors(sector as Sector);
    }, [sector]);

    // Find selected subsector label
    const selectedSubsectorLabel = useMemo(() => {
        if (!subsector) return "";
        const found = availableSubsectors.find((s) => s.id === subsector);
        if (found) return found.label;
        // Custom subsector - return as-is with proper formatting
        return subsector.replace(/_/g, " ");
    }, [subsector, availableSubsectors]);

    // Handle sector change - reset subsector
    const handleSectorChange = (newSector: string) => {
        onSectorChange(newSector as Sector);
        // Auto-select first subsector or clear
        const newSubsectors = getSubsectors(newSector as Sector);
        if (newSubsectors.length > 0 && newSubsectors[0]) {
            onSubsectorChange(newSubsectors[0].id);
        } else {
            onSubsectorChange("");
        }
    };

    // Handle subsector selection (from list or custom)
    const handleSubsectorSelect = (value: string) => {
        onSubsectorChange(value as Subsector);
        setSearchValue("");
        setSubsectorOpen(false);
    };

    // Handle creating custom subsector from search input
    const handleCreateCustom = () => {
        if (!searchValue.trim()) return;
        // Convert to slug format for storage
        const slug = searchValue.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
        onSubsectorChange(slug || searchValue);
        setSearchValue("");
        setSubsectorOpen(false);
    };

    // Check if search matches any existing option
    const hasExactMatch = availableSubsectors.some(
        (s) => s.label.toLowerCase() === searchValue.toLowerCase()
    );

    return (
        <div className={cn("space-y-4", className)}>
            {/* Sector Select */}
            <div className="grid gap-2">
                <Label htmlFor="sector">
                    Sector <span className="text-destructive">*</span>
                </Label>
                <Select
                    {...(sector ? { value: sector } : {})}
                    onValueChange={handleSectorChange}
                    disabled={disabled}
                >
                    <SelectTrigger id="sector" className="w-full">
                        <SelectValue placeholder="Select sector..." />
                    </SelectTrigger>
                    <SelectContent>
                        {sectorsConfig.map((sectorConfig) => {
                            const Icon = SECTOR_ICONS[sectorConfig.id as keyof typeof SECTOR_ICONS] || Target;
                            return (
                                <SelectItem key={sectorConfig.id} value={sectorConfig.id}>
                                    <div className="flex items-center gap-2">
                                        <Icon className="h-4 w-4 text-muted-foreground" />
                                        <span>{sectorConfig.label}</span>
                                    </div>
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
            </div>

            {/* Subsector Combobox - Creatable */}
            <div className="grid gap-2">
                <Label htmlFor="subsector">
                    Subsector{" "}
                    <span className="text-xs text-muted-foreground">(type to search or create)</span>
                </Label>

                <Popover open={subsectorOpen} onOpenChange={setSubsectorOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={subsectorOpen}
                            disabled={disabled || !sector}
                            className={cn(
                                "w-full justify-between font-normal",
                                !subsector && "text-muted-foreground"
                            )}
                        >
                            {sector ? (
                                selectedSubsectorLabel || "Select or type subsector..."
                            ) : (
                                "Select sector first..."
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command shouldFilter={false}>
                            <CommandInput
                                placeholder="Search or type new..."
                                value={searchValue}
                                onValueChange={setSearchValue}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && searchValue && !hasExactMatch) {
                                        e.preventDefault();
                                        handleCreateCustom();
                                    }
                                }}
                            />
                            <CommandList>
                                <CommandGroup>
                                    {/* Filter and show matching options */}
                                    {availableSubsectors
                                        .filter((s) =>
                                            !searchValue ||
                                            s.label.toLowerCase().includes(searchValue.toLowerCase())
                                        )
                                        .map((subsectorOption) => (
                                            <CommandItem
                                                key={subsectorOption.id}
                                                value={subsectorOption.id}
                                                onSelect={() => handleSubsectorSelect(subsectorOption.id)}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        subsector === subsectorOption.id ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                {subsectorOption.label}
                                            </CommandItem>
                                        ))}

                                    {/* Show create option when typing something new */}
                                    {searchValue && !hasExactMatch && (
                                        <CommandItem
                                            value={`create-${searchValue}`}
                                            onSelect={handleCreateCustom}
                                            className="border-t"
                                        >
                                            <span className="text-primary">
                                                Create "{searchValue}"
                                            </span>
                                        </CommandItem>
                                    )}
                                </CommandGroup>

                                {/* Empty state when no matches */}
                                {searchValue &&
                                    !hasExactMatch &&
                                    availableSubsectors.filter((s) =>
                                        s.label.toLowerCase().includes(searchValue.toLowerCase())
                                    ).length === 0 && (
                                        <div className="py-2 px-3 text-sm text-muted-foreground">
                                            Press Enter to create
                                        </div>
                                    )}
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
}

/**
 * Helper to format subsector for display
 */
export function formatSubsector(subsector: string): string {
    // Check if it's a known subsector
    for (const sector of sectorsConfig) {
        const found = sector.subsectors.find((s) => s.id === subsector);
        if (found) return found.label;
    }
    // Custom subsector - format the slug
    return subsector
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}
