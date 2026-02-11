"use client";

import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type EntityType = "project" | "company" | "location" | "organization";

interface ArchivedBannerProps {
	entityType: EntityType;
	entityName: string;
	archivedAt: string;
	canRestore: boolean;
	canPurge: boolean;
	onRestore: () => void;
	onPurge: () => void;
	loading?: boolean;
}

function formatArchivedDate(isoDate: string): string {
	const date = new Date(isoDate);
	return date.toLocaleDateString(undefined, {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

export function ArchivedBanner({
	entityType,
	entityName,
	archivedAt,
	canRestore,
	canPurge,
	onRestore,
	onPurge,
	loading = false,
}: ArchivedBannerProps) {
	const formattedDate = formatArchivedDate(archivedAt);

	return (
		<Alert variant="warning" className="mb-4">
			<Archive className="h-4 w-4" />
			<AlertTitle>Archived</AlertTitle>
			<AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
				<span>
					This {entityType} &ldquo;{entityName}&rdquo; was archived on{" "}
					{formattedDate}. It is read-only.
				</span>
				{(canRestore || canPurge) && (
					<div className="flex items-center gap-2 flex-shrink-0">
						{canRestore && (
							<Button
								variant="outline"
								size="sm"
								onClick={onRestore}
								disabled={loading}
							>
								<RotateCcw className="mr-2 h-4 w-4" />
								Restore
							</Button>
						)}
						{canPurge && (
							<Button
								variant="destructive"
								size="sm"
								onClick={onPurge}
								disabled={loading}
							>
								<Trash2 className="mr-2 h-4 w-4" />
								Purge
							</Button>
						)}
					</div>
				)}
			</AlertDescription>
		</Alert>
	);
}
