"use client";

import {
	Check,
	ChevronDown,
	ChevronUp,
	RefreshCw,
	RotateCcw,
	Search,
} from "lucide-react";
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	FEEDBACK_TYPE_CONFIG,
	type FeedbackItem,
	type FeedbackType,
	feedbackAPI,
	type ListFeedbackParams,
} from "@/lib/api/feedback";
import { useOrganizationStore } from "@/lib/stores/organization-store";
import { cn } from "@/lib/utils";

type DaysFilter = "7" | "30" | "all";
type StatusFilter = "all" | "open" | "resolved";

function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function truncate(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength)}...`;
}

export default function AdminFeedbackPage() {
	const { selectedOrgId } = useOrganizationStore();
	const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [actionLoading, setActionLoading] = useState<string | null>(null);
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");

	// Filters
	const [daysFilter, setDaysFilter] = useState<DaysFilter>("all");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [typeFilter, setTypeFilter] = useState<FeedbackType | "all">("all");

	const requestIdRef = useRef(0);

	const loadFeedback = useCallback(async () => {
		const requestId = ++requestIdRef.current;

		if (!selectedOrgId) {
			setFeedback([]);
			setLoading(false);
			return;
		}

		setLoading(true);
		try {
			const params: ListFeedbackParams = {
				limit: 100,
				...(daysFilter !== "all" && { days: Number(daysFilter) as 7 | 30 }),
				...(statusFilter !== "all" && {
					resolved: statusFilter === "resolved",
				}),
				...(typeFilter !== "all" && { feedbackType: typeFilter }),
			};
			const data = await feedbackAPI.list(params);
			if (requestId !== requestIdRef.current) return;
			setFeedback(data);
		} catch (_error) {
			if (requestId !== requestIdRef.current) return;
			toast.error("Failed to load feedback");
		} finally {
			if (requestId === requestIdRef.current) {
				setLoading(false);
			}
		}
	}, [selectedOrgId, daysFilter, statusFilter, typeFilter]);

	useEffect(() => {
		loadFeedback();
	}, [loadFeedback]);

	/** Consolidated handler for resolve/reopen actions */
	const handleToggleResolved = useCallback(
		async (id: string, resolve: boolean) => {
			setActionLoading(id);
			try {
				const updated = resolve
					? await feedbackAPI.resolve(id)
					: await feedbackAPI.reopen(id);
				setFeedback((prev) =>
					prev.map((item) => (item.id === id ? updated : item)),
				);
				toast.success(
					resolve ? "Feedback marked as resolved" : "Feedback reopened",
				);
			} catch {
				toast.error(
					resolve ? "Failed to resolve feedback" : "Failed to reopen feedback",
				);
			} finally {
				setActionLoading(null);
			}
		},
		[],
	);

	/** Filter feedback by search query (content only) */
	const filteredFeedback = useMemo(() => {
		if (!searchQuery.trim()) return feedback;
		const query = searchQuery.toLowerCase();
		return feedback.filter((item) =>
			item.content.toLowerCase().includes(query),
		);
	}, [feedback, searchQuery]);

	if (!selectedOrgId) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center space-y-2">
					<p className="text-muted-foreground">
						Select an organization to view feedback
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">User Feedback</h1>
					<p className="text-sm text-muted-foreground">
						Review and manage user feedback
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={loadFeedback}
					disabled={loading}
				>
					<RefreshCw
						className={cn("h-4 w-4 mr-2", loading && "animate-spin")}
					/>
					Refresh
				</Button>
			</div>

			{/* Search */}
			<div className="relative">
				<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder="Search feedback content..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="pl-9"
					aria-label="Search feedback"
				/>
			</div>

			<Card>
				<CardHeader className="pb-4">
					<div className="flex flex-wrap items-center gap-3">
						<Select
							value={daysFilter}
							onValueChange={(v) => setDaysFilter(v as DaysFilter)}
						>
							<SelectTrigger className="w-[140px]">
								<SelectValue placeholder="Time range" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="7">Last 7 days</SelectItem>
								<SelectItem value="30">Last 30 days</SelectItem>
								<SelectItem value="all">All time</SelectItem>
							</SelectContent>
						</Select>

						<Select
							value={statusFilter}
							onValueChange={(v) => setStatusFilter(v as StatusFilter)}
						>
							<SelectTrigger className="w-[130px]">
								<SelectValue placeholder="Status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All status</SelectItem>
								<SelectItem value="open">Open</SelectItem>
								<SelectItem value="resolved">Resolved</SelectItem>
							</SelectContent>
						</Select>

						<Select
							value={typeFilter}
							onValueChange={(v) => setTypeFilter(v as FeedbackType | "all")}
						>
							<SelectTrigger className="w-[160px]">
								<SelectValue placeholder="Type" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All types</SelectItem>
								<SelectItem value="bug">Bug</SelectItem>
								<SelectItem value="incorrect_response">
									Incorrect Response
								</SelectItem>
								<SelectItem value="feature_request">Feature Request</SelectItem>
								<SelectItem value="general">General</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="space-y-3">
							{["s1", "s2", "s3", "s4", "s5"].map((key) => (
								<Skeleton key={key} className="h-16 w-full" />
							))}
						</div>
					) : filteredFeedback.length === 0 ? (
						<div className="py-12 text-center text-muted-foreground">
							{searchQuery
								? "No feedback matches your search"
								: "No feedback found"}
						</div>
					) : (
						<Table>
							<caption className="sr-only">
								User feedback - {filteredFeedback.length} items
								{statusFilter !== "all" &&
									`, filtered by ${statusFilter} status`}
							</caption>
							<TableHeader>
								<TableRow>
									<TableHead className="w-[120px]">Date</TableHead>
									<TableHead className="w-[140px]">Type</TableHead>
									<TableHead>Content</TableHead>
									<TableHead className="w-[100px]">Status</TableHead>
									<TableHead className="w-[100px] text-right">Action</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredFeedback.map((item) => {
									const isResolved = !!item.resolvedAt;
									const isExpanded = expandedId === item.id;
									const typeInfo = item.feedbackType
										? FEEDBACK_TYPE_CONFIG[item.feedbackType as FeedbackType]
										: null;
									const needsTruncation = item.content.length > 80;

									return (
										<React.Fragment key={item.id}>
											<TableRow
												className={cn(isExpanded && "border-b-0")}
												data-state={isExpanded ? "expanded" : undefined}
											>
												<TableCell className="text-sm text-muted-foreground">
													{formatDate(item.createdAt)}
												</TableCell>
												<TableCell>
													{typeInfo ? (
														<Badge variant={typeInfo.variant}>
															{typeInfo.label}
														</Badge>
													) : (
														<span className="text-muted-foreground text-sm">
															—
														</span>
													)}
												</TableCell>
												<TableCell>
													<div className="flex items-start gap-2">
														<div className="flex-1 min-w-0">
															<p className="text-sm">
																{isExpanded
																	? item.content
																	: truncate(item.content, 80)}
															</p>
															{item.pagePath && (
																<p className="text-xs text-muted-foreground mt-0.5">
																	{item.pagePath}
																</p>
															)}
														</div>
														{needsTruncation && (
															<Button
																variant="ghost"
																size="icon"
																className="h-6 w-6 shrink-0"
																onClick={() =>
																	setExpandedId(isExpanded ? null : item.id)
																}
																aria-label={
																	isExpanded
																		? "Collapse content"
																		: "Expand content"
																}
																aria-expanded={isExpanded}
															>
																{isExpanded ? (
																	<ChevronUp className="h-4 w-4" />
																) : (
																	<ChevronDown className="h-4 w-4" />
																)}
															</Button>
														)}
													</div>
												</TableCell>
												<TableCell>
													<Badge
														variant={isResolved ? "secondary" : "outline"}
														className={cn(
															!isResolved &&
																"border-amber-500/50 text-amber-600",
														)}
													>
														{isResolved ? "Resolved" : "Open"}
													</Badge>
												</TableCell>
												<TableCell className="text-right">
													<Button
														variant="ghost"
														size="icon"
														className={cn(
															"h-8 w-8",
															!isResolved &&
																"text-green-600 hover:text-green-700 hover:bg-green-50",
														)}
														onClick={() =>
															handleToggleResolved(item.id, !isResolved)
														}
														disabled={actionLoading === item.id}
														aria-label={
															isResolved
																? "Reopen feedback"
																: "Mark as resolved"
														}
													>
														{isResolved ? (
															<RotateCcw className="h-4 w-4" />
														) : (
															<Check className="h-4 w-4" />
														)}
													</Button>
												</TableCell>
											</TableRow>
										</React.Fragment>
									);
								})}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
