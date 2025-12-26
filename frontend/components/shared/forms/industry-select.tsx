"use client";

/**
 * IndustrySelect - Searchable industry dropdown component
 *
 * A combobox-style component for selecting industries using
 * a curated list based on waste management sector needs (NAICS-inspired).
 *
 * @see https://ui.shadcn.com/docs/components/combobox
 */

import { Check, ChevronsUpDown, Factory } from "lucide-react";
import { useState } from "react";
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

/**
 * Industry list - curated for waste management sector
 * Based on NAICS codes but simplified for practical use
 */
export const INDUSTRIES = [
    // Manufacturing (31-33)
    { value: "automotive_manufacturing", label: "Automotive Manufacturing" },
    { value: "aerospace_manufacturing", label: "Aerospace Manufacturing" },
    { value: "food_processing", label: "Food Processing" },
    { value: "beverage_manufacturing", label: "Beverage Manufacturing" },
    { value: "textile_manufacturing", label: "Textile Manufacturing" },
    { value: "chemical_manufacturing", label: "Chemical Manufacturing" },
    { value: "pharmaceutical_manufacturing", label: "Pharmaceutical Manufacturing" },
    { value: "plastics_rubber", label: "Plastics & Rubber Products" },
    { value: "metal_fabrication", label: "Metal Fabrication" },
    { value: "electronics_manufacturing", label: "Electronics Manufacturing" },
    { value: "paper_products", label: "Paper & Wood Products" },
    { value: "furniture_manufacturing", label: "Furniture Manufacturing" },

    // Construction (23)
    { value: "construction_general", label: "General Construction" },
    { value: "construction_commercial", label: "Commercial Construction" },
    { value: "construction_residential", label: "Residential Construction" },
    { value: "demolition", label: "Demolition Services" },

    // Retail & Wholesale (42-45)
    { value: "retail_general", label: "General Retail" },
    { value: "retail_grocery", label: "Grocery & Supermarkets" },
    { value: "wholesale_distribution", label: "Wholesale Distribution" },

    // Hospitality & Food Service (72)
    { value: "restaurants", label: "Restaurants & Food Service" },
    { value: "hotels_lodging", label: "Hotels & Lodging" },
    { value: "catering", label: "Catering Services" },
    { value: "entertainment_venues", label: "Entertainment Venues" },

    // Healthcare (62)
    { value: "hospitals", label: "Hospitals" },
    { value: "clinics_medical", label: "Medical Clinics" },
    { value: "laboratories", label: "Laboratories" },
    { value: "nursing_facilities", label: "Nursing & Care Facilities" },

    // Education (61)
    { value: "education_k12", label: "K-12 Schools" },
    { value: "education_higher", label: "Universities & Colleges" },

    // Government & Public (92)
    { value: "government_local", label: "Local Government" },
    { value: "government_state", label: "State Government" },
    { value: "government_federal", label: "Federal Government" },
    { value: "utilities", label: "Utilities" },

    // Agriculture (11)
    { value: "agriculture_farming", label: "Farming & Agriculture" },
    { value: "agriculture_livestock", label: "Livestock & Animal Production" },

    // Mining & Extraction (21)
    { value: "oil_gas", label: "Oil & Gas Extraction" },
    { value: "mining", label: "Mining" },

    // Transportation & Logistics (48-49)
    { value: "transportation_freight", label: "Freight & Trucking" },
    { value: "warehousing", label: "Warehousing & Storage" },
    { value: "logistics", label: "Logistics & Distribution" },

    // Real Estate & Property (53)
    { value: "real_estate_commercial", label: "Commercial Real Estate" },
    { value: "real_estate_residential", label: "Residential Property Management" },
    { value: "office_buildings", label: "Office Buildings" },

    // Professional Services (54)
    { value: "professional_services", label: "Professional Services" },
    { value: "data_centers", label: "Data Centers" },

    // Other
    { value: "other", label: "Other" },
] as const;

export type IndustryValue = (typeof INDUSTRIES)[number]["value"];

interface IndustrySelectProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function IndustrySelect({
    value,
    onChange,
    placeholder = "Select industry...",
    disabled = false,
    className,
}: IndustrySelectProps) {
    const [open, setOpen] = useState(false);

    const selectedIndustry = INDUSTRIES.find((industry) => industry.value === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        "w-full justify-between font-normal",
                        !value && "text-muted-foreground",
                        className
                    )}
                >
                    <span className="flex items-center gap-2 truncate">
                        <Factory className="h-4 w-4 shrink-0 text-muted-foreground" />
                        {selectedIndustry?.label || placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search industries..." />
                    <CommandList>
                        <CommandEmpty>No industry found.</CommandEmpty>
                        <CommandGroup>
                            {INDUSTRIES.map((industry) => (
                                <CommandItem
                                    key={industry.value}
                                    value={industry.label}
                                    onSelect={() => {
                                        onChange(industry.value === value ? "" : industry.value);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === industry.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {industry.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

/**
 * Helper to get industry label from value
 */
export function getIndustryLabel(value: string): string {
    const industry = INDUSTRIES.find((i) => i.value === value);
    return industry?.label || value;
}
