"use client";

import { ArrowRight, Bell, CheckCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { cn } from "@/lib/utils";

const SECTION_CONFIG = {
	"ready-for-proposal": {
		label: "Ready to generate",
		dotColor: "bg-success",
	},
	"proposal-completed": {
		label: "Proposals completed",
		dotColor: "bg-success",
	},
	stalled: {
		label: "Inactive",
		dotColor: "bg-warning",
	},
} as const;

export function NotificationDropdown() {
	const router = useRouter();
	const { notifications, actionCount, hasNotifications, isLoading } =
		useNotifications();
	const [open, setOpen] = useState(false);

	const handleProjectClick = (route: string) => {
		router.push(route);
		setOpen(false);
	};

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="relative h-9 w-9 rounded-full border border-border/40 bg-card/60 text-foreground transition-colors duration-300 hover:bg-card/80"
					aria-label={
						actionCount > 0
							? `Notifications, ${actionCount} pending ${actionCount === 1 ? "action" : "actions"}`
							: "Notifications"
					}
				>
					<Bell className="h-4 w-4" aria-hidden="true" />
					{actionCount > 0 && (
						<span
							className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground"
							aria-hidden="true"
						>
							{actionCount}
						</span>
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
				<div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
					<span className="text-sm font-medium">Notifications</span>
					{actionCount > 0 && (
						<span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
							{actionCount} {actionCount === 1 ? "action" : "actions"}
						</span>
					)}
				</div>

				<div className="max-h-[400px] overflow-y-auto">
					{isLoading ? (
						<div className="py-4 px-4 space-y-3">
							<div className="flex items-center gap-3">
								<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
								<span className="text-sm text-muted-foreground">
									Loading notifications...
								</span>
							</div>
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
						</div>
					) : !hasNotifications ? (
						<div className="flex flex-col items-center justify-center py-8 text-center">
							<CheckCircle className="h-8 w-8 text-success mb-2" />
							<p className="text-sm font-medium">All caught up</p>
							<p className="text-xs text-muted-foreground">
								No pending actions
							</p>
						</div>
					) : (
						<div className="py-1">
							{notifications.map((notification, index) => {
								const config =
									SECTION_CONFIG[
										notification.id as keyof typeof SECTION_CONFIG
									];
								const isLast = index === notifications.length - 1;

								return (
									<div key={notification.id}>
										{/* Section Header */}
										<div className="px-4 py-2 pt-3">
											<span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
												{config?.label ?? notification.id}
											</span>
										</div>

										{/* Project List */}
										{notification.projects.map((project) => {
											const daysSinceUpdate = Math.floor(
												(Date.now() - new Date(project.updatedAt).getTime()) /
													(1000 * 60 * 60 * 24),
											);
											const showDays = notification.id === "stalled";

											return (
												<button
													key={project.id}
													type="button"
													onClick={() =>
														handleProjectClick(
															notification.getRoute(project.id),
														)
													}
													className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-muted/50 group"
												>
													<span
														className={cn(
															"w-2 h-2 rounded-full flex-shrink-0",
															config?.dotColor ?? "bg-muted-foreground",
														)}
													/>
													<span className="flex-1 text-sm truncate">
														{project.name}
														{showDays && (
															<span className="text-muted-foreground ml-1">
																({daysSinceUpdate}d)
															</span>
														)}
													</span>
													<ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
												</button>
											);
										})}

										{/* Separator between sections */}
										{!isLast && (
											<div className="mx-4 my-1 border-t border-border/30" />
										)}
									</div>
								);
							})}
						</div>
					)}
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
