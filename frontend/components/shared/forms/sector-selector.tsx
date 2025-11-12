"use client";

/**
 * SectorSelector - Reusable sector/subsector selection component
 * 
 * Beautiful split-view UI for selecting sector and subsector.
 * Extracted from PremiumProjectWizard to follow DRY principles.
 * 
 * Used in:
 * - CreateCompanyDialog
 * - PremiumProjectWizard (if needed)
 */

import { Building2, Factory, Home, Store, Target } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Sector, Subsector } from "@/lib/sectors-config";
import { sectorsConfig } from "@/lib/sectors-config";
import { cn } from "@/lib/utils";

interface SectorSelectorProps {
	sector: string;
	subsector: string;
	onSectorChange: (sector: Sector) => void;
	onSubsectorChange: (subsector: Subsector) => void;
	className?: string;
}

// Icon mapping for sectors (DRY - single source of truth)
const SECTOR_ICONS = {
	municipal: Building2,
	commercial: Store,
	industrial: Factory,
	residential: Home,
	other: Target,
} as const;

// Color schemes for each sector
const getSectorColors = (color: string) => {
	const colorMap = {
		blue: {
			card: "border-primary/35 bg-primary/8",
			icon: "bg-primary/15 text-primary",
			accent: "text-primary",
		},
		gray: {
			card: "border-border/40 bg-card/60",
			icon: "bg-card/70 text-muted-foreground",
			accent: "text-muted-foreground",
		},
		green: {
			card: "border-success/35 bg-success/10",
			icon: "bg-success/15 text-success",
			accent: "text-success",
		},
		purple: {
			card: "border-treatment-auxiliary/35 bg-treatment-auxiliary/10",
			icon: "bg-treatment-auxiliary/15 text-treatment-auxiliary",
			accent: "text-treatment-auxiliary",
		},
	};
	return colorMap[color as keyof typeof colorMap] || colorMap.blue;
};

// Map sector ID to color
const getSectorColor = (sectorId: string): string => {
	const colorMap: Record<string, string> = {
		municipal: "blue",
		commercial: "purple",
		industrial: "gray",
		residential: "green",
		other: "gray",
	};
	return colorMap[sectorId] || "gray";
};

/**
 * SectorSelector Component
 * 
 * Split-view layout: Sectors (left) | Subsectors (right)
 * Auto-resets subsector when sector changes
 */
export function SectorSelector({
	sector,
	subsector,
	onSectorChange,
	onSubsectorChange,
	className,
}: SectorSelectorProps) {
	// Get subsectors for selected sector
	const selectedSectorConfig = sectorsConfig.find((s) => s.id === sector);
	const availableSubsectors = selectedSectorConfig?.subsectors || [];

	// Handle sector change (reset subsector)
	const handleSectorChange = (newSector: string) => {
		onSectorChange(newSector as Sector);
		
		// Auto-select first subsector or reset
		const newSectorConfig = sectorsConfig.find((s) => s.id === newSector);
		const firstSubsector = newSectorConfig?.subsectors[0]?.id;
		if (firstSubsector) {
			onSubsectorChange(firstSubsector as Subsector);
		} else {
			onSubsectorChange("" as Subsector);
		}
	};

	// Handle subsector change
	const handleSubsectorChange = (newSubsector: string) => {
		onSubsectorChange(newSubsector as Subsector);
	};

	return (
		<div className={cn("grid md:grid-cols-12 gap-6", className)}>
			{/* Left Panel: Sectors */}
			<div className="md:col-span-5 space-y-3">
				<Label className="text-sm font-medium">Sector *</Label>
				<RadioGroup value={sector} onValueChange={handleSectorChange}>
					{sectorsConfig.map((sectorConfig) => {
						const Icon = SECTOR_ICONS[sectorConfig.id as keyof typeof SECTOR_ICONS] || Target;
						const colors = getSectorColors(getSectorColor(sectorConfig.id));
						const isSelected = sector === sectorConfig.id;

						return (
							<div
								key={sectorConfig.id}
								className={cn(
									"relative rounded-lg border-2 transition-all duration-200",
									colors.card,
									"hover:shadow-md cursor-pointer",
									isSelected
										? "border-primary bg-primary/5 shadow-md"
										: "hover:border-primary/30",
								)}
							>
								<RadioGroupItem
									value={sectorConfig.id}
									id={`sector-${sectorConfig.id}`}
									className="absolute left-4 top-1/2 -translate-y-1/2"
								/>
								<Label
									htmlFor={`sector-${sectorConfig.id}`}
									className="flex items-center gap-3 p-4 pl-12 cursor-pointer"
								>
									<div
										className={cn(
											"h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
											colors.icon,
										)}
									>
										<Icon className={cn("h-5 w-5", colors.accent)} />
									</div>
									<div className="flex-1 min-w-0">
										<div className="font-medium text-sm text-foreground">
											{sectorConfig.label}
										</div>
										<div className="text-xs text-muted-foreground line-clamp-1">
											{sectorConfig.description}
										</div>
									</div>
								</Label>
							</div>
						);
					})}
				</RadioGroup>
			</div>

			{/* Right Panel: Subsectors */}
			<div className="md:col-span-7 space-y-3">
				<Label className="text-sm font-medium">Subsector *</Label>
				
				{sector ? (
					<RadioGroup value={subsector} onValueChange={handleSubsectorChange}>
						<div className="grid gap-2">
							{availableSubsectors.map((subsectorOption) => {
								const isSelected = subsector === subsectorOption.id;
								
								return (
									<div
										key={subsectorOption.id}
										className={cn(
											"relative rounded-lg border-2 transition-all duration-200",
											"hover:shadow-sm cursor-pointer",
											isSelected
												? "border-primary bg-primary/5 shadow-sm"
												: "border-border hover:border-primary/30",
										)}
									>
										<RadioGroupItem
											value={subsectorOption.id}
											id={`subsector-${subsectorOption.id}`}
											className="absolute left-3 top-1/2 -translate-y-1/2"
										/>
										<Label
											htmlFor={`subsector-${subsectorOption.id}`}
											className="flex items-center gap-3 p-3 pl-10 cursor-pointer"
										>
											<div className="flex-1 min-w-0">
												<div className="font-medium text-sm text-foreground">
													{subsectorOption.label}
												</div>
											</div>
										</Label>
									</div>
								);
							})}
						</div>
					</RadioGroup>
				) : (
					// Empty state when no sector selected
					<div className="flex items-center justify-center h-48 border-2 border-dashed border-border rounded-lg">
						<p className="text-sm text-muted-foreground">
							Select a sector to see subsectors
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
