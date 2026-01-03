"use client";

import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Search, User as UserIcon, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { User, UserRole } from "@/lib/types/user";
import { cn } from "@/lib/utils";

const TENANT_ROLES: { value: Exclude<UserRole, "admin">; label: string }[] = [
	{ value: "org_admin", label: "Org Admin" },
	{ value: "field_agent", label: "Field Agent" },
	{ value: "sales", label: "Sales Rep" },
	{ value: "contractor", label: "Contractor" },
	{ value: "compliance", label: "Compliance" },
];

const STATUS_OPTIONS = [
	{ value: "all", label: "All Status" },
	{ value: "active", label: "Active" },
	{ value: "inactive", label: "Inactive" },
];

function getRoleBadgeVariant(role: string) {
	switch (role) {
		case "org_admin":
			return "default";
		case "field_agent":
			return "secondary";
		case "sales":
			return "outline";
		default:
			return "secondary";
	}
}

function formatRole(role: string): string {
	return role
		.split("_")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

function getAvatarColor(name: string): string {
	const colors = [
		"bg-blue-500/20 text-blue-600 dark:text-blue-400",
		"bg-green-500/20 text-green-600 dark:text-green-400",
		"bg-purple-500/20 text-purple-600 dark:text-purple-400",
		"bg-orange-500/20 text-orange-600 dark:text-orange-400",
		"bg-pink-500/20 text-pink-600 dark:text-pink-400",
		"bg-cyan-500/20 text-cyan-600 dark:text-cyan-400",
		"bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
		"bg-red-500/20 text-red-600 dark:text-red-400",
	];
	let hash = 0;
	for (let i = 0; i < name.length; i++) {
		hash = name.charCodeAt(i) + ((hash << 5) - hash);
	}
	const index = Math.abs(hash) % colors.length;
	return colors[index] ?? "bg-blue-500/20 text-blue-600 dark:text-blue-400";
}

function UserAvatar({ firstName, lastName }: { firstName: string; lastName: string }) {
	const initials = `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();
	const colorClass = getAvatarColor(`${firstName}${lastName}`);
	return (
		<div className={cn(
			"flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold",
			colorClass
		)}>
			{initials}
		</div>
	);
}

interface UsersTableProps {
	users: User[];
	isLoading?: boolean | undefined;
	currentUserId?: string | undefined;
	canEditRoles?: boolean | undefined;
	canEditStatus?: boolean | undefined;
	onRoleChange?: ((userId: string, newRole: Exclude<UserRole, "admin">) => Promise<void>) | undefined;
	onStatusChange?: ((userId: string, isActive: boolean) => Promise<void>) | undefined;
}

export function UsersTable({
	users,
	isLoading = false,
	currentUserId,
	canEditRoles = false,
	canEditStatus = false,
	onRoleChange,
	onStatusChange,
}: UsersTableProps) {
	const [sorting, setSorting] = useState<SortingState>([]);
	const [updatingUsers, setUpdatingUsers] = useState<Set<string>>(new Set());
	const [searchQuery, setSearchQuery] = useState("");
	const [roleFilter, setRoleFilter] = useState<string>("all");
	const [statusFilter, setStatusFilter] = useState<string>("all");

	const filteredUsers = useMemo(() => {
		let result = users;

		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			result = result.filter(
				(user) =>
					user.firstName.toLowerCase().includes(query) ||
					user.lastName.toLowerCase().includes(query) ||
					user.email.toLowerCase().includes(query)
			);
		}

		if (roleFilter !== "all") {
			result = result.filter((user) => user.role === roleFilter);
		}

		if (statusFilter !== "all") {
			result = result.filter((user) =>
				statusFilter === "active" ? user.isActive : !user.isActive
			);
		}

		return result;
	}, [users, searchQuery, roleFilter, statusFilter]);

	const hasFilters = searchQuery || roleFilter !== "all" || statusFilter !== "all";

	const clearFilters = () => {
		setSearchQuery("");
		setRoleFilter("all");
		setStatusFilter("all");
	};

	const handleRoleChange = async (userId: string, newRole: Exclude<UserRole, "admin">) => {
		if (!onRoleChange) return;
		setUpdatingUsers((prev) => new Set(prev).add(userId));
		try {
			await onRoleChange(userId, newRole);
		} finally {
			setUpdatingUsers((prev) => {
				const next = new Set(prev);
				next.delete(userId);
				return next;
			});
		}
	};

	const handleStatusChange = async (userId: string, isActive: boolean) => {
		if (!onStatusChange) return;
		setUpdatingUsers((prev) => new Set(prev).add(userId));
		try {
			await onStatusChange(userId, isActive);
		} finally {
			setUpdatingUsers((prev) => {
				const next = new Set(prev);
				next.delete(userId);
				return next;
			});
		}
	};

	const columns: ColumnDef<User>[] = useMemo(
		() => [
			{
				accessorKey: "name",
				header: ({ column }) => (
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Name
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				),
				cell: ({ row }) => (
					<div className="flex items-center gap-3">
						<UserAvatar
							firstName={row.original.firstName}
							lastName={row.original.lastName}
						/>
						<div>
							<div className="flex items-center gap-2">
								<span className="font-medium">
									{row.original.firstName} {row.original.lastName}
								</span>
								{row.original.id === currentUserId && (
									<Badge variant="outline" className="text-xs">
										You
									</Badge>
								)}
							</div>
							<div className="text-sm text-muted-foreground">
								{row.original.email}
							</div>
						</div>
					</div>
				),
			},
			{
				accessorKey: "role",
				header: "Role",
				cell: ({ row }) => {
					const isUpdating = updatingUsers.has(row.original.id);
					const isSelf = row.original.id === currentUserId;

					if (canEditRoles && onRoleChange && !isSelf) {
						return (
							<Select
								value={row.original.role}
								onValueChange={(value) =>
									handleRoleChange(row.original.id, value as Exclude<UserRole, "admin">)
								}
								disabled={isUpdating}
							>
								<SelectTrigger className="w-[140px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{TENANT_ROLES.map((role) => (
										<SelectItem key={role.value} value={role.value}>
											{role.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						);
					}

					return (
						<Badge variant={getRoleBadgeVariant(row.original.role)}>
							{formatRole(row.original.role)}
						</Badge>
					);
				},
			},
			{
				accessorKey: "isActive",
				header: "Status",
				cell: ({ row }) => {
					const isUpdating = updatingUsers.has(row.original.id);
					const isSelf = row.original.id === currentUserId;

					if (canEditStatus && onStatusChange && !isSelf) {
						return (
							<div className="flex items-center gap-2">
								<Switch
									checked={row.original.isActive}
									onCheckedChange={(checked) =>
										handleStatusChange(row.original.id, checked)
									}
									disabled={isUpdating}
								/>
								<span
									className={cn(
										"text-sm",
										row.original.isActive
											? "text-foreground"
											: "text-muted-foreground"
									)}
								>
									{row.original.isActive ? "Active" : "Inactive"}
								</span>
							</div>
						);
					}

					return (
						<Badge variant={row.original.isActive ? "default" : "secondary"}>
							{row.original.isActive ? "Active" : "Inactive"}
						</Badge>
					);
				},
			},
		],
		[currentUserId, canEditRoles, canEditStatus, onRoleChange, onStatusChange, updatingUsers]
	);

	const table = useReactTable({
		data: filteredUsers,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onSortingChange: setSorting,
		state: { sorting },
	});

	if (isLoading) {
		return (
			<div className="space-y-2">
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-full" />
			</div>
		);
	}

	if (users.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-12 text-center border rounded-xl bg-muted/20">
				<div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
					<UserIcon className="h-8 w-8 text-primary/60" />
				</div>
				<h3 className="font-medium text-lg mb-1">No users yet</h3>
				<p className="text-sm text-muted-foreground">
					Add users to this organization to get started
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search by name or email..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9"
					/>
				</div>
				<div className="flex items-center gap-2">
					<Select value={roleFilter} onValueChange={setRoleFilter}>
						<SelectTrigger className="w-[140px]">
							<SelectValue placeholder="All Roles" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Roles</SelectItem>
							{TENANT_ROLES.map((role) => (
								<SelectItem key={role.value} value={role.value}>
									{role.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="w-[130px]">
							<SelectValue placeholder="All Status" />
						</SelectTrigger>
						<SelectContent>
							{STATUS_OPTIONS.map((status) => (
								<SelectItem key={status.value} value={status.value}>
									{status.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{hasFilters && (
						<Button
							variant="ghost"
							size="sm"
							onClick={clearFilters}
							className="text-muted-foreground"
						>
							<X className="h-4 w-4 mr-1" />
							Clear
						</Button>
					)}
				</div>
			</div>

			{filteredUsers.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-12 text-center border rounded-xl bg-muted/20">
					<div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
						<Search className="h-7 w-7 text-muted-foreground" />
					</div>
					<h3 className="font-medium text-lg mb-1">No users found</h3>
					<p className="text-sm text-muted-foreground mb-4">
						Try adjusting your search or filters
					</p>
					<Button variant="outline" size="sm" onClick={clearFilters}>
						Clear filters
					</Button>
				</div>
			) : (
			<div className="rounded-md border">
			<Table>
				<TableHeader>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<TableHead key={header.id}>
									{header.isPlaceholder
										? null
										: flexRender(
												header.column.columnDef.header,
												header.getContext()
										  )}
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows.map((row) => (
						<TableRow
							key={row.id}
							className={cn(
								"transition-colors",
								updatingUsers.has(row.original.id) && "opacity-50",
								"hover:bg-muted/50"
							)}
						>
							{row.getVisibleCells().map((cell) => (
								<TableCell key={cell.id}>
									{flexRender(
										cell.column.columnDef.cell,
										cell.getContext()
									)}
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
			</div>
			)}
		</div>
	);
}
