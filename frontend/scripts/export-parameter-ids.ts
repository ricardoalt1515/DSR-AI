#!/usr/bin/env bun
/**
 * Export Parameter IDs Script
 *
 * Purpose: Export all parameter IDs from PARAMETER_LIBRARY to JSON.
 * This enables backend validation without duplicating metadata.
 *
 * Output: frontend/generated/parameter-ids.json
 *
 * Usage:
 *   bun run export:parameter-ids
 *
 * Principles:
 * - DRY: Single source of truth (parameter library)
 * - Fail fast: Throws error if library can't be loaded
 * - Good names: Clear file names and variable names
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Get current file directory (ESM compatibility)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths (relative to script location)
const OUTPUT_DIR = path.join(__dirname, "..", "generated");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "parameter-ids.json");

// Dynamic import to load parameter library
async function exportParameterIds() {
	try {
		console.log("📦 Loading parameter library...");

		// Import PARAMETER_LIBRARY
		const { PARAMETER_LIBRARY } = await import("../lib/parameters/index");

		if (!PARAMETER_LIBRARY || !Array.isArray(PARAMETER_LIBRARY)) {
			throw new Error("PARAMETER_LIBRARY is not an array or is undefined");
		}

		// Extract IDs only (no metadata)
		const parameterIds = PARAMETER_LIBRARY.map((param) => param.id).sort(); // Sort for consistency

		// Validate IDs
		if (parameterIds.length === 0) {
			throw new Error("PARAMETER_LIBRARY is empty");
		}

		// Check for duplicates (fail fast)
		const uniqueIds = new Set(parameterIds);
		if (uniqueIds.size !== parameterIds.length) {
			throw new Error(
				`Duplicate parameter IDs found! Unique: ${uniqueIds.size}, Total: ${parameterIds.length}`,
			);
		}

		// Ensure output directory exists
		if (!fs.existsSync(OUTPUT_DIR)) {
			fs.mkdirSync(OUTPUT_DIR, { recursive: true });
		}

		// Write to file with pretty formatting
		const output = {
			_comment:
				"Auto-generated file. DO NOT edit manually. Run 'bun run export:parameter-ids' to regenerate.",
			generated_at: new Date().toISOString(),
			count: parameterIds.length,
			parameter_ids: parameterIds,
		};

		fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

		console.log(`✅ Exported ${parameterIds.length} parameter IDs`);
		console.log(`📄 Output: ${OUTPUT_FILE}`);
		console.log("\n📋 Sample IDs:");
		parameterIds.slice(0, 10).forEach((id) => console.log(`   - ${id}`));

		if (parameterIds.length > 10) {
			console.log(`   ... and ${parameterIds.length - 10} more`);
		}
	} catch (error) {
		console.error("❌ Failed to export parameter IDs:");
		console.error(error);
		process.exit(1); // Fail fast
	}
}

// Run export
exportParameterIds();
