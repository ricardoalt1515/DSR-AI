"use client";

import {
	Building,
	ChevronRight,
	Globe,
	MapPin,
	Search,
	Users,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface LocationSuggestion {
	id: string;
	name: string;
	type: "country" | "state" | "city" | "region";
	fullName: string;
	population?: number;
	context?: string;
}

interface LocationAutocompleteProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
	autoFocus?: boolean;
}

// Mock location data - in a real app this would come from a geocoding service
const MOCK_LOCATIONS: LocationSuggestion[] = [
	// Mexico
	{
		id: "mx-1",
		name: "Mexico City",
		type: "city",
		fullName: "Mexico City, Mexico",
		population: 9200000,
		context: "National capital",
	},
	{
		id: "mx-2",
		name: "Guadalajara",
		type: "city",
		fullName: "Guadalajara, Jalisco, Mexico",
		population: 1500000,
		context: "Metropolitan area",
	},
	{
		id: "mx-3",
		name: "Monterrey",
		type: "city",
		fullName: "Monterrey, Nuevo León, Mexico",
		population: 1100000,
		context: "Industrial center",
	},
	{
		id: "mx-4",
		name: "Puebla",
		type: "city",
		fullName: "Puebla, Puebla, Mexico",
		population: 700000,
		context: "Historic center",
	},
	{
		id: "mx-5",
		name: "Tijuana",
		type: "city",
		fullName: "Tijuana, Baja California, Mexico",
		population: 900000,
		context: "Northern border",
	},
	{
		id: "mx-6",
		name: "León",
		type: "city",
		fullName: "León, Guanajuato, Mexico",
		population: 800000,
		context: "Footwear industry",
	},
	{
		id: "mx-7",
		name: "Juárez",
		type: "city",
		fullName: "Ciudad Juárez, Chihuahua, Mexico",
		population: 750000,
		context: "US border",
	},
	{
		id: "mx-8",
		name: "Zapopan",
		type: "city",
		fullName: "Zapopan, Jalisco, Mexico",
		population: 650000,
		context: "Metropolitan area GDL",
	},
	{
		id: "mx-9",
		name: "Mérida",
		type: "city",
		fullName: "Mérida, Yucatán, Mexico",
		population: 600000,
		context: "Yucatan Peninsula",
	},
	{
		id: "mx-10",
		name: "Cancún",
		type: "city",
		fullName: "Cancún, Quintana Roo, Mexico",
		population: 550000,
		context: "Tourist destination",
	},

	// States
	{
		id: "mx-st-1",
		name: "Jalisco",
		type: "state",
		fullName: "Jalisco, Mexico",
		context: "Western state",
	},
	{
		id: "mx-st-2",
		name: "Nuevo León",
		type: "state",
		fullName: "Nuevo León, Mexico",
		context: "Northeast state",
	},
	{
		id: "mx-st-3",
		name: "Yucatán",
		type: "state",
		fullName: "Yucatán, Mexico",
		context: "Southeast peninsula",
	},
	{
		id: "mx-st-4",
		name: "Quintana Roo",
		type: "state",
		fullName: "Quintana Roo, Mexico",
		context: "Riviera Maya",
	},

	// International
	{
		id: "us-1",
		name: "Los Angeles",
		type: "city",
		fullName: "Los Angeles, California, USA",
		population: 4000000,
		context: "West coast USA",
	},
	{
		id: "us-2",
		name: "Miami",
		type: "city",
		fullName: "Miami, Florida, USA",
		population: 470000,
		context: "Southeast USA",
	},
	{
		id: "co-1",
		name: "Bogotá",
		type: "city",
		fullName: "Bogotá, Colombia",
		population: 7000000,
		context: "Colombian capital",
	},
	{
		id: "pe-1",
		name: "Lima",
		type: "city",
		fullName: "Lima, Peru",
		population: 9500000,
		context: "Peruvian capital",
	},
	{
		id: "cl-1",
		name: "Santiago",
		type: "city",
		fullName: "Santiago, Chile",
		population: 6000000,
		context: "Chilean capital",
	},
];

