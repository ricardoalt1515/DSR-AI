"use client";

import { Check, Link2, MapPin, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import type { MapBlockedReason } from "./voice-review-guards";

export type LocationAction = "map" | "create" | "reject";

interface DuplicateInfo {
	id: string;
	name: string;
}

interface LocationGroupCardProps {
	groupId: string;
	locationName: string;
	streamCount?: number | undefined;
	/** Best-match duplicate candidates from backend (location item) */
	duplicateCandidates?: DuplicateInfo[] | undefined;
	canUseExistingMatch: boolean;
	mapBlockedReason: MapBlockedReason | null;
	resolved: boolean;
	selected: boolean;
	onSelectedChange: (selected: boolean) => void;
	onResolve: (action: LocationAction) => void;
	currentAction?: LocationAction;
	children: React.ReactNode;
}

export function LocationGroupCard({
	groupId,
	locationName,
	streamCount,
	duplicateCandidates,
	canUseExistingMatch,
	mapBlockedReason,
	resolved,
	selected,
	onSelectedChange,
	onResolve,
	currentAction,
	children,
}: LocationGroupCardProps) {
	const hasCandidates = duplicateCandidates && duplicateCandidates.length > 0;
	const bestMatch = hasCandidates ? duplicateCandidates[0] : null;
	const candidateCount = duplicateCandidates?.length ?? 0;

	return (
		<Card
			className={cn(
				"transition-all duration-200",
				resolved &&
					selected &&
					"ring-1 ring-emerald-500/20 bg-emerald-500/[0.02]",
			)}
		>
			<CardHeader className="pb-3 space-y-3">
				{/* Header row */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div
							className={cn(
								"flex items-center justify-center rounded-full p-1",
								resolved ? "bg-emerald-500/10" : "bg-amber-500/10",
							)}
						>
							<MapPin
								className={cn(
									"h-3.5 w-3.5",
									resolved ? "text-emerald-400" : "text-amber-400",
								)}
							/>
						</div>
						<span className="text-sm font-medium">{locationName}</span>
						{streamCount != null && streamCount > 0 && (
							<span className="text-xs text-muted-foreground/60">
								· {streamCount} stream{streamCount === 1 ? "" : "s"}
							</span>
						)}
					</div>
					<div className="flex items-center gap-2">
						<Badge
							variant={resolved ? "default" : "secondary"}
							className={cn(
								"text-[10px] px-1.5 py-0",
								resolved && "bg-emerald-600/80 hover:bg-emerald-600/80",
							)}
						>
							{resolved ? (
								<>
									<Check className="h-2.5 w-2.5 mr-0.5" />
									Resolved
								</>
							) : (
								"Pending"
							)}
						</Badge>
						{resolved && (
							<button
								type="button"
								onClick={() => onSelectedChange(!selected)}
								className={cn(
									"flex items-center justify-center h-5 w-5 rounded border transition-colors",
									selected
										? "bg-emerald-600 border-emerald-600"
										: "border-muted-foreground/30 hover:border-emerald-500/50",
								)}
								aria-label={
									selected ? "Deselect group" : "Select group for finalize"
								}
							>
								{selected && <Check className="h-3 w-3 text-white" />}
							</button>
						)}
					</div>
				</div>

				{/* Duplicate context */}
				{!resolved && hasCandidates && (
					<div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 rounded-md px-2.5 py-1.5">
						<Link2 className="h-3 w-3 shrink-0" />
						<span>
							Possible match:{" "}
							<span className="font-medium text-foreground">
								{bestMatch?.name}
							</span>
							{candidateCount > 1 && (
								<span className="text-muted-foreground/60">
									{" "}
									+{candidateCount - 1} more
								</span>
							)}
						</span>
					</div>
				)}

				{!resolved && mapBlockedReason === "ambiguous" && (
					<div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-200">
						Multiple matches found — resolve manually or create new.
					</div>
				)}

				{/* Location resolver  */}
				{!resolved && (
					<RadioGroup
						value={currentAction ?? ""}
						onValueChange={(val) => onResolve(val as LocationAction)}
						className="flex flex-wrap gap-x-4 gap-y-1"
					>
						{canUseExistingMatch && (
							<div className="flex items-center gap-1.5">
								<RadioGroupItem value="map" id={`${groupId}-map`} />
								<Label
									htmlFor={`${groupId}-map`}
									className="text-xs font-normal cursor-pointer"
								>
									<Link2 className="h-3 w-3 inline mr-0.5 -mt-0.5" />
									Use existing match
								</Label>
							</div>
						)}
						<div className="flex items-center gap-1.5">
							<RadioGroupItem value="create" id={`${groupId}-create`} />
							<Label
								htmlFor={`${groupId}-create`}
								className="text-xs font-normal cursor-pointer"
							>
								<Plus className="h-3 w-3 inline mr-0.5 -mt-0.5" />
								Create new
							</Label>
						</div>
						<div className="flex items-center gap-1.5">
							<RadioGroupItem value="reject" id={`${groupId}-reject`} />
							<Label
								htmlFor={`${groupId}-reject`}
								className="text-xs font-normal cursor-pointer"
							>
								<X className="h-3 w-3 inline mr-0.5 -mt-0.5" />
								Reject
							</Label>
						</div>
					</RadioGroup>
				)}
			</CardHeader>
			<CardContent className="space-y-2 pt-0">{children}</CardContent>
		</Card>
	);
}
