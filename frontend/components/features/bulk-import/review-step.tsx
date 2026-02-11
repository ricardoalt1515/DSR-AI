"use client";

/**
 * Review step — table grouped by location with accept/edit/reject actions,
 * confidence badges, duplicate warnings, and filter tabs.
 */

import {
	AlertTriangle,
	Check,
	ChevronDown,
	ChevronRight,
	Edit3,
	Loader2,
	MapPin,
	RotateCcw,
	Sparkles,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
	BulkImportItem,
	BulkImportRun,
	ItemAction,
	ItemStatus,
} from "@/lib/api/bulk-import";
import { BULK_IMPORT_PAGE_SIZE, bulkImportAPI } from "@/lib/api/bulk-import";
import { EditItemDrawer } from "./edit-item-drawer";

interface ReviewStepProps {
	runId: string;
	run: BulkImportRun;
	onFinalize: () => void;
	onRunUpdated: (run: BulkImportRun) => void;
}

type FilterTab = "all" | ItemStatus;

const FILTER_TABS: { key: FilterTab; label: string }[] = [
	{ key: "all", label: "All" },
	{ key: "pending_review", label: "Pending" },
	{ key: "accepted", label: "Accepted" },
	{ key: "amended", label: "Amended" },
	{ key: "rejected", label: "Rejected" },
	{ key: "invalid", label: "Invalid" },
];

const DUPLICATE_CONFIRM_PERSIST_ACTION_BY_STATUS: Partial<
	Record<ItemStatus, ItemAction>
> = {
	accepted: "accept",
	amended: "amend",
	rejected: "reject",
};

function getErrorCode(error: unknown): string | undefined {
	if (typeof error !== "object" || error === null || !("code" in error)) {
		return undefined;
	}
	const { code } = error;
	return typeof code === "string" ? code : undefined;
}

function getErrorMessage(error: unknown): string | undefined {
	if (typeof error !== "object" || error === null || !("message" in error)) {
		return undefined;
	}
	const { message } = error;
	return typeof message === "string" ? message : undefined;
}

