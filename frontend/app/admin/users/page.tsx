"use client";

import {
	type ColumnDef,
	type ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import {
	ArrowUpDown,
	Ban,
	ChevronLeft,
	ChevronRight,
	Crown,
	RefreshCcw,
	Search,
	Shield,
	UserPlus,
	X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	adminUsersAPI,
	type AdminCreateUserInput,
	type AdminUpdateUserInput,
	type User,
	type UserRole,
} from "@/lib/api";
import { useAuth } from "@/lib/contexts";

const PASSWORD_HINT = "Min 8 chars, 1 uppercase, 1 number";

export default function AdminUsersPage() {
	const { isSuperAdmin, user: currentUser } = useAuth();
	const [users, setUsers] = useState<User[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [modalOpen, setModalOpen] = useState(false);
	const [form, setForm] = useState({
		email: "",
		password: "",
		confirmPassword: "",
		firstName: "",
		lastName: "",
		role: "admin" as UserRole,
	});
	const [submitting, setSubmitting] = useState(false);
	const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
	const [resetUserId, setResetUserId] = useState<string | null>(null);
	const [resetPassword, setResetPassword] = useState("");
	const [resetConfirmPassword, setResetConfirmPassword] = useState("");
	const [resetSubmitting, setResetSubmitting] = useState(false);

	// TanStack Table state
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [globalFilter, setGlobalFilter] = useState("");

	useEffect(() => {
		if (!isSuperAdmin) return;
		const fetchUsers = async () => {
			try {
				const data = await adminUsersAPI.list();
				setUsers(data);
			} catch {
				toast.error("Failed to load users");
			} finally {
				setIsLoading(false);
			}
		};
		fetchUsers();
	}, [isSuperAdmin]);

	const handleInputChange = (field: keyof typeof form, value: string) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	const resetForm = () => {
		setForm({
			email: "",
			password: "",
			confirmPassword: "",
			firstName: "",
			lastName: "",
			role: "admin",
		});
	};

	const canSubmitForm = useMemo(() => {
		return (
			form.email.trim() !== "" &&
			form.password.length >= 8 &&
			/[A-Z]/.test(form.password) &&
			/[0-9]/.test(form.password) &&
			form.password === form.confirmPassword &&
			form.firstName.trim() !== "" &&
			form.lastName.trim() !== ""
		);
	}, [form]);

	const canSubmitReset = useMemo(
		() =>
			resetPassword.length >= 8 &&
			/[A-Z]/.test(resetPassword) &&
			/[0-9]/.test(resetPassword) &&
			resetPassword === resetConfirmPassword,
		[resetPassword, resetConfirmPassword],
	);

	const handleCreateUser = async () => {
		if (!canSubmitForm) return;
		setSubmitting(true);
		const payload: AdminCreateUserInput = {
			email: form.email.trim(),
			password: form.password,
			firstName: form.firstName.trim(),
			lastName: form.lastName.trim(),
			isSuperuser: true,
			role: "admin",
		};
		try {
			const newUser = await adminUsersAPI.create(payload);
			setUsers((prev) => [newUser, ...prev]);
			toast.success("User created");
			setModalOpen(false);
			resetForm();
		} catch {
			toast.error("Failed to create user");
		} finally {
			setSubmitting(false);
		}
	};

	const handleOpenResetDialog = (userId: string) => {
		setResetUserId(userId);
		setResetPassword("");
		setResetConfirmPassword("");
	};

	const handleResetPassword = async () => {
		if (!resetUserId || !canSubmitReset) return;
		setResetSubmitting(true);
		const targetUser = users.find((user) => user.id === resetUserId);
		const name = targetUser ? targetUser.firstName : "User";
		try {
			await handleUpdateUser(
				resetUserId,
				{ password: resetPassword },
				`Password for ${name} updated`,
			);
			setResetUserId(null);
			setResetPassword("");
			setResetConfirmPassword("");
		} finally {
			setResetSubmitting(false);
		}
	};

	const handleUpdateUser = async (
		userId: string,
		updates: AdminUpdateUserInput,
		successMessage: string,
	) => {
		setUpdatingUserId(userId);
		try {
			const updated = await adminUsersAPI.update(userId, updates);
			setUsers((prev) => prev.map((user) => (user.id === userId ? updated : user)));
			toast.success(successMessage);
		} catch (error) {
			const message =
				error instanceof Error && error.message
					? error.message
					: "Failed to update user";
			toast.error(message);
		} finally {
			setUpdatingUserId(null);
		}
	};

	const formatMemberSince = (dateString: string) => {
		const date = new Date(dateString);
		if (Number.isNaN(date.getTime())) return "--";
		return date.toLocaleDateString(undefined, {
			month: "short",
			year: "numeric",
		});
	};

	const activeAdmins = users.filter((user) => user.isSuperuser && user.isActive);
	const lastActiveAdminId = activeAdmins.length === 1 ? activeAdmins[0]?.id ?? null : null;

	// Column definitions
	const columns: ColumnDef<User>[] = useMemo(
		() => [
			{
				accessorKey: "firstName",
				header: ({ column }) => (
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
						className="h-8 px-2 -ml-2"
					>
						Name
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				),
				cell: ({ row }) => {
					const user = row.original;
					return (
						<div>
							<div className="flex items-center gap-2 flex-wrap">
								<span className="font-medium">
									{user.firstName} {user.lastName}
								</span>
								{currentUser?.id === user.id && (
									<Badge variant="outline" className="text-xs">
										You
									</Badge>
								)}
								{user.isSuperuser && (
									<Badge className="text-xs bg-amber-500/15 text-amber-600 border-amber-500/40">
										Admin
									</Badge>
								)}
							</div>
							<div className="text-xs text-muted-foreground">
								Member since {formatMemberSince(user.createdAt)}
							</div>
						</div>
					);
				},
			},
			{
				accessorKey: "email",
				header: ({ column }) => (
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
						className="h-8 px-2 -ml-2"
					>
						Email
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				),
				cell: ({ row }) => (
					<span className="font-mono text-sm">{row.getValue("email")}</span>
				),
			},
			{
				accessorKey: "role",
				header: ({ column }) => (
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
						className="h-8 px-2 -ml-2"
					>
						Role
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				),
				cell: ({ row }) => {
					const user = row.original;
					return (
						<span className="inline-flex items-center gap-2">
							{user.role === "admin" || user.isSuperuser ? (
								<Crown className="h-4 w-4 text-amber-500" />
							) : (
								<Shield className="h-4 w-4 text-muted-foreground" />
							)}
							{user.role?.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()) ??
								(user.isSuperuser ? "Admin" : "Field Agent")}
						</span>
					);
				},
				filterFn: (row, id, value) => {
					if (value === "all") return true;
					const user = row.original;
					if (value === "admin") return user.isSuperuser;
					return row.getValue(id) === value;
				},
			},
			{
				accessorKey: "isActive",
				header: "Status",
				cell: ({ row }) => {
					const user = row.original;
					return (
						<div className="flex flex-col space-y-0.5">
							<span className={user.isActive ? "text-green-600" : "text-muted-foreground"}>
								{user.isActive ? "Active" : "Disabled"}
							</span>
							{!user.isVerified && (
								<span className="text-xs text-muted-foreground">Unverified</span>
							)}
						</div>
					);
				},
				filterFn: (row, id, value) => {
					if (value === "all") return true;
					return row.getValue(id) === (value === "active");
				},
			},
			{
				id: "actions",
				header: () => <span className="sr-only">Actions</span>,
				cell: ({ row }) => {
					const user = row.original;
					const isSelf = currentUser?.id === user.id;
					const isLastActiveAdmin = user.isSuperuser && user.isActive && lastActiveAdminId === user.id;
					const isTenantUser = user.organizationId !== null;
					const disableRoleChange = isSelf || isLastActiveAdmin || isTenantUser;
					const disableStatusChange = isSelf || isLastActiveAdmin || isTenantUser;

					const roleTooltipMessage = isTenantUser
						? "Manage tenant users via organizations"
						: isSelf
							? "You can't change your own role"
							: isLastActiveAdmin
								? "Keep at least one active admin"
								: "";

					const statusTooltipMessage = isTenantUser
						? "Manage tenant users via organizations"
						: isSelf
							? "You can't deactivate your own account"
							: isLastActiveAdmin
								? "Keep at least one active admin"
								: "";

					const roleButton = (
						<Button
							variant={user.isSuperuser ? "outline" : "secondary"}
							size="sm"
							disabled={disableRoleChange || updatingUserId === user.id}
							onClick={() => {
								if (user.isSuperuser) return;
								handleUpdateUser(
									user.id,
									{ isSuperuser: true, role: "admin" },
									`${user.firstName} promoted to Admin`,
								);
							}}
						>
							{updatingUserId === user.id ? (
								<RefreshCcw className="h-4 w-4 animate-spin" />
							) : user.isSuperuser ? (
								"Admin"
							) : (
								"Make Admin"
							)}
						</Button>
					);

					const statusButton = (
						<Button
							variant={user.isActive ? "destructive" : "secondary"}
							size="sm"
							disabled={disableStatusChange || updatingUserId === user.id}
							onClick={() =>
								handleUpdateUser(
									user.id,
									{ isActive: !user.isActive },
									user.isActive
										? `${user.firstName} deactivated`
										: `${user.firstName} reactivated`,
								)
							}
						>
							{updatingUserId === user.id ? (
								<RefreshCcw className="h-4 w-4 animate-spin" />
							) : user.isActive ? (
								<Ban className="h-4 w-4" />
							) : (
								"Activate"
							)}
						</Button>
					);

					return (
						<div className="flex items-center justify-end gap-2">
							{roleTooltipMessage ? (
								<Tooltip>
									<TooltipTrigger asChild>{roleButton}</TooltipTrigger>
									<TooltipContent>{roleTooltipMessage}</TooltipContent>
								</Tooltip>
							) : (
								roleButton
							)}
							{statusTooltipMessage ? (
								<Tooltip>
									<TooltipTrigger asChild>{statusButton}</TooltipTrigger>
									<TooltipContent>{statusTooltipMessage}</TooltipContent>
								</Tooltip>
							) : (
								statusButton
							)}
							<Button
								variant="outline"
								size="sm"
								disabled={isTenantUser}
								title={isTenantUser ? "Manage tenant users via organizations" : undefined}
								onClick={() => handleOpenResetDialog(user.id)}
							>
								Reset
							</Button>
						</div>
					);
				},
			},
		],
		[currentUser?.id, lastActiveAdminId, updatingUserId, handleUpdateUser],
	);

	const table = useReactTable({
		data: users,
		columns,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onGlobalFilterChange: setGlobalFilter,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		globalFilterFn: "includesString",
		state: {
			sorting,
			columnFilters,
			globalFilter,
		},
		initialState: {
			pagination: {
				pageSize: 10,
			},
		},
	});

	if (!isSuperAdmin) {
		return (
			<div className="container mx-auto py-8">
				<Card>
					<CardHeader>
						<CardTitle>Access denied</CardTitle>
						<CardDescription>You need admin permissions to view this page.</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	return (
		<TooltipProvider delayDuration={200}>
			<div className="container mx-auto py-8 space-y-6">
				<div className="flex items-center justify-between flex-wrap gap-4">
					<div>
						<h1 className="text-2xl font-bold flex items-center gap-2">
							<Shield className="h-6 w-6" /> Admin Users
						</h1>
						<p className="text-muted-foreground">Create and manage platform users.</p>
					</div>
					<Button onClick={() => setModalOpen(true)}>
						<UserPlus className="mr-2 h-4 w-4" /> New User
					</Button>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>User Directory</CardTitle>
						<CardDescription>
							{users.length} users total - Admins can promote members or deactivate accounts.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{isLoading ? (
							<div className="space-y-3">
								<Skeleton className="h-10 w-64" />
								{Array.from({ length: 4 }).map((_, idx) => (
									<Skeleton key={idx} className="h-16 w-full" />
								))}
							</div>
						) : users.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground">
								<p>No users yet. Create the first one.</p>
							</div>
						) : (
							<>
								{/* Search and Filters */}
								<div className="flex flex-col sm:flex-row gap-3">
									<div className="relative flex-1">
										<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
										<Input
											placeholder="Search users..."
											value={globalFilter}
											onChange={(e) => setGlobalFilter(e.target.value)}
											className="pl-9 pr-9 max-w-sm"
										/>
										{globalFilter && (
											<button
												type="button"
												onClick={() => setGlobalFilter("")}
												className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
												aria-label="Clear search"
											>
												<X className="h-4 w-4" />
											</button>
										)}
									</div>
									<Select
										value={(table.getColumn("role")?.getFilterValue() as string) ?? "all"}
										onValueChange={(value) =>
											table.getColumn("role")?.setFilterValue(value === "all" ? undefined : value)
										}
									>
										<SelectTrigger className="w-[150px]">
											<SelectValue placeholder="All Roles" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Roles</SelectItem>
											<SelectItem value="admin">Admin</SelectItem>
											<SelectItem value="org_admin">Org Admin</SelectItem>
											<SelectItem value="field_agent">Field Agent</SelectItem>
											<SelectItem value="contractor">Contractor</SelectItem>
											<SelectItem value="compliance">Compliance</SelectItem>
											<SelectItem value="sales">Sales</SelectItem>
										</SelectContent>
									</Select>
									<Select
										value={(table.getColumn("isActive")?.getFilterValue() as string) ?? "all"}
										onValueChange={(value) =>
											table.getColumn("isActive")?.setFilterValue(value === "all" ? undefined : value)
										}
									>
										<SelectTrigger className="w-[130px]">
											<SelectValue placeholder="All Status" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Status</SelectItem>
											<SelectItem value="active">Active</SelectItem>
											<SelectItem value="inactive">Disabled</SelectItem>
										</SelectContent>
									</Select>
								</div>

								{/* Table */}
								<div className="rounded-md border overflow-x-auto">
									<Table>
										<TableHeader>
											{table.getHeaderGroups().map((headerGroup) => (
												<TableRow key={headerGroup.id}>
													{headerGroup.headers.map((header) => (
														<TableHead key={header.id} className="whitespace-nowrap">
															{header.isPlaceholder
																? null
																: flexRender(header.column.columnDef.header, header.getContext())}
														</TableHead>
													))}
												</TableRow>
											))}
										</TableHeader>
										<TableBody>
											{table.getRowModel().rows.length ? (
												table.getRowModel().rows.map((row) => (
													<TableRow key={row.id}>
														{row.getVisibleCells().map((cell) => (
															<TableCell key={cell.id}>
																{flexRender(cell.column.columnDef.cell, cell.getContext())}
															</TableCell>
														))}
													</TableRow>
												))
											) : (
												<TableRow>
													<TableCell colSpan={columns.length} className="h-24 text-center">
														No users match your search.
													</TableCell>
												</TableRow>
											)}
										</TableBody>
									</Table>
								</div>

								{/* Pagination */}
								<div className="flex items-center justify-between">
									<p className="text-sm text-muted-foreground">
										Showing {table.getRowModel().rows.length} of {table.getFilteredRowModel().rows.length} users
									</p>
									<div className="flex items-center gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => table.previousPage()}
											disabled={!table.getCanPreviousPage()}
										>
											<ChevronLeft className="h-4 w-4" />
											Previous
										</Button>
										<span className="text-sm text-muted-foreground">
											Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
										</span>
										<Button
											variant="outline"
											size="sm"
											onClick={() => table.nextPage()}
											disabled={!table.getCanNextPage()}
										>
											Next
											<ChevronRight className="h-4 w-4" />
										</Button>
									</div>
								</div>
							</>
						)}
					</CardContent>
				</Card>

				{/* Create User Dialog */}
				<Dialog open={modalOpen} onOpenChange={setModalOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Create User</DialogTitle>
							<DialogDescription>Admins can create accounts directly.</DialogDescription>
						</DialogHeader>
						<div className="grid gap-4">
							<div className="grid gap-2">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									type="email"
									value={form.email}
									onChange={(e) => handleInputChange("email", e.target.value)}
									placeholder="user@example.com"
								/>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div className="grid gap-2">
									<Label htmlFor="firstName">First Name</Label>
									<Input
										id="firstName"
										value={form.firstName}
										onChange={(e) => handleInputChange("firstName", e.target.value)}
										placeholder="Jane"
									/>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="lastName">Last Name</Label>
									<Input
										id="lastName"
										value={form.lastName}
										onChange={(e) => handleInputChange("lastName", e.target.value)}
										placeholder="Doe"
									/>
								</div>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="password">Password</Label>
								<Input
									id="password"
									type="password"
									value={form.password}
									onChange={(e) => handleInputChange("password", e.target.value)}
									placeholder="StrongPassword1"
								/>
								<p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="confirmPassword">Confirm Password</Label>
								<Input
									id="confirmPassword"
									type="password"
									value={form.confirmPassword}
									onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
									placeholder="StrongPassword1"
								/>
								{form.confirmPassword && form.password !== form.confirmPassword && (
									<p className="text-xs text-destructive">Passwords do not match</p>
								)}
							</div>
							<div className="grid gap-2">
								<Label>Role</Label>
								<Input value="Platform Admin" disabled />
							</div>
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={() => setModalOpen(false)}>
								Cancel
							</Button>
							<Button onClick={handleCreateUser} disabled={!canSubmitForm || submitting}>
								{submitting ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
								Create User
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				{/* Reset Password Dialog */}
				<Dialog
					open={resetUserId !== null}
					onOpenChange={(open) => {
						if (!open) {
							setResetUserId(null);
							setResetPassword("");
							setResetConfirmPassword("");
						}
					}}
				>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Reset password</DialogTitle>
							<DialogDescription>
								Set a new password for this user. Share it securely with them.
							</DialogDescription>
						</DialogHeader>
						<div className="grid gap-4">
							<div className="grid gap-2">
								<Label htmlFor="resetPassword">New password</Label>
								<Input
									id="resetPassword"
									type="password"
									value={resetPassword}
									onChange={(e) => setResetPassword(e.target.value)}
									placeholder="StrongPassword1"
								/>
								<p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="resetConfirmPassword">Confirm password</Label>
								<Input
									id="resetConfirmPassword"
									type="password"
									value={resetConfirmPassword}
									onChange={(e) => setResetConfirmPassword(e.target.value)}
									placeholder="StrongPassword1"
								/>
								{resetConfirmPassword && resetPassword !== resetConfirmPassword && (
									<p className="text-xs text-destructive">Passwords do not match</p>
								)}
							</div>
						</div>
						<DialogFooter>
							<Button
								variant="outline"
								onClick={() => {
									setResetUserId(null);
									setResetPassword("");
									setResetConfirmPassword("");
								}}
							>
								Cancel
							</Button>
							<Button onClick={handleResetPassword} disabled={!canSubmitReset || resetSubmitting}>
								{resetSubmitting ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : null}
								{resetSubmitting ? "Updating..." : "Update password"}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>
		</TooltipProvider>
	);
}
