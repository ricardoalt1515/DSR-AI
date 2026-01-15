"use client";

import React, { Component, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SectionErrorBoundaryProps {
	children: ReactNode;
	fallback?: ReactNode;
	sectionName?: string;
	onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface SectionErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

export class SectionErrorBoundary extends Component<
	SectionErrorBoundaryProps,
	SectionErrorBoundaryState
> {
	constructor(props: SectionErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): SectionErrorBoundaryState {
		return { hasError: true, error };
	}

	override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
		console.error(
			`[SectionError] ${this.props.sectionName || "Unknown"}:`,
			error,
		);
		this.props.onError?.(error, errorInfo);
	}

	handleRetry = (): void => {
		this.setState({ hasError: false, error: null });
	};

	override render(): ReactNode {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<SectionError
					sectionName={this.props.sectionName}
					onRetry={this.handleRetry}
				/>
			);
		}

		return this.props.children;
	}
}

interface SectionErrorProps {
	sectionName?: string | undefined;
	onRetry?: () => void;
}

export function SectionError({ sectionName, onRetry }: SectionErrorProps) {
	return (
		<Card className="border-dashed border-destructive/30 bg-destructive/5">
			<CardContent className="flex flex-col items-center justify-center gap-4 py-8 text-center">
				<div className="rounded-full bg-destructive/10 p-3">
					<AlertCircle className="h-6 w-6 text-destructive" />
				</div>
				<div className="space-y-1">
					<h3 className="text-sm font-semibold text-foreground">
						Unable to load {sectionName || "this section"}
					</h3>
					<p className="text-xs text-muted-foreground max-w-xs">
						Something went wrong while rendering this content.
					</p>
				</div>
				{onRetry && (
					<Button
						onClick={onRetry}
						variant="outline"
						size="sm"
						className="gap-2"
					>
						<RefreshCw className="h-4 w-4" />
						Retry
					</Button>
				)}
			</CardContent>
		</Card>
	);
}
