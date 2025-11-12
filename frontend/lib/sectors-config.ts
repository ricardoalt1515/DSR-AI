export type Sector =
	| "commercial"
	| "residential"
	| "industrial"
	| "municipal"
	| "other";

export type Subsector =
	// Commercial
	| "restaurant"
	| "hotel"
	| "shopping_mall"
	| "office_building"
	| "food_service"
	// Residential
	| "single_home"
	| "multi_family"
	// Industrial
	| "food_processing"
	| "beverage_bottling"
	| "textile_manufacturing"
	| "pharmaceutical_manufacturing"
	| "chemical_processing"
	| "oil_gas"
	// Municipal
	| "government_building"
	| "water_utility"
	// General
	| "other";

export interface SectorConfig {
	id: Sector;
	label: string;
	subsectors: {
		id: Subsector;
		label: string;
	}[];
	description?: string;
	icon?: string;
}

export const sectorsConfig: SectorConfig[] = [
	{
		id: "commercial",
		label: "Commercial",
		description:
			"Projects for restaurants, hotels, shopping malls, and food service",
		subsectors: [
			{ id: "restaurant", label: "Restaurant" },
			{ id: "hotel", label: "Hotel" },
			{ id: "shopping_mall", label: "Shopping Mall" },
			{ id: "office_building", label: "Office Building" },
			{ id: "food_service", label: "Food & Beverage Service" },
			{ id: "other", label: "Other" },
		],
	},
	{
		id: "residential",
		label: "Residential",
		description: "Projects for single-family homes and residential complexes",
		subsectors: [
			{ id: "single_home", label: "Single Family Home" },
			{ id: "multi_family", label: "Multi-Family Complex" },
			{ id: "other", label: "Other" },
		],
	},
	{
		id: "industrial",
		label: "Industrial",
		description: "Projects for manufacturing plants and industrial processes",
		subsectors: [
			{ id: "food_processing", label: "Food Processing Plant" },
			{ id: "beverage_bottling", label: "Beverage Bottling Plant" },
			{ id: "textile_manufacturing", label: "Textile Manufacturing" },
			{
				id: "pharmaceutical_manufacturing",
				label: "Pharmaceutical Manufacturing",
			},
			{ id: "chemical_processing", label: "Chemical Processing" },
			{ id: "oil_gas", label: "Oil & Gas" },
			{ id: "other", label: "Other" },
		],
	},
	{
		id: "municipal",
		label: "Municipal",
		description: "Projects for government entities and public utilities",
		subsectors: [
			{ id: "government_building", label: "Government Building" },
			{ id: "water_utility", label: "Water Utility" },
			{ id: "other", label: "Other" },
		],
	},
	{
		id: "other",
		label: "Other",
		description: "Other types of unclassified projects",
		subsectors: [{ id: "other", label: "Other" }],
	},
];

// Helper functions
export const getSectorConfig = (sectorId: Sector): SectorConfig | undefined => {
	return sectorsConfig.find((sector) => sector.id === sectorId);
};

export const getSubsectors = (
	sectorId: Sector,
): { id: Subsector; label: string }[] => {
	const sector = getSectorConfig(sectorId);
	return sector?.subsectors || [];
};

export const getSectorBySubsector = (
	subsectorId: Subsector,
): SectorConfig | undefined => {
	return sectorsConfig.find((sector) =>
		sector.subsectors.some((subsector) => subsector.id === subsectorId),
	);
};

