"use client";

import { Check, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	type BulkImportItem,
	type BulkImportRun,
	bulkImportAPI,
} from "@/lib/api/bulk-import";
import { intakeAPI } from "@/lib/api/intake";
import type { VoiceInterviewTranscriptSegment } from "@/lib/api/voice-interviews";
import { voiceInterviewsApi } from "@/lib/api/voice-interviews";
import { EditItemDrawer } from "../bulk-import/edit-item-drawer";
import { OrphanStreamPicker } from "../shared/orphan-stream-picker";
import { type LocationAction, LocationGroupCard } from "./location-group-card";
import { StreamCard } from "./stream-card";
import { TranscriptPanel } from "./transcript-panel";
import {
	type MapBlockedReason,
	shouldBlockMapAction,
	shouldDisableFinalizeAction,
} from "./voice-review-guards";
import { VoiceSuccessScreen } from "./voice-success-screen";

interface VoiceReviewWorkspaceProps {
	run: BulkImportRun;
	voiceInterviewId: string;
	onRunUpdated: (run: BulkImportRun) => void;
	onDismiss: () => void;
	onDone: () => void;
	companyLocations?:
		| Array<{ id: string; name: string; city?: string | undefined }>
		| undefined;
}

interface VoiceGroup {
	groupId: string;
	items: BulkImportItem[];
}

export function getMapBlockedToast(reason: MapBlockedReason): string {
	if (reason === "ambiguous") {
		return "Multiple matches found. Choose Create new or resolve manually.";
	}
	return "No existing match found for this group.";
}

export async function applyVoiceGroupResolution(params: {
	items: BulkImportItem[];
	mode: LocationAction;
	patchItem: (
		item: BulkImportItem,
		action: "accept" | "reject",
		options?: { confirmCreateNew?: boolean },
	) => Promise<void>;
	onMapBlocked: (reason: MapBlockedReason) => void;
}): Promise<void> {
	const { items, mode, patchItem, onMapBlocked } = params;
	const pendingItems = items.filter((item) => item.status === "pending_review");
	if (pendingItems.length === 0) {
		return;
	}

	if (mode === "map") {
		const mapCheck = shouldBlockMapAction(items);
		if (mapCheck.blocked && mapCheck.reason) {
			onMapBlocked(mapCheck.reason);
			return;
		}
	}

	for (const item of pendingItems) {
		if (mode === "reject") {
			await patchItem(item, "reject");
			continue;
		}
		await patchItem(item, "accept", {
			confirmCreateNew: mode === "create",
		});
	}
}

/* ── Helpers ── */
/** Item was already imported in a previous finalize */
function _isAlreadyImported(item: BulkImportItem): boolean {
	return item.createdProjectId != null || item.createdLocationId != null;
}

function _isPending(item: BulkImportItem): boolean {
	return item.status === "pending_review";
}

function _isActionable(item: BulkImportItem): boolean {
	return item.status === "pending_review";
}

/**
 * Review-notes prefixes used by the backend.
 * Kept as constants so label logic doesn't depend on substring matching.
 */
const REVIEW_NOTE_MISSING_LOCATION = "Project row missing location context";
const REVIEW_NOTE_EXTERNAL_LOCATION =
	"Project row references external location";
const REVIEW_NOTE_INVALID_LOCATION =
	"Location items invalid for location entrypoint";

/** User-friendly status label mapping */
function _statusLabel(status: string, reviewNotes?: string | null): string {
	if (status === "invalid") {
		if (reviewNotes?.startsWith(REVIEW_NOTE_MISSING_LOCATION))
			return "Needs mapping";
		if (reviewNotes?.startsWith(REVIEW_NOTE_EXTERNAL_LOCATION))
			return "Wrong location";
		if (reviewNotes?.startsWith(REVIEW_NOTE_INVALID_LOCATION))
			return "Wrong location";
		return "Needs review";
	}
	switch (status) {
		case "pending_review":
			return "Pending";
		case "accepted":
			return "Accepted";
		case "amended":
			return "Amended";
		case "rejected":
			return "Rejected";
		default:
			return status;
	}
}

