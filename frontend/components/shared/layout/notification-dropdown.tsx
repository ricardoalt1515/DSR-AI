"use client";

import {
	ArrowRight,
	Bell,
	Brain,
	CheckCircle,
	ChevronDown,
	ChevronRight,
	Clock,
	Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	type GroupedNotification,
	useNotifications,
} from "@/lib/hooks/use-notifications";
import { cn } from "@/lib/utils";

const NOTIFICATION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
	"ready-for-proposal": Brain,
	"proposal-completed": Sparkles,
	stalled: Clock,
};

export function NotificationDropdown() {
	const router = useRouter();
	const { notifications, actionCount, hasNotifications } = useNotifications();
	const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
	const [open, setOpen] = useState(false);

	const toggleGroup = (id: string) => {
		setExpandedGroups((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const handleNotificationClick = (notification: GroupedNotification) => {
		if (notification.projects.length === 1 && notification.projects[0]) {
			router.push(notification.getRoute(notification.projects[0].id));
			setOpen(false);
		} else {
			toggleGroup(notification.id);
		}
	};

	const handleProjectClick = (notification: GroupedNotification, projectId: string) => {
		router.push(notification.getRoute(projectId));
		setOpen(false);
	};

	const highPriorityNotifications = notifications.filter(
		(n) => n.priority === "high"
	);
	const mediumPriorityNotifications = notifications.filter(
		(n) => n.priority === "medium"
	);

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="relative h-9 w-9 rounded-full border border-border/40 bg-card/60 text-foreground transition-all duration-300 hover:bg-card/80"
				>
					<Bell className="h-4 w-4" />
					{actionCount > 0 && (
						<span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
							{actionCount}
						</span>
					)}
					<span className="sr-only">Notifications</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="w-80 p-0"
				sideOffset={8}
			>
				<div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
					<span className="text-sm font-medium">Notifications</span>
					{actionCount > 0 && (
						<span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
							{actionCount} {actionCount === 1 ? "action" : "actions"}
						</span>
					)}
				</div>

				<div className="max-h-[400px] overflow-y-auto">
					{!hasNotifications ? (
						<div className="flex flex-col items-center justify-center py-8 text-center">
							<CheckCircle className="h-8 w-8 text-success mb-2" />
							<p className="text-sm font-medium">All caught up</p>
							<p className="text-xs text-muted-foreground">No pending actions</p>
						</div>
					) : (
						<div className="py-2">
							{highPriorityNotifications.map((notification) => (
								<NotificationItem
									key={notification.id}
									notification={notification}
									isExpanded={expandedGroups.has(notification.id)}
									onClick={() => handleNotificationClick(notification)}
									onProjectClick={(projectId) =>
										handleProjectClick(notification, projectId)
									}
								/>
							))}

							{highPriorityNotifications.length > 0 &&
								mediumPriorityNotifications.length > 0 && (
									<div className="mx-4 my-2 border-t border-border/50" />
								)}

							{mediumPriorityNotifications.map((notification) => (
								<NotificationItem
									key={notification.id}
									notification={notification}
									isExpanded={expandedGroups.has(notification.id)}
									onClick={() => handleNotificationClick(notification)}
									onProjectClick={(projectId) =>
										handleProjectClick(notification, projectId)
									}
								/>
							))}
						</div>
					)}
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

interface NotificationItemProps {
	notification: GroupedNotification;
	isExpanded: boolean;
	onClick: () => void;
	onProjectClick: (projectId: string) => void;
}

function NotificationItem({
	notification,
	isExpanded,
	onClick,
	onProjectClick,
}: NotificationItemProps) {
	const Icon = NOTIFICATION_ICONS[notification.id] ?? Bell;
	const hasMultiple = notification.projects.length > 1;

	return (
		<div>
			<button
				type="button"
				onClick={onClick}
				className={cn(
					"w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
					"hover:bg-muted/50",
					notification.priority === "high" && "font-medium"
				)}
			>
				<span
					className={cn(
						"w-2 h-2 rounded-full flex-shrink-0",
						notification.type === "action" ? "bg-success" : "bg-warning"
					)}
				/>
				<Icon
					className={cn(
						"h-4 w-4 flex-shrink-0",
						notification.type === "action" ? "text-success" : "text-warning"
					)}
				/>
				<span className="flex-1 text-sm truncate">{notification.title}</span>
				{hasMultiple ? (
					isExpanded ? (
						<ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
					) : (
						<ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
					)
				) : (
					<ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
				)}
			</button>

			{hasMultiple && isExpanded && (
				<div className="ml-9 space-y-0.5 pb-1">
					{notification.projects.map((project) => (
						<button
							key={project.id}
							type="button"
							onClick={() => onProjectClick(project.id)}
							className="w-full flex items-center gap-2 py-1.5 px-4 text-left hover:bg-muted/30 transition-colors group"
						>
							<span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 flex-shrink-0" />
							<span className="flex-1 text-sm text-muted-foreground truncate">
								{project.name}
							</span>
							<span className="text-xs text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity">
								{notification.actionLabel}
							</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
