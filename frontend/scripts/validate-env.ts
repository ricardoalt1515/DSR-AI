/**
 * Environment Variables Validation Script
 *
 * This script validates that all required environment variables are set
 * before building or running the application.
 *
 * Run this script in package.json before build:
 * "prebuild": "ts-node scripts/validate-env.ts"
 */

import { resolve } from "node:path";
// Load environment variables from .env.local (Next.js does this automatically, but tsx doesn't)
import { config } from "dotenv";

// Load .env.local from the project root
config({ path: resolve(process.cwd(), ".env.local") });

interface EnvConfig {
	name: string;
	required: boolean;
	description: string;
	default?: string;
	validator?: (value: string) => boolean;
}

const ENV_VARS: EnvConfig[] = [
	{
		name: "NEXT_PUBLIC_API_BASE_URL",
		required: true,
		description: "Backend API base URL (e.g., http://localhost:8001/api/v1)",
		validator: (value) => value.startsWith("http") && value.includes("/api/v1"),
	},
	{
		name: "NEXT_PUBLIC_DISABLE_API",
		required: false,
		description: "Disable API calls for frontend-only development (0 or 1)",
		default: "0",
		validator: (value) => ["0", "1", "true", "false"].includes(value),
	},
	{
		name: "NEXT_PUBLIC_SENTRY_DSN",
		required: false,
		description:
			"Sentry DSN for error tracking (optional but recommended for production)",
	},
	{
		name: "NEXT_PUBLIC_VERCEL_ANALYTICS_ID",
		required: false,
		description: "Vercel Analytics ID (optional)",
	},
];

interface ValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

function validateEnvironmentVariables(): ValidationResult {
	const result: ValidationResult = {
		valid: true,
		errors: [],
		warnings: [],
	};

	console.log("🔍 Validating environment variables...\n");

	for (const envVar of ENV_VARS) {
		const value = process.env[envVar.name];

		if (!value) {
			if (envVar.required) {
				result.valid = false;
				result.errors.push(
					`❌ ${envVar.name} is required but not set.\n   Description: ${envVar.description}${envVar.default ? `\n   Default: ${envVar.default}` : ""}`,
				);
			} else if (process.env.NODE_ENV === "production") {
				result.warnings.push(
					`⚠️  ${envVar.name} is not set (optional).\n   Description: ${envVar.description}${envVar.default ? `\n   Will use default: ${envVar.default}` : ""}`,
				);
			}
			continue;
		}

		// Validate value format if validator exists
		if (envVar.validator && !envVar.validator(value)) {
			result.valid = false;
			result.errors.push(
				`❌ ${envVar.name} has invalid format.\n   Current value: ${value}\n   Description: ${envVar.description}`,
			);
			continue;
		}

		// Success
		const displayValue =
			envVar.name.includes("KEY") ||
			envVar.name.includes("SECRET") ||
			envVar.name.includes("DSN")
				? "***REDACTED***"
				: value;

		console.log(`✅ ${envVar.name} = ${displayValue}`);
	}

	// Print errors and warnings
	console.log("");

	if (result.errors.length > 0) {
		console.error("❌ Validation failed! The following errors were found:\n");
		for (const error of result.errors) {
			console.error(`${error}\n`);
		}
	}

	if (result.warnings.length > 0) {
		console.warn("⚠️  Warnings:\n");
		for (const warning of result.warnings) {
			console.warn(`${warning}\n`);
		}
	}

	if (result.valid) {
		console.log("✅ All required environment variables are valid!\n");

		if (process.env.NODE_ENV === "production" && result.warnings.length > 0) {
			console.warn(
				"⚠️  Production build with warnings. Review optional variables above.\n",
			);
		}
	}

	return result;
}

function printHelpMessage() {
	console.log("\n📝 Environment Variables Reference:\n");
	console.log("Create a .env.local file with the following variables:\n");

	for (const envVar of ENV_VARS) {
		console.log(`# ${envVar.description}`);
		console.log(
			`${envVar.name}=${envVar.default || (envVar.required ? "your-value-here" : "optional")}`,
		);

		console.log("");
	}

	console.log("For more details, see: .env.example\n");
}

// Main execution
function main() {
	console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
	console.log("  H2O Allegiant - Environment Validation");
	console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

	const result = validateEnvironmentVariables();

	if (!result.valid) {
		printHelpMessage();
		console.error("❌ Environment validation failed!");
		console.error("Please fix the errors above and try again.\n");
		process.exit(1);
	}

	console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
	process.exit(0);
}

// Run validation
main();
