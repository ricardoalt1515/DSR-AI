"use client";

import { AlertTriangle, Home, RefreshCcw } from "lucide-react";
import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
	errorInfo: string | null | undefined;
}

interface ErrorBoundaryProps {
	children: React.ReactNode;
	fallback?: React.ComponentType<ErrorFallbackProps>;
	onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
	resetOnPropsChange?: boolean;
	resetKeys?: Array<string | number>;
}

interface ErrorFallbackProps {
	error: Error | null;
	resetError: () => void;
	hasError: boolean;
}

/**
 * Default error fallback component
 */
function DefaultErrorFallback({
	error,
	resetError,
	hasError,
}: ErrorFallbackProps) {
	if (!hasError) return null;

	return (
		<div className="min-h-[400px] flex items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
						<AlertTriangle className="h-6 w-6" />
					</div>
					<CardTitle className="text-lg">Algo salió mal</CardTitle>
					<CardDescription>
						Ha ocurrido un error inesperado. Nuestro equipo ha sido notificado.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{process.env.NODE_ENV === "development" && error && (
						<Alert variant="destructive">
							<AlertDescription className="text-xs font-mono">
								{error.message}
							</AlertDescription>
						</Alert>
					)}

					<div className="flex flex-col gap-2">
						<Button onClick={resetError} className="w-full">
							<RefreshCcw className="mr-2 h-4 w-4" />
							Intentar nuevamente
						</Button>
						<Button
							variant="outline"
							onClick={() => {
								window.location.href = "/dashboard";
							}}
							className="w-full"
						>
							<Home className="mr-2 h-4 w-4" />
							Volver al dashboard
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

/**
 * Simplified error boundary component for project features
 */
function ProjectErrorFallback({ error, resetError }: ErrorFallbackProps) {
	return (
		<Alert variant="destructive" className="m-4">
			<AlertTriangle className="h-4 w-4" />
			<AlertDescription className="flex items-center justify-between">
				<span>
					Error en el proyecto.{" "}
					{process.env.NODE_ENV === "development" && error?.message}
				</span>
				<Button variant="outline" size="sm" onClick={resetError}>
					Reintentar
				</Button>
			</AlertDescription>
		</Alert>
	);
}

/**
 * Main Error Boundary Class Component
 */
export class ErrorBoundary extends React.Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	private resetTimeoutId: number | null = null;

	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
		};
	}

	static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
		return {
			hasError: true,
			error,
		};
	}

	override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		// Error is captured and displayed by the error boundary UI
		this.setState({
			errorInfo: errorInfo.componentStack ?? null,
		});

		// Call optional onError callback
		this.props.onError?.(error, errorInfo);

		// In production, you would send this to your error reporting service
		// logErrorToService(error, errorInfo)
	}

	override componentDidUpdate(prevProps: ErrorBoundaryProps) {
		const { resetKeys, resetOnPropsChange } = this.props;
		const { hasError } = this.state;

		if (hasError && prevProps.resetKeys !== resetKeys) {
			if (resetKeys?.some((key, idx) => prevProps.resetKeys?.[idx] !== key)) {
				this.resetError();
			}
		}

		if (
			hasError &&
			resetOnPropsChange &&
			prevProps.children !== this.props.children
		) {
			this.resetError();
		}
	}

	override componentWillUnmount() {
		if (this.resetTimeoutId) {
			window.clearTimeout(this.resetTimeoutId);
		}
	}

	resetError = () => {
		this.setState({
			hasError: false,
			error: null,
			errorInfo: null,
		});
	};

	override render() {
		const { hasError, error } = this.state;
		const { children, fallback: Fallback = DefaultErrorFallback } = this.props;

		if (hasError) {
			return (
				<Fallback
					error={error}
					resetError={this.resetError}
					hasError={hasError}
				/>
			);
		}

		return children;
	}
}

/**
 * Hook-based error boundary wrapper (for functional components)
 */
export function withErrorBoundary<P extends object>(
	Component: React.ComponentType<P>,
	errorBoundaryProps?: Partial<ErrorBoundaryProps>,
) {
	const WrappedComponent = (props: P) => (
		<ErrorBoundary {...errorBoundaryProps}>
			<Component {...props} />
		</ErrorBoundary>
	);

	WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

	return WrappedComponent;
}

/**
 * Specialized error boundaries for different parts of the app
 */
export function ProjectErrorBoundary({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ErrorBoundary
			fallback={ProjectErrorFallback}
			onError={(_error) => {
				// Track project errors specifically if needed
			}}
		>
			{children}
		</ErrorBoundary>
	);
}

export function TechnicalDataErrorBoundary({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ErrorBoundary
			fallback={ProjectErrorFallback}
			onError={(_error) => {
				// Track technical data errors specifically if needed
			}}
		>
			{children}
		</ErrorBoundary>
	);
}

export function DashboardErrorBoundary({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ErrorBoundary
			fallback={DefaultErrorFallback}
			onError={(error) => {
				console.error("Dashboard Error:", error);
				// Track dashboard errors specifically
			}}
		>
			{children}
		</ErrorBoundary>
	);
}