function _itemName(item: BulkImportItem): string {
	const raw = item.normalizedData.name;
	return typeof raw === "string" && raw.trim().length > 0
		? raw
		: item.itemType === "location"
			? "Location"
			: "Waste stream";
}

function _groupLocationName(group: VoiceGroup): string {
	// 1) Try the actual location item
	const loc = group.items.find((i) => i.itemType === "location");
	if (loc) return _itemName(loc);

	// 2) Try location_ref / stream_location_ref from the first project item
	const firstProject = group.items.find(
		(i) => i.itemType === "project" || i.itemType !== "location",
	);
	if (firstProject) {
		const locRef =
			firstProject.extractedData.stream_location_ref ??
			firstProject.extractedData.location_ref ??
			firstProject.normalizedData.location_ref;
		if (typeof locRef === "string" && locRef.trim().length > 0) {
			return locRef;
		}
	}

	// 3) Try first item name as last resort
	const firstItem = group.items[0];
	if (firstItem) {
		const name = _itemName(firstItem);
		if (name !== "Waste stream" && name !== "Location")
			return `Location — ${name}`;
	}

	// 4) Fallback: "Group N" instead of raw hash
	return "Location group";
}

function _evidenceNum(item: BulkImportItem, key: string): number | null {
	const val = item.extractedData[key];
	if (typeof val === "number") return val;
	if (typeof val === "string" && val.trim().length > 0) {
		const n = Number(val);
		if (Number.isFinite(n)) return n;
	}
	return null;
}

function _confidence(item: BulkImportItem): number | undefined {
	// Prefer top-level confidence field (set by the service)
	if (typeof item.confidence === "number") return item.confidence / 100;
	// Fallback to extracted data
	const c = item.extractedData.item_confidence;
	if (typeof c === "number") return c;
	return undefined;
}

/* ── Media query hook ── */
function useIsDesktop(): boolean {
	const [isDesktop, setIsDesktop] = useState(false);
	useEffect(() => {
		const mql = window.matchMedia("(min-width: 1024px)");
		setIsDesktop(mql.matches);
		const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
		mql.addEventListener("change", handler);
		return () => mql.removeEventListener("change", handler);
	}, []);
	return isDesktop;
}

