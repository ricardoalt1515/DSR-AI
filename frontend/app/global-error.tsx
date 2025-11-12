"use client";

import { useEffect } from "react";

/**
 * Global Error Boundary
 *
 * This component catches errors that happen outside of the normal error boundary,
 * such as errors in the root layout. It must be a minimal component because
 * it may not have access to the normal app context.
 *
 * IMPORTANT: This file must define its own <html> and <body> tags.
 */
export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		// Log the error to console (Sentry may not be available here)
		console.error("Global error boundary triggered:", error);

		// Try to send to monitoring service if available
		interface WindowWithSentry extends Window {
			Sentry?: {
				captureException: (
					error: unknown,
					options?: Record<string, unknown>,
				) => void;
			};
		}

		const windowWithSentry =
			typeof window !== "undefined" ? (window as WindowWithSentry) : null;

		if (windowWithSentry?.Sentry) {
			windowWithSentry.Sentry.captureException(error, {
				level: "fatal",
				tags: {
					source: "global-error-boundary",
				},
			});
		}
	}, [error]);

	return (
		<html lang="en">
			<body>
				<div
					style={{
						minHeight: "100vh",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						padding: "1rem",
						fontFamily: "system-ui, -apple-system, sans-serif",
						backgroundColor: "#f9fafb",
					}}
				>
					<div
						style={{
							width: "100%",
							maxWidth: "600px",
							backgroundColor: "white",
							borderRadius: "0.5rem",
							boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
							padding: "2rem",
						}}
					>
						<div style={{ textAlign: "center" }}>
							<div
								style={{
									margin: "0 auto 1.5rem",
									width: "64px",
									height: "64px",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									borderRadius: "50%",
									backgroundColor: "#fee2e2",
								}}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="32"
									height="32"
									viewBox="0 0 24 24"
									fill="none"
									stroke="#dc2626"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									role="img"
									aria-label="Alert icon"
								>
									<title>Alert icon</title>
									<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
									<line x1="12" y1="9" x2="12" y2="13" />
									<line x1="12" y1="17" x2="12.01" y2="17" />
								</svg>
							</div>

							<h1
								style={{
									fontSize: "1.875rem",
									fontWeight: "700",
									marginBottom: "0.5rem",
									color: "#111827",
								}}
							>
								Critical Error
							</h1>

							<p
								style={{
									color: "#6b7280",
									marginBottom: "2rem",
									fontSize: "1rem",
								}}
							>
								A critical error has occurred in the application. Our team has
								been automatically notified.
							</p>

							{/* Show error details in development */}
							{process.env.NODE_ENV === "development" && error && (
								<div
									style={{
										backgroundColor: "#fee2e2",
										border: "1px solid #fecaca",
										borderRadius: "0.375rem",
										padding: "1rem",
										marginBottom: "1.5rem",
										textAlign: "left",
									}}
								>
									<p
										style={{
											fontWeight: "600",
											color: "#991b1b",
											marginBottom: "0.5rem",
										}}
									>
										{error.name}
									</p>
									<p
										style={{
											fontSize: "0.875rem",
											color: "#7f1d1d",
											marginBottom: "0.5rem",
										}}
									>
										{error.message}
									</p>
									{error.digest && (
										<p
											style={{
												fontSize: "0.75rem",
												color: "#991b1b",
											}}
										>
											Error ID: {error.digest}
										</p>
									)}
								</div>
							)}

							{/* Production-safe error ID */}
							{process.env.NODE_ENV !== "development" && error.digest && (
								<div
									style={{
										backgroundColor: "#f3f4f6",
										borderRadius: "0.375rem",
										padding: "0.75rem",
										marginBottom: "1.5rem",
									}}
								>
									<p
										style={{
											fontSize: "0.875rem",
											color: "#4b5563",
										}}
									>
										Error ID:{" "}
										<code
											style={{
												fontFamily: "monospace",
												backgroundColor: "#e5e7eb",
												padding: "0.125rem 0.375rem",
												borderRadius: "0.25rem",
												fontSize: "0.875rem",
											}}
										>
											{error.digest}
										</code>
									</p>
									<p
										style={{
											fontSize: "0.75rem",
											color: "#6b7280",
											marginTop: "0.25rem",
										}}
									>
										Provide this ID when contacting support.
									</p>
								</div>
							)}

							<div
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "0.5rem",
								}}
							>
								<button
									type="button"
									onClick={reset}
									style={{
										width: "100%",
										backgroundColor: "#2563eb",
										color: "white",
										padding: "0.75rem 1.5rem",
										borderRadius: "0.375rem",
										border: "none",
										fontSize: "1rem",
										fontWeight: "500",
										cursor: "pointer",
									}}
									onMouseOver={(e) => {
										e.currentTarget.style.backgroundColor = "#1d4ed8";
									}}
									onMouseOut={(e) => {
										e.currentTarget.style.backgroundColor = "#2563eb";
									}}
									onFocus={(e) => {
										e.currentTarget.style.backgroundColor = "#1d4ed8";
									}}
									onBlur={(e) => {
										e.currentTarget.style.backgroundColor = "#2563eb";
									}}
								>
									Try again
								</button>

								<button
									type="button"
									onClick={() => {
										window.location.href = "/";
									}}
									style={{
										width: "100%",
										backgroundColor: "white",
										color: "#374151",
										padding: "0.75rem 1.5rem",
										borderRadius: "0.375rem",
										border: "1px solid #d1d5db",
										fontSize: "1rem",
										fontWeight: "500",
										cursor: "pointer",
									}}
									onMouseOver={(e) => {
										e.currentTarget.style.backgroundColor = "#f9fafb";
									}}
									onMouseOut={(e) => {
										e.currentTarget.style.backgroundColor = "white";
									}}
									onFocus={(e) => {
										e.currentTarget.style.backgroundColor = "#f9fafb";
									}}
									onBlur={(e) => {
										e.currentTarget.style.backgroundColor = "white";
									}}
								>
									Back to home
								</button>
							</div>
						</div>
					</div>
				</div>
			</body>
		</html>
	);
}
