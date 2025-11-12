/**
 * Common unit suggestions by category
 *
 * These are SUGGESTIONS only, not restrictions.
 * Users can always add custom units via free text input.
 *
 * Based on common water treatment engineering parameters
 * and international standards (metric + imperial).
 */

export const COMMON_UNITS = {
	// Flow rates (Caudal)
	flow: [
		"L/s", // Liters per second
		"m³/h", // Cubic meters per hour
		"m³/d", // Cubic meters per day
		"GPM", // Gallons per minute
		"MGD", // Million gallons per day
		"gal/min", // Gallons per minute
		"L/min", // Liters per minute
	],

	// Concentration (Concentración)
	concentration: [
		"mg/L", // Milligrams per liter (most common)
		"ppm", // Parts per million
		"µg/L", // Micrograms per liter
		"g/m³", // Grams per cubic meter
		"%", // Percentage
		"ppb", // Parts per billion
		"mg/kg", // Milligrams per kilogram
	],

	// Temperature (Temperatura)
	temperature: [
		"°C", // Celsius (most common)
		"°F", // Fahrenheit
		"K", // Kelvin
	],

	// Pressure (Presión)
	pressure: [
		"bar", // Bar (most common in water systems)
		"PSI", // Pounds per square inch
		"kPa", // Kilopascals
		"MPa", // Megapascals
		"atm", // Atmospheres
		"mca", // Meters of water column
	],

	// Mass (Masa)
	mass: [
		"kg", // Kilograms
		"g", // Grams
		"ton", // Metric tons
		"lb", // Pounds
		"mg", // Milligrams
		"t/d", // Tons per day
	],

	// Volume (Volumen)
	volume: [
		"m³", // Cubic meters
		"L", // Liters
		"mL", // Milliliters
		"gal", // Gallons
		"ft³", // Cubic feet
	],

	// Distance/Length (Distancia/Longitud)
	distance: [
		"m", // Meters
		"cm", // Centimeters
		"mm", // Millimeters
		"km", // Kilometers
		"ft", // Feet
		"in", // Inches
	],

	// Area (Área)
	area: [
		"m²", // Square meters
		"ha", // Hectares
		"km²", // Square kilometers
		"ft²", // Square feet
		"acre", // Acres
	],

	// Time (Time)
	time: [
		"h", // Hours
		"min", // Minutes
		"s", // Seconds
		"d", // Days
		"year", // Years
		"month", // Months
	],

	// Energy (Energy)
	energy: [
		"kWh", // Kilowatt-hours
		"MWh", // Megawatt-hours
		"J", // Joules
		"kJ", // Kilojoules
		"kcal", // Kilocalories
		"BTU", // British Thermal Units
	],

	// Power (Power)
	power: [
		"kW", // Kilowatts
		"HP", // Horsepower
		"W", // Watts
		"MW", // Megawatts
	],

	// Turbidity (Turbidity)
	turbidity: [
		"NTU", // Nephelometric Turbidity Units (most common)
		"FAU", // Formazin Attenuation Units
		"FTU", // Formazin Turbidity Units
	],

	// Color (Color)
	color: [
		"UPC", // Platinum-Cobalt Units
		"Pt-Co", // Platinum-Cobalt (alternate)
		"Hazen", // Hazen units
	],

	// Velocity (Velocity)
	velocity: [
		"m/s", // Meters per second
		"ft/s", // Feet per second
		"m/h", // Meters per hour
	],

	// Density (Density)
	density: [
		"kg/m³", // Kilograms per cubic meter
		"g/cm³", // Grams per cubic centimeter
		"lb/ft³", // Pounds per cubic foot
	],

	// Cost (Cost) - Economic parameters
	cost: [
		"USD/m³", // US Dollars per cubic meter
		"EUR/m³", // Euros per cubic meter
		"USD/L", // US Dollars per liter
		"EUR/L", // Euros per liter
		"USD/gal", // US Dollars per gallon
		"CRC/m³", // Costa Rican Colón per cubic meter (ejemplo local)
	],
} as const;

/**
 * All common units flattened into a single array
 * Useful for general autocomplete without category filtering
 */
export const ALL_COMMON_UNITS = Object.values(COMMON_UNITS).flat();

/**
 * Unit category type
 */
export type UnitCategory = keyof typeof COMMON_UNITS;

/**
 * Get units by category
 */
export function getUnitsByCategory(category: UnitCategory): readonly string[] {
	return COMMON_UNITS[category];
}

/**
 * Search for units matching a query
 */
export function searchUnits(query: string): string[] {
	if (!query) return ALL_COMMON_UNITS;

	const lowerQuery = query.toLowerCase();
	return ALL_COMMON_UNITS.filter((unit) =>
		unit.toLowerCase().includes(lowerQuery),
	);
}
