/**
 * Simple production-safe logger
 * Outputs to console with context prefix
 */

const isDev = process.env.NODE_ENV === "development";

export const logger = {
	/**
	 * Error level - critical issues
	 */
	error(message: string, error?: unknown, context?: string): void {
		const prefix = context ? `[${context}]` : "";
		console.error(`${prefix} ${message}`, error);
	},

	/**
	 * Warning level - unexpected but not critical
	 */
	warn(message: string, context?: string): void {
		const prefix = context ? `[${context}]` : "";
		console.warn(`${prefix} ${message}`);
	},

	/**
	 * Info level - development only
	 */
	info(message: string, data?: unknown, context?: string): void {
		if (isDev) {
			const prefix = context ? `[${context}]` : "";
			console.log(`${prefix} ${message}`, data);
		}
	},

	/**
	 * Debug level - development only
	 */
	debug(message: string, data?: unknown, context?: string): void {
		if (isDev) {
			const prefix = context ? `[${context}]` : "";
			console.log(`${prefix} ${message}`, data);
		}
	},
};

// Export for direct use
export default logger;
