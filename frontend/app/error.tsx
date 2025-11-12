"use client";

import { AlertTriangle, Home, RefreshCcw } from "lucide-react";
import { useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { logger } from "@/lib/utils/logger";

/**
 * Error Boundary Component
 *
 * This component catches JavaScript errors anywhere in the client component tree.
 * It displays a fallback UI and logs the error to monitoring services.
 *
 * Note: This only works for client-side errors. For server-side errors,
 * Next.js will use global-error.tsx
 */
export default function ErrorPage({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		// Log the error to monitoring service
		logger.error(
			"Application error boundary triggered",
			error,
			"ErrorBoundary",
		);
	}, [error]);

	const isDevelopment = process.env.NODE_ENV === "development";

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<Card className="w-full max-w-2xl shadow-lg">
				<CardHeader className="text-center">
					<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15 text-destructive">
						<AlertTriangle className="h-8 w-8" />
					</div>

					<CardTitle className="text-2xl">Something went wrong</CardTitle>
					<CardDescription className="mt-2">
						An unexpected error has occurred. Our team has been automatically
						notified.
					</CardDescription>
				</CardHeader>

				<CardContent className="space-y-4">
					{/* Show error details in development */}
					{isDevelopment && error && (
						<Alert variant="destructive">
							<AlertDescription className="space-y-2">
								<p className="font-semibold">{error.name}</p>
								<p className="text-sm">{error.message}</p>
								{error.digest && (
									<p className="text-xs text-muted-foreground">
										Error ID: {error.digest}
									</p>
								)}
								{error.stack && (
									<details className="mt-2">
										<summary className="cursor-pointer text-xs">
											Stack trace
										</summary>
										<pre className="mt-2 text-xs whitespace-pre-wrap overflow-auto max-h-40 p-2 bg-black/10 rounded">
											{error.stack}
										</pre>
									</details>
								)}
							</AlertDescription>
						</Alert>
					)}

					{/* Production-safe error message */}
					{!isDevelopment && error.digest && (
						<Alert>
							<AlertDescription className="text-xs">
								Error ID:{" "}
								<code className="font-mono bg-muted px-1 py-0.5 rounded">
									{error.digest}
								</code>
								<br />
								Provide this ID when contacting support.
							</AlertDescription>
						</Alert>
					)}

					<div className="flex flex-col gap-2 mt-6">
						<Button onClick={reset} className="w-full">
							<RefreshCcw className="mr-2 h-4 w-4" />
							Try again
						</Button>

						<Button
							variant="outline"
							onClick={() => {
								window.location.href = "/dashboard";
							}}
							className="w-full"
						>
							<Home className="mr-2 h-4 w-4" />
							Back to Dashboard
						</Button>
					</div>

					<div className="mt-6 pt-6 border-t">
						<p className="text-sm text-muted-foreground text-center">
							If the problem persists,{" "}
							<button
								type="button"
								onClick={() => {
									// Copy error info to clipboard
									const errorInfo = isDevelopment
										? `${error.name}: ${error.message}\n\n${error.stack}`
										: `Error ID: ${error.digest || "unknown"}`;

									navigator.clipboard.writeText(errorInfo);
									alert("Error information copied to clipboard");
								}}
								className="text-primary hover:underline"
							>
								copy the error
							</button>{" "}
							and contact support.
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