// Common applications by sector/subsector for contextual suggestions
export const sectorApplications = {
	commercial: {
		restaurant: {
			commonParameters: [
				"turbidity",
				"ph",
				"chlorine",
				"hardness",
				"bacterial-quality",
				"heavy-metals",
			],
			priorities: [
				"product-quality",
				"regulatory-compliance",
				"process-efficiency",
			],
			description: "Food quality and strict regulatory compliance",
		},
		hotel: {
			commonParameters: [
				"hardness",
				"chlorine-residual",
				"iron",
				"ph",
				"temperature",
			],
			priorities: ["guest-experience", "equipment-protection", "taste-odor"],
			description: "Premium quality for guests and equipment protection",
		},
		shopping_mall: {
			commonParameters: ["turbidity", "chlorine-residual", "ph", "hardness"],
			priorities: ["aesthetic-quality", "odor-taste", "safety"],
			description: "Focus on aesthetic quality and visitor safety",
		},
		office_building: {
			commonParameters: [
				"turbidity",
				"ph",
				"chlorine-residual",
				"bacterial-quality",
			],
			priorities: ["employee-health", "cost-efficiency", "maintenance"],
			description: "Safe and economical water for employees",
		},
		food_service: {
			commonParameters: [
				"turbidity",
				"ph",
				"chlorine",
				"hardness",
				"bacterial-quality",
			],
			priorities: ["food-safety", "regulatory-compliance", "cost-efficiency"],
			description: "Food service water quality and safety",
		},
	},
	residential: {
		single_home: {
			commonParameters: [
				"hardness",
				"iron",
				"ph",
				"nitrates",
				"bacterial-quality",
			],
			priorities: ["family-health", "appliance-protection", "cost"],
			description: "Safe water and appliance protection for families",
		},
		multi_family: {
			commonParameters: [
				"turbidity",
				"chlorine-residual",
				"ph",
				"hardness",
				"flow-rate",
			],
			priorities: [
				"resident-satisfaction",
				"system-reliability",
				"operational-cost",
			],
			description: "Reliable system for multiple residential units",
		},
	},
	industrial: {
		food_processing: {
			commonParameters: [
				"turbidity",
				"ph",
				"chlorine",
				"hardness",
				"bacterial-quality",
				"heavy-metals",
			],
			priorities: [
				"product-quality",
				"regulatory-compliance",
				"process-efficiency",
			],
			description: "Food processing quality and regulatory compliance",
		},
		beverage_bottling: {
			commonParameters: [
				"turbidity",
				"ph",
				"chlorine",
				"hardness",
				"bacterial-quality",
			],
			priorities: ["product-quality", "regulatory-compliance", "efficiency"],
			description: "Beverage bottling quality standards",
		},
		textile_manufacturing: {
			commonParameters: [
				"hardness",
				"iron",
				"ph",
				"turbidity",
				"color",
				"temperature",
			],
			priorities: [
				"process-quality",
				"equipment-protection",
				"wastewater-treatment",
			],
			description: "Process water and textile effluent treatment",
		},
		pharmaceutical_manufacturing: {
			commonParameters: [
				"conductivity",
				"ph",
				"bacterial-quality",
				"heavy-metals",
				"organics",
			],
			priorities: ["regulatory-compliance", "product-purity", "validation"],
			description: "Ultrapure water and pharmaceutical compliance",
		},
		chemical_processing: {
			commonParameters: [
				"ph",
				"conductivity",
				"heavy-metals",
				"organics",
				"temperature",
			],
			priorities: ["process-quality", "safety", "regulatory-compliance"],
			description: "Chemical process water quality and safety",
		},
	},
	municipal: {
		government_building: {
			commonParameters: [
				"turbidity",
				"ph",
				"chlorine-residual",
				"fluoride",
				"bacterial-quality",
			],
			priorities: ["public-health", "regulatory-compliance", "cost-efficiency"],
			description: "Safe drinking water for public services",
		},
		water_utility: {
			commonParameters: [
				"turbidity",
				"ph",
				"chlorine",
				"fluoride",
				"bacterial-quality",
				"capacity",
			],
			priorities: [
				"population-coverage",
				"regulatory-compliance",
				"sustainability",
			],
			description: "Massive supply of quality drinking water",
		},
	},
} as const;

// Type for sector applications (simplified to avoid type errors with "other")
export type SectorApplication = {
	commonParameters: string[];
	priorities: string[];
	description: string;
};