export function ReviewStep({
	runId,
	run,
	onFinalize,
	onRunUpdated,
}: ReviewStepProps) {
	const [items, setItems] = useState<BulkImportItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState<FilterTab>("all");
	const [editingItem, setEditingItem] = useState<BulkImportItem | null>(null);
	const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
	const [collapsedLocations, setCollapsedLocations] = useState<Set<string>>(
		new Set(),
	);
	const [finalizing, setFinalizing] = useState(false);
	const loadItemsRequestIdRef = useRef(0);

	const fetchAllItems = useCallback(
		async (status?: ItemStatus): Promise<BulkImportItem[]> => {
			const firstPage = await bulkImportAPI.listItems(
				runId,
				1,
				BULK_IMPORT_PAGE_SIZE,
				status,
			);
			const allItems = [...firstPage.items];

			for (let page = 2; page <= firstPage.pages; page += 1) {
				const nextPage = await bulkImportAPI.listItems(
					runId,
					page,
					BULK_IMPORT_PAGE_SIZE,
					status,
				);
				allItems.push(...nextPage.items);
			}

			return allItems;
		},
		[runId],
	);

	const loadItems = useCallback(async () => {
		loadItemsRequestIdRef.current += 1;
		const requestId = loadItemsRequestIdRef.current;
		setLoading(true);
		try {
			const statusFilter = filter === "all" ? undefined : filter;
			const allItems = await fetchAllItems(statusFilter);

			if (loadItemsRequestIdRef.current === requestId) {
				setItems(allItems);
			}
		} catch (error) {
			if (loadItemsRequestIdRef.current !== requestId) {
				return;
			}
			if (getErrorCode(error) === "HTTP_422") {
				toast.error("Invalid review query. Please refresh and try again.");
			} else {
				toast.error("Failed to load items");
			}
		} finally {
			if (loadItemsRequestIdRef.current === requestId) {
				setLoading(false);
			}
		}
	}, [fetchAllItems, filter]);

	const refreshRun = useCallback(async () => {
		try {
			const updated = await bulkImportAPI.getRun(runId);
			onRunUpdated(updated);
		} catch {
			// silently fail
		}
	}, [runId, onRunUpdated]);

	useEffect(() => {
		void loadItems();
	}, [loadItems]);

	// Group items: locations as headers, projects as children
	const grouped = useMemo(() => {
		const locationItems = items.filter((i) => i.itemType === "location");
		const projectItems = items.filter((i) => i.itemType === "project");

		// Group projects under their parent location
		const groups: { location: BulkImportItem; projects: BulkImportItem[] }[] =
			[];
		const orphanProjects: BulkImportItem[] = [];

		for (const loc of locationItems) {
			groups.push({
				location: loc,
				projects: projectItems.filter((p) => p.parentItemId === loc.id),
			});
		}

		// Projects without a parent location
		const assignedProjectIds = new Set(
			groups.flatMap((g) => g.projects.map((p) => p.id)),
		);
		for (const proj of projectItems) {
			if (!assignedProjectIds.has(proj.id)) {
				orphanProjects.push(proj);
			}
		}

		return { groups, orphanProjects };
	}, [items]);

	const handleAction = useCallback(
		async (item: BulkImportItem, action: "accept" | "reject" | "reset") => {
			// Check for duplicate requiring confirmation
			if (
				action === "accept" &&
				item.duplicateCandidates &&
				item.duplicateCandidates.length > 0 &&
				!item.confirmCreateNew
			) {
				toast.error("Duplicate detected", {
					description:
						"Please confirm you want to create a new entry by checking the confirmation box.",
				});
				return;
			}

			setActionLoadingId(item.id);
			try {
				const updated = await bulkImportAPI.patchItem(
					item.id,
					action,
					action === "accept"
						? { confirmCreateNew: item.confirmCreateNew }
						: undefined,
				);
				setItems((prev) =>
					prev.map((i) => (i.id === updated.id ? updated : i)),
				);
				// If location is rejected, reload all items (cascade rejection)
				if (item.itemType === "location" && action === "reject") {
					await loadItems();
				}
				await refreshRun();
			} catch (error) {
				toast.error(error instanceof Error ? error.message : "Action failed");
			} finally {
				setActionLoadingId(null);
			}
		},
		[loadItems, refreshRun],
	);

	const handleConfirmCreateNew = useCallback(
		async (item: BulkImportItem, confirmed: boolean) => {
			setItems((prev) =>
				prev.map((i) =>
					i.id === item.id ? { ...i, confirmCreateNew: confirmed } : i,
				),
			);

			const persistAction =
				DUPLICATE_CONFIRM_PERSIST_ACTION_BY_STATUS[item.status];
			if (!persistAction) {
				return;
			}

			setActionLoadingId(item.id);
			try {
				const patchOptions: {
					confirmCreateNew: boolean;
					normalizedData?: Record<string, unknown>;
				} = {
					confirmCreateNew: confirmed,
				};
				if (item.status === "amended") {
					patchOptions.normalizedData = item.normalizedData;
				}

				const updated = await bulkImportAPI.patchItem(
					item.id,
					persistAction,
					patchOptions,
				);
				setItems((prev) =>
					prev.map((i) => (i.id === updated.id ? updated : i)),
				);
				await refreshRun();
			} catch (error) {
				setItems((prev) =>
					prev.map((i) =>
						i.id === item.id
							? { ...i, confirmCreateNew: item.confirmCreateNew }
							: i,
					),
				);
				toast.error(
					error instanceof Error ? error.message : "Failed to confirm",
				);
			} finally {
				setActionLoadingId(null);
			}
		},
		[refreshRun],
	);

	const handleItemSaved = useCallback(
		(updated: BulkImportItem) => {
			setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
			void refreshRun();
		},
		[refreshRun],
	);

	const toggleLocationCollapse = useCallback((locationId: string) => {
		setCollapsedLocations((prev) => {
			const next = new Set(prev);
			if (next.has(locationId)) {
				next.delete(locationId);
			} else {
				next.add(locationId);
			}
			return next;
		});
	}, []);

	const handleFinalize = useCallback(async () => {
		setFinalizing(true);
		try {
			const allRunItems = await fetchAllItems();
			const reviewBlockers = allRunItems.filter(
				(item) =>
					(item.status === "accepted" || item.status === "amended") &&
					item.needsReview,
			).length;

			if (reviewBlockers > 0) {
				toast.error(
					`${reviewBlockers} accepted/amended item(s) still need review. Edit or reject them before finalizing.`,
				);
				return;
			}

			await bulkImportAPI.finalize(runId);
			toast.success("Import finalized successfully!");
			onFinalize();
		} catch (error) {
			const errorCode = getErrorCode(error);
			const errorMessage = getErrorMessage(error)?.toLowerCase() ?? "";
			if (
				errorCode === "HTTP_409" &&
				(errorMessage.includes("still needs review") ||
					errorMessage.includes("pending_review"))
			) {
				toast.error(
					"Some accepted/amended items still need review. Edit or reject them before finalizing.",
				);
			} else {
				toast.error(
					error instanceof Error ? error.message : "Finalization failed",
				);
			}
		} finally {
			setFinalizing(false);
		}
	}, [fetchAllItems, runId, onFinalize]);

	const pendingCount =
		run.totalItems -
		run.acceptedCount -
		run.rejectedCount -
		run.amendedCount -
		run.invalidCount;
	const hasPending = pendingCount > 0;
	const hasAcceptedOrAmended = run.acceptedCount + run.amendedCount > 0;
	const reviewBlockersInView = items.filter(
		(item) =>
			(item.status === "accepted" || item.status === "amended") &&
			item.needsReview,
	).length;

	return (
		<div className="space-y-6">
			{/* Info banner */}
			<Alert className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30">
				<Sparkles className="h-4 w-4 text-blue-600" />
				<AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
					<strong>Accept</strong> does not create anything yet. Entities are
					only created when you click <strong>Finalize Import</strong>.
				</AlertDescription>
			</Alert>

			{/* Counters */}
			<div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
				<CounterBadge label="Total" count={run.totalItems} variant="default" />
				<CounterBadge
					label="Accepted"
					count={run.acceptedCount + run.amendedCount}
					variant="success"
				/>
				<CounterBadge label="Pending" count={pendingCount} variant="warning" />
				<CounterBadge
					label="Rejected"
					count={run.rejectedCount}
					variant="destructive"
				/>
				<CounterBadge
					label="Invalid"
					count={run.invalidCount}
					variant="muted"
				/>
			</div>

			{/* Filter tabs */}
			<div className="flex gap-1 border-b overflow-x-auto pb-px">
				{FILTER_TABS.map((tab) => (
					<button
						key={tab.key}
						type="button"
						onClick={() => setFilter(tab.key)}
						className={`
							px-3 py-2 text-sm font-medium rounded-t-md transition-colors whitespace-nowrap
							${
								filter === tab.key
									? "border-b-2 border-primary text-primary"
									: "text-muted-foreground hover:text-foreground"
							}
						`}
					>
						{tab.label}
					</button>
				))}
			</div>

			{/* Items */}
			{loading ? (
				<div className="flex items-center justify-center py-12">
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				</div>
			) : items.length === 0 ? (
				<div className="text-center py-12 text-muted-foreground">
					No items match the current filter.
				</div>
			) : (
				<div className="space-y-4">
					{grouped.groups.map(({ location, projects }) => (
						<LocationGroup
							key={location.id}
							location={location}
							projects={projects}
							collapsed={collapsedLocations.has(location.id)}
							onToggleCollapse={() => toggleLocationCollapse(location.id)}
							onAction={handleAction}
							onEdit={(item) => setEditingItem(item)}
							onConfirmCreateNew={handleConfirmCreateNew}
							actionLoadingId={actionLoadingId}
						/>
					))}
					{grouped.orphanProjects.length > 0 && (
						<Card>
							<CardHeader>
								<div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
									<MapPin className="h-4 w-4" />
									Standalone Waste Streams
								</div>
							</CardHeader>
							<CardContent className="space-y-2">
								{grouped.orphanProjects.map((project) => (
									<ItemRow
										key={project.id}
										item={project}
										onAction={handleAction}
										onEdit={() => setEditingItem(project)}
										onConfirmCreateNew={handleConfirmCreateNew}
										actionLoadingId={actionLoadingId}
									/>
								))}
							</CardContent>
						</Card>
					)}
				</div>
			)}

			{/* Finalize button */}
			<div className="flex flex-col items-center gap-3 pt-4 border-t">
				{hasPending && (
					<p className="text-sm text-amber-600">
						{pendingCount} item{pendingCount !== 1 ? "s" : ""} still pending
						review
					</p>
				)}
				<Button
					size="lg"
					disabled={
						hasPending ||
						!hasAcceptedOrAmended ||
						finalizing ||
						reviewBlockersInView > 0
					}
					onClick={handleFinalize}
					className="min-w-[220px]"
				>
					{finalizing ? (
						<>
							<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							Finalizing...
						</>
					) : (
						<>
							<Check className="h-4 w-4 mr-2" />
							Finalize Import
						</>
					)}
				</Button>
				{!hasAcceptedOrAmended && !hasPending && (
					<p className="text-sm text-muted-foreground">
						No items accepted. Accept at least one item to finalize.
					</p>
				)}
				{reviewBlockersInView > 0 && (
					<p className="text-sm text-amber-600">
						{reviewBlockersInView} accepted/amended item
						{reviewBlockersInView !== 1 ? "s" : ""} in this view still need
						review.
					</p>
				)}
			</div>

			{/* Edit drawer */}
			<EditItemDrawer
				item={editingItem}
				open={!!editingItem}
				onOpenChange={(open) => {
					if (!open) setEditingItem(null);
				}}
				onSaved={handleItemSaved}
			/>
		</div>
	);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUB-COMPONENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function CounterBadge({
	label,
	count,
	variant,
}: {
	label: string;
	count: number;
	variant: "default" | "success" | "warning" | "destructive" | "muted";
}) {
	const colors = {
		default: "bg-primary/10 text-primary border-primary/20",
		success:
			"bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
		warning:
			"bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
		destructive:
			"bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
		muted: "bg-muted text-muted-foreground border-muted",
	};

	return (
		<div className={`text-center p-3 rounded-lg border ${colors[variant]}`}>
			<p className="text-2xl font-bold">{count}</p>
			<p className="text-xs">{label}</p>
		</div>
	);
}

function LocationGroup({
	location,
	projects,
	collapsed,
	onToggleCollapse,
	onAction,
	onEdit,
	onConfirmCreateNew,
	actionLoadingId,
}: {
	location: BulkImportItem;
	projects: BulkImportItem[];
	collapsed: boolean;
	onToggleCollapse: () => void;
	onAction: (
		item: BulkImportItem,
		action: "accept" | "reject" | "reset",
	) => Promise<void>;
	onEdit: (item: BulkImportItem) => void;
	onConfirmCreateNew: (
		item: BulkImportItem,
		confirmed: boolean,
	) => Promise<void>;
	actionLoadingId: string | null;
}) {
	const locationName = String(
		location.normalizedData.name ?? "Unknown Location",
	);
	const city = String(location.normalizedData.city ?? "");
	const state = String(location.normalizedData.state ?? "");

	return (
		<Card className="overflow-hidden">
			{/* Location header */}
			<div
				className={`
					p-4 transition-colors
					hover:bg-muted/30
					${location.status === "rejected" ? "opacity-50" : ""}
				`}
			>
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={onToggleCollapse}
						className="flex min-w-0 flex-1 items-center gap-3 text-left"
					>
						{collapsed ? (
							<ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
						) : (
							<ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
						)}
						<MapPin className="h-4 w-4 text-primary flex-shrink-0" />
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2 flex-wrap">
								<span className="font-medium text-sm truncate">
									{locationName}
								</span>
								{city && state && (
									<span className="text-xs text-muted-foreground">
										{city}, {state}
									</span>
								)}
								<StatusBadge status={location.status} />
								<ConfidenceBadge confidence={location.confidence} />
								{location.needsReview && (
									<Badge
										variant="outline"
										className="text-xs border-amber-400 text-amber-600"
									>
										Needs Review
									</Badge>
								)}
							</div>
						</div>
					</button>
					{location.status !== "invalid" && (
						<div className="flex items-center gap-1">
							<ActionButtons
								item={location}
								onAction={onAction}
								onEdit={() => onEdit(location)}
								actionLoadingId={actionLoadingId}
							/>
						</div>
					)}
				</div>
				{location.duplicateCandidates &&
					location.duplicateCandidates.length > 0 && (
						<div className="mt-2 pl-7">
							<DuplicateWarning
								item={location}
								onConfirmCreateNew={onConfirmCreateNew}
								actionLoadingId={actionLoadingId}
							/>
						</div>
					)}
			</div>

			{/* Project children */}
			{!collapsed && projects.length > 0 && (
				<div className="border-t divide-y">
					{projects.map((project) => (
						<ItemRow
							key={project.id}
							item={project}
							onAction={onAction}
							onEdit={() => onEdit(project)}
							onConfirmCreateNew={onConfirmCreateNew}
							actionLoadingId={actionLoadingId}
							indented
						/>
					))}
				</div>
			)}
			{!collapsed && projects.length === 0 && (
				<div className="border-t p-4 text-center text-sm text-muted-foreground">
					No waste streams extracted for this location
				</div>
			)}
		</Card>
	);
}

function ItemRow({
	item,
	onAction,
	onEdit,
	onConfirmCreateNew,
	actionLoadingId,
	indented = false,
}: {
	item: BulkImportItem;
	onAction: (
		item: BulkImportItem,
		action: "accept" | "reject" | "reset",
	) => Promise<void>;
	onEdit: () => void;
	onConfirmCreateNew: (
		item: BulkImportItem,
		confirmed: boolean,
	) => Promise<void>;
	actionLoadingId: string | null;
	indented?: boolean;
}) {
	const name = String(item.normalizedData.name ?? "Unnamed");
	const category = String(item.normalizedData.category ?? "");
	const isInvalid = item.status === "invalid";
	const isRejected = item.status === "rejected";

	return (
		<div
			className={`
				flex items-center gap-3 p-3 transition-colors
				${indented ? "pl-12" : "px-4"}
				${isInvalid || isRejected ? "opacity-50 bg-muted/20" : "hover:bg-muted/20"}
			`}
		>
			<div className="flex-1 min-w-0 space-y-1">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="text-sm font-medium truncate">{name}</span>
					{category && (
						<Badge variant="secondary" className="text-xs capitalize">
							{category}
						</Badge>
					)}
					<StatusBadge status={item.status} />
					<ConfidenceBadge confidence={item.confidence} />
					{item.needsReview && (
						<Badge
							variant="outline"
							className="text-xs border-amber-400 text-amber-600"
						>
							Needs Review
						</Badge>
					)}
				</div>
				{item.duplicateCandidates && item.duplicateCandidates.length > 0 && (
					<DuplicateWarning
						item={item}
						onConfirmCreateNew={onConfirmCreateNew}
						actionLoadingId={actionLoadingId}
					/>
				)}
			</div>
			{!isInvalid && (
				<ActionButtons
					item={item}
					onAction={onAction}
					onEdit={onEdit}
					actionLoadingId={actionLoadingId}
				/>
			)}
		</div>
	);
}

function ActionButtons({
	item,
	onAction,
	onEdit,
	actionLoadingId,
}: {
	item: BulkImportItem;
	onAction: (
		item: BulkImportItem,
		action: "accept" | "reject" | "reset",
	) => Promise<void>;
	onEdit: () => void;
	actionLoadingId: string | null;
}) {
	const isLoading = actionLoadingId === item.id;
	const isPending = item.status === "pending_review";
	const isAccepted = item.status === "accepted" || item.status === "amended";

	return (
		<div className="flex items-center gap-1 flex-shrink-0">
			{isLoading ? (
				<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
			) : (
				<>
					{/* Accept */}
					{!isAccepted && (
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
									onClick={() => onAction(item, "accept")}
								>
									<Check className="h-3.5 w-3.5" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Accept</TooltipContent>
						</Tooltip>
					)}

					{/* Edit */}
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
								onClick={onEdit}
							>
								<Edit3 className="h-3.5 w-3.5" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Edit</TooltipContent>
					</Tooltip>

					{/* Reject */}
					{item.status !== "rejected" && (
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
									onClick={() => onAction(item, "reject")}
								>
									<X className="h-3.5 w-3.5" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Reject</TooltipContent>
						</Tooltip>
					)}

					{/* Reset */}
					{!isPending && (
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-7 w-7 text-muted-foreground hover:text-foreground"
									onClick={() => onAction(item, "reset")}
								>
									<RotateCcw className="h-3.5 w-3.5" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Reset to Pending</TooltipContent>
						</Tooltip>
					)}
				</>
			)}
		</div>
	);
}

function StatusBadge({ status }: { status: ItemStatus }) {
	const variants: Record<ItemStatus, { className: string; label: string }> = {
		pending_review: {
			className:
				"border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/30",
			label: "Pending",
		},
		accepted: {
			className:
				"border-emerald-400 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
			label: "Accepted",
		},
		amended: {
			className: "border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-950/30",
			label: "Amended",
		},
		rejected: {
			className: "border-red-400 text-red-600 bg-red-50 dark:bg-red-950/30",
			label: "Rejected",
		},
		invalid: {
			className: "border-gray-400 text-gray-500 bg-gray-50 dark:bg-gray-950/30",
			label: "Invalid",
		},
	};
	const v = variants[status];
	return (
		<Badge variant="outline" className={`text-xs ${v.className}`}>
			{v.label}
		</Badge>
	);
}

function ConfidenceBadge({ confidence }: { confidence: number | null }) {
	if (confidence === null || confidence === undefined) return null;

	let className = "";
	let label = "";
	if (confidence >= 80) {
		className =
			"bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400";
		label = "High";
	} else if (confidence >= 50) {
		className =
			"bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400";
		label = "Medium";
	} else {
		className = "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400";
		label = "Low";
	}

	return (
		<Tooltip>
			<TooltipTrigger>
				<span
					className={`inline-flex items-center text-xs px-1.5 py-0.5 rounded-md font-medium ${className}`}
				>
					{confidence}%
				</span>
			</TooltipTrigger>
			<TooltipContent>{label} confidence</TooltipContent>
		</Tooltip>
	);
}

function DuplicateWarning({
	item,
	onConfirmCreateNew,
	actionLoadingId,
}: {
	item: BulkImportItem;
	onConfirmCreateNew: (
		item: BulkImportItem,
		confirmed: boolean,
	) => Promise<void>;
	actionLoadingId: string | null;
}) {
	const candidates = item.duplicateCandidates;
	if (!candidates || candidates.length === 0) return null;
	const firstCandidate = candidates[0];
	if (!firstCandidate) return null;

	return (
		<div className="mt-1.5 p-2 rounded-md bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
			<div className="flex items-start gap-2">
				<AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
				<div className="flex-1 space-y-1">
					<p className="text-xs text-amber-700 dark:text-amber-400">
						Possible duplicate: <strong>{firstCandidate.name}</strong>
						{firstCandidate.reason && ` (${firstCandidate.reason})`}
					</p>
					<div className="flex items-center gap-2">
						<Checkbox
							id={`confirm-${item.id}`}
							checked={item.confirmCreateNew}
							disabled={actionLoadingId === item.id}
							onCheckedChange={(checked) => {
								void onConfirmCreateNew(item, Boolean(checked));
							}}
						/>
						<label
							htmlFor={`confirm-${item.id}`}
							className="text-xs text-amber-700 dark:text-amber-400 cursor-pointer"
						>
							Create as new entry anyway
						</label>
					</div>
				</div>
			</div>
		</div>
	);
}