export function LocationAutocomplete({
	value,
	onChange,
	placeholder = "Search location...",
	className,
	autoFocus,
}: LocationAutocompleteProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [inputValue, setInputValue] = useState(value);

	const suggestions = useMemo(() => {
		if (!inputValue.trim()) {
			// Show popular locations when no search
			return MOCK_LOCATIONS.filter(
				(loc) =>
					loc.type === "city" && loc.population && loc.population > 500000,
			).slice(0, 6);
		}

		const searchTerm = inputValue.toLowerCase().trim();
		return MOCK_LOCATIONS.filter(
			(location) =>
				location.name.toLowerCase().includes(searchTerm) ||
				location.fullName.toLowerCase().includes(searchTerm) ||
				location.context?.toLowerCase().includes(searchTerm),
		)
			.sort((a, b) => {
				// Prioritize exact matches
				const aExact = a.name.toLowerCase().startsWith(searchTerm);
				const bExact = b.name.toLowerCase().startsWith(searchTerm);
				if (aExact && !bExact) return -1;
				if (!aExact && bExact) return 1;

				// Then by population for cities
				if (a.type === "city" && b.type === "city") {
					return (b.population || 0) - (a.population || 0);
				}

				// States and countries first
				if (a.type !== "city" && b.type === "city") return -1;
				if (a.type === "city" && b.type !== "city") return 1;

				return 0;
			})
			.slice(0, 8);
	}, [inputValue]);

	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const newValue = e.target.value;
			setInputValue(newValue);
			setIsOpen(true);
		},
		[],
	);

	const handleInputFocus = useCallback(() => {
		setIsOpen(true);
	}, []);

	const handleInputBlur = useCallback(() => {
		// Delay to allow clicking on suggestions
		setTimeout(() => {
			// Save custom input if user typed something different
			if (inputValue.trim() && inputValue.trim() !== value) {
				onChange(inputValue.trim());
			}
			setIsOpen(false);
		}, 200);
	}, [inputValue, value, onChange]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter" && inputValue.trim()) {
				e.preventDefault();
				onChange(inputValue.trim());
				setIsOpen(false);
			}
		},
		[inputValue, onChange],
	);

	const handleSuggestionClick = useCallback(
		(suggestion: LocationSuggestion) => {
			setInputValue(suggestion.fullName);
			onChange(suggestion.fullName);
			setIsOpen(false);
		},
		[onChange],
	);

	const getLocationIcon = (type: LocationSuggestion["type"]) => {
		switch (type) {
			case "country":
				return Globe;
			case "state":
				return Building;
			case "city":
				return MapPin;
			case "region":
				return Users;
			default:
				return MapPin;
		}
	};

	const formatPopulation = (population?: number) => {
		if (!population) return "";
		if (population >= 1000000) {
			return `${(population / 1000000).toFixed(1)}M residents`;
		}
		if (population >= 1000) {
			return `${(population / 1000).toFixed(0)}K residents`;
		}
		return `${population} residents`;
	};

	const getTypeColor = (type: LocationSuggestion["type"]) => {
		switch (type) {
			case "country":
				return "bg-primary/10 text-primary";
			case "state":
				return "bg-treatment-auxiliary/12 text-treatment-auxiliary";
			case "city":
				return "bg-success/12 text-success";
			case "region":
				return "bg-accent/15 text-accent-foreground";
			default:
				return "bg-muted text-muted-foreground";
		}
	};

	const getTypeLabel = (type: LocationSuggestion["type"]) => {
		switch (type) {
			case "country":
				return "Country";
			case "state":
				return "State";
			case "city":
				return "City";
			case "region":
				return "Region";
			default:
				return "";
		}
	};

	return (
		<div className={cn("relative", className)}>
			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
				<Input
					value={inputValue}
					onChange={handleInputChange}
					onFocus={handleInputFocus}
					onBlur={handleInputBlur}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					className="h-12 text-base pl-10 pr-4"
					autoFocus={autoFocus}
					autoComplete="off"
				/>
			</div>

			{/* Helper text */}
			<p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
				💡 Type any location and press{" "}
				<kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted border border-border rounded">
					Enter
				</kbd>{" "}
				or select from suggestions
			</p>

			{isOpen && (
				<Card className="absolute top-full left-0 right-0 mt-2 z-50 shadow-xl border-2 border-primary/10">
					<CardContent className="p-0 max-h-80 overflow-y-auto">
						{suggestions.length > 0 ? (
							<div className="divide-y divide-border">
								{!inputValue.trim() && (
									<div className="p-3 bg-muted/30">
										<p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
											<MapPin className="h-3 w-3" />
											Popular locations
										</p>
									</div>
								)}

								{suggestions.map((suggestion) => {
									const Icon = getLocationIcon(suggestion.type);

									return (
										<Button
											key={suggestion.id}
											variant="ghost"
											className="w-full justify-start h-auto p-4 rounded-none hover:bg-primary/5 focus:bg-primary/5"
											onClick={() => handleSuggestionClick(suggestion)}
										>
											<div className="flex items-center gap-3 w-full">
												<div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
													<Icon className="h-4 w-4 text-primary" />
												</div>

												<div className="flex-1 text-left space-y-1">
													<div className="flex items-center gap-2">
														<span className="font-medium text-foreground">
															{suggestion.name}
														</span>
														<Badge
															className={cn(
																"text-xs",
																getTypeColor(suggestion.type),
															)}
														>
															{getTypeLabel(suggestion.type)}
														</Badge>
													</div>

													<div className="flex items-center gap-3 text-xs text-muted-foreground">
														<span>{suggestion.fullName}</span>
														{suggestion.population && (
															<>
																<span>•</span>
																<span className="flex items-center gap-1">
																	<Users className="h-3 w-3" />
																	{formatPopulation(suggestion.population)}
																</span>
															</>
														)}
													</div>

													{suggestion.context && (
														<p className="text-xs text-muted-foreground">
															{suggestion.context}
														</p>
													)}
												</div>

												<ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
											</div>
										</Button>
									);
								})}
							</div>
						) : (
							<div className="p-6 text-center">
								<Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
								<p className="text-sm text-muted-foreground">
									No locations found
								</p>
								<p className="text-xs text-muted-foreground mt-1">
									Try with another search term
								</p>
							</div>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