/* ── Main Component ── */
export function VoiceReviewWorkspace({
	run,
	voiceInterviewId,
	onRunUpdated,
	onDismiss,
	onDone,
	companyLocations,
}: VoiceReviewWorkspaceProps) {
	const isDesktop = useIsDesktop();

	const [loading, setLoading] = useState(true);
	const [orphansDismissed, setOrphansDismissed] = useState(false);
	const [editingItem, setEditingItem] = useState<BulkImportItem | null>(null);
	const [items, setItems] = useState<BulkImportItem[]>([]);
	const [transcriptText, setTranscriptText] = useState("");
	const [segments, setSegments] = useState<VoiceInterviewTranscriptSegment[]>(
		[],
	);
	const [audioUrl, setAudioUrl] = useState<string | null>(null);
	const [selectedResolvedGroupIds, setSelectedResolvedGroupIds] = useState<
		Set<string>
	>(new Set());
	const [finalizing, setFinalizing] = useState(false);
	const [seekToSec, setSeekToSec] = useState<number | null>(null);
	const [success, setSuccess] = useState<{
		created: number;
		pending: number;
	} | null>(null);
	const [successTargetProjectId, setSuccessTargetProjectId] = useState<
		string | null
	>(null);

	/* ── Load data ── */
	const loadItems = useCallback(async (): Promise<BulkImportItem[]> => {
		const first = await bulkImportAPI.listItems(run.id, 1);
		let allItems = first.items;
		if (first.pages > 1) {
			const rest = await Promise.all(
				Array.from({ length: first.pages - 1 }, (_, index) =>
					bulkImportAPI.listItems(run.id, index + 2),
				),
			);
			for (const page of rest) {
				allItems = allItems.concat(page.items);
			}
		}
		setItems(allItems);
		return allItems;
	}, [run.id]);

	useEffect(() => {
		let cancelled = false;
		async function load() {
			setLoading(true);
			try {
				const [transcript, audio] = await Promise.all([
					voiceInterviewsApi.getTranscript(voiceInterviewId),
					voiceInterviewsApi.getAudioUrl(voiceInterviewId),
				]);
				if (cancelled) return;
				setTranscriptText(transcript.transcriptText);
				setSegments(transcript.segments ?? []);
				setAudioUrl(audio.audioUrl);
				await loadItems();
			} catch (error) {
				if (!cancelled) {
					toast.error(
						error instanceof Error
							? error.message
							: "Could not load voice review",
					);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		void load();
		return () => {
			cancelled = true;
		};
	}, [voiceInterviewId, loadItems]);

	/* ── Derived state ── */
	const groups = useMemo<VoiceGroup[]>(() => {
		const byGroup = new Map<string, BulkImportItem[]>();
		for (const item of items) {
			if (!item.groupId) continue;
			const arr = byGroup.get(item.groupId);
			if (arr) {
				arr.push(item);
			} else {
				byGroup.set(item.groupId, [item]);
			}
		}
		return Array.from(byGroup.entries()).map(([groupId, groupedItems]) => ({
			groupId,
			items: groupedItems,
		}));
	}, [items]);

	/** Groups that are fully imported (all items have createdProject/LocationId) */
	const pendingGroups = useMemo(
		() => groups.filter((g) => !g.items.every(_isAlreadyImported)),
		[groups],
	);
	const importedGroups = useMemo(
		() => groups.filter((g) => g.items.every(_isAlreadyImported)),
		[groups],
	);

	const resolvedGroupIds = useMemo(
		() =>
			pendingGroups
				.filter((g) => g.items.every((i) => !_isPending(i)))
				.map((g) => g.groupId),
		[pendingGroups],
	);

	useEffect(() => {
		setSelectedResolvedGroupIds(new Set(resolvedGroupIds));
	}, [resolvedGroupIds]);

	const resolvedCount = resolvedGroupIds.length;
	const totalGroups = pendingGroups.length;

	/* ── Actions ── */
	const setItemAction = useCallback(
		async (
			item: BulkImportItem,
			action: "accept" | "reject" | "amend" | "reset",
			options?: {
				confirmCreateNew?: boolean;
				normalizedData?: Record<string, unknown>;
			},
		) => {
			const updated = await bulkImportAPI.patchItem(item.id, action, options);
			setItems((prev) =>
				prev.map((entry) => (entry.id === updated.id ? updated : entry)),
			);
		},
		[],
	);

	const resolveGroup = useCallback(
		async (group: VoiceGroup, mode: LocationAction) => {
			await applyVoiceGroupResolution({
				items: group.items,
				mode,
				patchItem: setItemAction,
				onMapBlocked: (reason) => {
					toast.error(getMapBlockedToast(reason));
				},
			});
		},
		[setItemAction],
	);

	const finalizeSelected = useCallback(async () => {
		if (totalGroups > 0 && selectedResolvedGroupIds.size === 0) {
			toast.error("Select at least one resolved group");
			return;
		}
		const selectedGroupIds = Array.from(selectedResolvedGroupIds.values());
		setFinalizing(true);
		try {
			const closeReason = totalGroups === 0 ? "empty_extraction" : undefined;
			const response = await bulkImportAPI.finalize(run.id, {
				resolvedGroupIds: selectedGroupIds,
				idempotencyKey: crypto.randomUUID(),
				...(closeReason ? { closeReason } : {}),
			});

			const updatedRun = await bulkImportAPI.getRun(run.id);
			onRunUpdated(updatedRun);
			const refreshedItems = await loadItems();

			if (updatedRun.status !== "completed") {
				toast.success("Resolved groups finalized. Unresolved groups remain.");
				return;
			}

			const createdProjectIds = refreshedItems
				.filter(
					(item) =>
						item.itemType === "project" &&
						item.createdProjectId &&
						item.groupId &&
						selectedGroupIds.includes(item.groupId),
				)
				.map((item) => item.createdProjectId)
				.filter((id): id is string => typeof id === "string");

			let pendingSuggestions = 0;
			let targetProjectId: string | null = createdProjectIds[0] ?? null;
			for (const projectId of createdProjectIds) {
				const hydrate = await intakeAPI.hydrate(projectId);
				const projectPending = hydrate.suggestions.filter(
					(s) => s.status === "pending",
				).length;
				pendingSuggestions += projectPending;
				if (projectPending > 0 && targetProjectId === null) {
					targetProjectId = projectId;
				}
			}

			setSuccess({
				created: response.summary.projectsCreated,
				pending: pendingSuggestions,
			});
			setSuccessTargetProjectId(targetProjectId);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Finalize failed");
		} finally {
			setFinalizing(false);
		}
	}, [totalGroups, loadItems, onRunUpdated, run.id, selectedResolvedGroupIds]);

	/* ── Success screen ── */
	if (success) {
		return (
			<VoiceSuccessScreen
				createdStreams={success.created}
				pendingSuggestions={success.pending}
				targetProjectId={successTargetProjectId}
				onReviewSuggestions={() => {
					if (successTargetProjectId) {
						window.location.href = `/project/${successTargetProjectId}?tab=technical`;
					}
				}}
				onClose={onDone}
			/>
		);
	}

	/* ── Loading ── */
	if (loading) {
		return (
			<div className="rounded-xl border bg-background">
				<div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
					<div className="h-5 w-40 bg-muted rounded animate-pulse" />
				</div>
				<div className="space-y-3 p-4">
					{[1, 2, 3].map((i) => (
						<div
							key={i}
							className="rounded-lg border p-4 space-y-3 animate-pulse"
						>
							<div className="flex items-center gap-2">
								<div className="h-6 w-6 rounded-full bg-muted" />
								<div className="h-4 w-48 bg-muted rounded" />
								<div className="ml-auto h-4 w-16 bg-muted rounded" />
							</div>
							<div className="space-y-2">
								<div className="h-14 bg-muted rounded" />
								<div className="h-14 bg-muted rounded" />
							</div>
						</div>
					))}
				</div>
			</div>
		);
	}

	/* ── Shared content builders ── */
	const transcriptContent = (
		<TranscriptPanel
			segments={segments}
			transcriptText={transcriptText}
			audioUrl={audioUrl}
			seekToSec={seekToSec}
			onSeekHandled={() => setSeekToSec(null)}
		/>
	);

	const extractedContent = (
		<ScrollArea className="flex-1 min-h-0">
			<div className="space-y-3 p-4">
				{pendingGroups.length === 0 && importedGroups.length === 0 && (
					<div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
						<p className="text-sm text-muted-foreground">
							No items were extracted from this interview.
						</p>
						<p className="text-xs text-muted-foreground/60">
							You can close this as finalized or retry extraction.
						</p>
					</div>
				)}
				{pendingGroups.map((group) => {
					const resolved = group.items.every((i) => !_isPending(i));
					const mapBlock = shouldBlockMapAction(group.items);
					return (
						<LocationGroupCard
							key={group.groupId}
							groupId={group.groupId}
							locationName={_groupLocationName(group)}
							streamCount={
								group.items.filter((i) => i.itemType !== "location").length
							}
							duplicateCandidates={
								group.items
									.find((i) => i.itemType === "location")
									?.duplicateCandidates?.map((c) => ({
										id: c.id,
										name: c.name,
									})) ?? undefined
							}
							canUseExistingMatch={!mapBlock.blocked}
							mapBlockedReason={mapBlock.reason}
							resolved={resolved}
							selected={selectedResolvedGroupIds.has(group.groupId)}
							onSelectedChange={(sel) => {
								setSelectedResolvedGroupIds((prev) => {
									const next = new Set(prev);
									if (sel) next.add(group.groupId);
									else next.delete(group.groupId);
									return next;
								});
							}}
							onResolve={(action) => void resolveGroup(group, action)}
						>
							{group.items
								.filter((item) => item.itemType !== "location")
								.map((item) => {
									const start = _evidenceNum(item, "start_sec");
									const end = _evidenceNum(item, "end_sec");
									return (
										<StreamCard
											key={item.id}
											name={_itemName(item)}
											category={String(item.normalizedData.category ?? "")}
											status={item.status}
											statusLabel={_statusLabel(item.status, item.reviewNotes)}
											reviewNotes={item.reviewNotes ?? undefined}
											confidence={_confidence(item)}
											evidenceQuote={
												typeof item.extractedData.quote === "string"
													? item.extractedData.quote
													: undefined
											}
											evidenceStartSec={start}
											evidenceEndSec={end}
											onPlayEvidence={(sec) => setSeekToSec(sec)}
											isPending={_isPending(item)}
											itemType={item.itemType as "location" | "project"}
											onEdit={() => setEditingItem(item)}
											onAccept={() =>
												void setItemAction(item, "accept", {
													confirmCreateNew: false,
												})
											}
											onReject={() => {
												const name = _itemName(item);
												setItemAction(item, "reject")
													.then(() => {
														toast(`"${name}" rejected`, {
															action: {
																label: "Undo",
																onClick: () =>
																	void setItemAction(item, "reset"),
															},
															duration: 5000,
														});
													})
													.catch(() =>
														toast.error(`Failed to reject "${name}"`),
													);
											}}
										/>
									);
								})}
						</LocationGroupCard>
					);
				})}
			</div>

			{/* Orphan streams — items with no location match */}
			{(() => {
				const unresolvedItems = items.filter(
					(i) =>
						i.status === "invalid" &&
						i.reviewNotes?.startsWith(REVIEW_NOTE_MISSING_LOCATION),
				);
				if (
					unresolvedItems.length > 0 &&
					companyLocations &&
					companyLocations.length > 0 &&
					!orphansDismissed
				) {
					return (
						<div className="px-4 pb-4">
							<OrphanStreamPicker
								orphanItems={unresolvedItems}
								sourceLabel="Voice interview"
								locations={companyLocations}
								onAssign={async (locationId, locationName, itemIds) => {
									await bulkImportAPI.importOrphanProjects(
										run.id,
										locationId,
										itemIds,
									);
									toast.success(
										`${itemIds.length} stream${itemIds.length === 1 ? "" : "s"} imported to "${locationName}"`,
									);
									const updatedRun = await bulkImportAPI.getRun(run.id);
									onRunUpdated(updatedRun);
									await loadItems();
								}}
								onDismiss={() => setOrphansDismissed(true)}
							/>
						</div>
					);
				}
				return null;
			})()}
			{/* Already imported groups (read-only, collapsed) */}
			{importedGroups.length > 0 && (
				<div className="px-4 pb-4">
					<details className="group">
						<summary className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors py-2">
							<Check className="h-3 w-3" />
							{importedGroups.length} group
							{importedGroups.length === 1 ? "" : "s"} already imported
						</summary>
						<div className="space-y-2 pt-1 opacity-50">
							{importedGroups.map((group) => (
								<div
									key={group.groupId}
									className="rounded-lg border border-emerald-500/10 bg-emerald-500/[0.02] p-3"
								>
									<div className="flex items-center justify-between">
										<span className="text-sm font-medium">
											{_groupLocationName(group)}
										</span>
										<Badge
											variant="default"
											className="text-[10px] px-1.5 py-0 bg-emerald-600/80"
										>
											<Check className="h-2.5 w-2.5 mr-0.5" />
											Imported
										</Badge>
									</div>
									<p className="text-xs text-muted-foreground mt-1">
										{
											group.items.filter((i) => i.itemType !== "location")
												.length
										}{" "}
										stream
										{group.items.filter((i) => i.itemType !== "location")
											.length === 1
											? ""
											: "s"}
									</p>
								</div>
							))}
						</div>
					</details>
				</div>
			)}
		</ScrollArea>
	);

	const finalizeBar = (
		<div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
			<div className="flex items-center gap-2">
				<Badge
					variant="outline"
					className="text-xs border-emerald-500/30 text-emerald-400"
				>
					{selectedResolvedGroupIds.size}
				</Badge>
				<span className="text-sm text-muted-foreground">
					resolved group{selectedResolvedGroupIds.size === 1 ? "" : "s"}{" "}
					selected
				</span>
			</div>
			<Button
				onClick={() => void finalizeSelected()}
				disabled={shouldDisableFinalizeAction({
					groupsCount: totalGroups,
					selectedResolvedCount: selectedResolvedGroupIds.size,
					finalizing,
				})}
				className="bg-emerald-600 hover:bg-emerald-700 text-white"
			>
				{finalizing ? (
					<>
						<Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
						Finalizing…
					</>
				) : (
					"Finalize resolved groups"
				)}
			</Button>
		</div>
	);

	/* ── Header ── */
	const header = (
		<div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
			<div className="flex items-center gap-2">
				<div className="flex items-center justify-center rounded-full bg-emerald-500/10 p-1.5">
					<svg
						className="h-3.5 w-3.5 text-emerald-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={2}
					>
						<title>Voice review</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
						/>
					</svg>
				</div>
				<h3 className="text-sm font-semibold">Voice Review</h3>
				<Badge variant="outline" className="text-[10px] ml-1">
					{resolvedCount}/{totalGroups} resolved
				</Badge>
			</div>
			<Button
				variant="ghost"
				size="icon"
				className="h-7 w-7"
				onClick={onDismiss}
				aria-label="Close voice review"
				title="Close voice review"
			>
				<X className="h-4 w-4" />
			</Button>
		</div>
	);

	/* ── Edit Item Drawer ── */
	const editDrawer = (
		<EditItemDrawer
			item={editingItem}
			open={editingItem !== null}
			onOpenChange={(open) => {
				if (!open) setEditingItem(null);
			}}
			onSaved={(updated) => {
				setItems((prev) =>
					prev.map((entry) => (entry.id === updated.id ? updated : entry)),
				);
			}}
		/>
	);

	/* ── Desktop: Split Panel ── */
	if (isDesktop) {
		return (
			<div className="rounded-xl border overflow-hidden bg-background">
				{header}
				<div style={{ height: "calc(100vh - 280px)", minHeight: 480 }}>
					<ResizablePanelGroup direction="horizontal">
						<ResizablePanel defaultSize={40} minSize={25}>
							{transcriptContent}
						</ResizablePanel>
						<ResizableHandle withHandle />
						<ResizablePanel defaultSize={60} minSize={35}>
							<div className="flex flex-col h-full">
								<div className="px-4 py-2 border-b border-border/30">
									<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
										Extracted Data
									</p>
								</div>
								{extractedContent}
								<div className="border-t border-border/50 p-3">
									{finalizeBar}
								</div>
							</div>
						</ResizablePanel>
					</ResizablePanelGroup>
				</div>
				{editDrawer}
			</div>
		);
	}

	/* ── Mobile: Tabs ── */
	return (
		<div className="rounded-xl border overflow-hidden bg-background">
			{header}
			<Tabs defaultValue="extracted" className="w-full">
				<div className="px-4 pt-2">
					<TabsList className="w-full">
						<TabsTrigger value="extracted" className="flex-1">
							Extracted
						</TabsTrigger>
						<TabsTrigger value="transcript" className="flex-1">
							Transcript
						</TabsTrigger>
					</TabsList>
				</div>
				<TabsContent
					value="extracted"
					className="mt-0"
					style={{ minHeight: 300 }}
				>
					{extractedContent}
					<div className="p-3 border-t border-border/50">{finalizeBar}</div>
				</TabsContent>
				<TabsContent
					value="transcript"
					className="mt-0"
					style={{ minHeight: 300 }}
				>
					{transcriptContent}
				</TabsContent>
			</Tabs>
			{editDrawer}
		</div>
	);
}
