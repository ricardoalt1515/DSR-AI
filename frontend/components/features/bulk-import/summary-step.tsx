"use client";

/**
 * Summary step — post-finalize results with counters and navigation links.
 */

import {
	CheckCircle2,
	ExternalLink,
	MapPin,
	Package,
	Upload,
	XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type {
	BulkImportFinalizeSummary,
	EntrypointType,
} from "@/lib/api/bulk-import";
import { bulkImportAPI } from "@/lib/api/bulk-import";

interface SummaryStepProps {
	runId: string;
	entrypointType: EntrypointType;
	entrypointId: string;
	onNewImport: () => void;
	onNavigate: (path: string) => void;
}

export function SummaryStep({
	runId,
	entrypointType,
	entrypointId,
	onNewImport,
	onNavigate,
}: SummaryStepProps) {
	const [summary, setSummary] = useState<BulkImportFinalizeSummary | null>(
		null,
	);
	const [summaryUnavailable, setSummaryUnavailable] = useState(false);
	const [loading, setLoading] = useState(true);

	const loadSummary = useCallback(async () => {
		setLoading(true);
		try {
			const data = await bulkImportAPI.getSummary(runId);
			setSummary(data.summary);
			setSummaryUnavailable(false);
		} catch {
			setSummary(null);
			setSummaryUnavailable(true);
		} finally {
			setLoading(false);
		}
	}, [runId]);

	useEffect(() => {
		void loadSummary();
	}, [loadSummary]);

	if (loading) {
		return (
			<div className="flex items-center justify-center py-16">
				<div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
			</div>
		);
	}

	const totalCreated =
		summary === null
			? null
			: summary.locationsCreated + summary.projectsCreated;

	return (
		<div className="space-y-8">
			{/* Success header */}
			<div className="flex flex-col items-center text-center gap-4 py-4">
				<div className="p-4 rounded-full bg-emerald-100 dark:bg-emerald-950/50">
					<CheckCircle2 className="h-12 w-12 text-emerald-600" />
				</div>
				<div>
					<h3 className="text-2xl font-bold">Import Complete</h3>
					<p className="text-muted-foreground mt-1">
						{summaryUnavailable || totalCreated === null
							? "Summary unavailable"
							: `${totalCreated} ${totalCreated === 1 ? "entity" : "entities"} created successfully`}
					</p>
				</div>
			</div>

			{/* Stats grid */}
			{summaryUnavailable || summary === null ? (
				<Card>
					<CardContent className="p-4 text-center text-sm text-muted-foreground">
						Finalized successfully, but summary unavailable. Please refresh and
						try again.
					</CardContent>
				</Card>
			) : (
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
					<StatCard
						icon={MapPin}
						label="Locations Created"
						count={summary.locationsCreated}
						className="text-blue-600 bg-blue-50 dark:bg-blue-950/30"
					/>
					<StatCard
						icon={Package}
						label="Waste Streams Created"
						count={summary.projectsCreated}
						className="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
					/>
					<StatCard
						icon={XCircle}
						label="Rejected"
						count={summary.rejected}
						className="text-red-600 bg-red-50 dark:bg-red-950/30"
					/>
					<StatCard
						icon={XCircle}
						label="Invalid"
						count={summary.invalid}
						className="text-gray-500 bg-gray-50 dark:bg-gray-950/30"
					/>
				</div>
			)}

			{/* Navigation */}
			<div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t">
				<Button
					variant="outline"
					onClick={() => {
						if (entrypointType === "company") {
							onNavigate(`/companies/${entrypointId}`);
						} else {
							// Location page needs company ID, navigate to generic location
							onNavigate(`/companies`);
						}
					}}
				>
					<ExternalLink className="h-4 w-4 mr-2" />
					{entrypointType === "company" ? "View Company" : "View Companies"}
				</Button>
				<Button onClick={onNewImport}>
					<Upload className="h-4 w-4 mr-2" />
					Start New Import
				</Button>
			</div>
		</div>
	);
}

function StatCard({
	icon: Icon,
	label,
	count,
	className,
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	count: number;
	className: string;
}) {
	return (
		<Card>
			<CardContent className="p-4 text-center">
				<div className={`inline-flex p-2 rounded-lg mb-2 ${className}`}>
					<Icon className="h-5 w-5" />
				</div>
				<p className="text-3xl font-bold">{count}</p>
				<p className="text-xs text-muted-foreground mt-1">{label}</p>
			</CardContent>
		</Card>
	);
}
