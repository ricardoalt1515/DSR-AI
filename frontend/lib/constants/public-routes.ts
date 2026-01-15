/**
 * Public Route Configuration
 *
 * Routes that don't require authentication and should not show the NavBar.
 * These pages have their own branding/layout (AuthLayout).
 */

export const PUBLIC_ROUTES = [
	"/",
	"/login",
	"/register",
	"/forgot-password",
	"/reset-password",
] as const;

/**
 * Check if a route is public (no auth required, no NavBar).
 */
export function isPublicRoute(pathname: string): boolean {
	return PUBLIC_ROUTES.some(
		(route) => pathname === route || pathname.startsWith(`${route}/`),
	);
}

export type PublicRoute = (typeof PUBLIC_ROUTES)[number];
