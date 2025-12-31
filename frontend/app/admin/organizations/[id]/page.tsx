"use client";

import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import {
	ArrowLeft,
	ArrowUpDown,
	Mail,
	Phone,
	Plus,
	RefreshCcw,
	Shield,
	User as UserIcon,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
	organizationsAPI,
	type Organization,
	type OrgUserCreateInput,
	type User,
	type UserRole,
} from "@/lib/api";
import { useAuth } from "@/lib/contexts";
import { useOrganizationStore } from "@/lib/stores/organization-store";

const PASSWORD_HINT = "Min 8 chars, 1 uppercase, 1 number";

const TENANT_ROLES: { value: Exclude<UserRole, "admin">; label: string }[] = [
	{ value: "org_admin", label: "Org Admin" },
	{ value: "field_agent", label: "Field Agent" },
	{ value: "sales", label: "Sales Rep" },
	{ value: "contractor", label: "Contractor" },
	{ value: "compliance", label: "Compliance" },
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

export default function OrganizationDetailPage() {
	const { isSuperAdmin } = useAuth();
	const { selectOrganization } = useOrganizationStore();
	const params = useParams();
	const orgId = params.id as string;

	const [organization, setOrganization] = useState<Organization | null>(null);
	const [users, setUsers] = useState<User[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [modalOpen, setModalOpen] = useState(false);
	const [form, setForm] = useState({
		email: "",
		password: "",
		confirmPassword: "",
		firstName: "",
		lastName: "",
		role: "field_agent" as Exclude<UserRole, "admin">,
	});
	const [submitting, setSubmitting] = useState(false);
	const [sorting, setSorting] = useState<SortingState>([]);

	useEffect(() => {
		if (!isSuperAdmin || !orgId) return;

		// Set selected org for consistent API calls
		selectOrganization(orgId);

		fetchData();
	}, [isSuperAdmin, orgId]);

	const fetchData = async () => {
		try {
			setIsLoading(true);
			const [orgData, usersData] = await Promise.all([
				organizationsAPI.get(orgId),
				organizationsAPI.listOrgUsers(orgId),
			]);
			setOrganization(orgData);
			setUsers(usersData);
		} catch {
			toast.error("Failed to load organization data");
		} finally {
			setIsLoading(false);
		}
	};

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
			role: "field_agent",
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

	const handleCreateUser = async () => {
		if (!canSubmitForm) return;

		setSubmitting(true);
		try {
			const payload: OrgUserCreateInput = {
				email: form.email.trim(),
				password: form.password,
				firstName: form.firstName.trim(),
				lastName: form.lastName.trim(),
				role: form.role,
			};
			const newUser = await organizationsAPI.createOrgUser(orgId, payload);
			setUsers((prev) => [...prev, newUser]);
			toast.success(`User "${newUser.email}" created`);
			setModalOpen(false);
			resetForm();
		} catch (error: any) {
			toast.error(error.message || "Failed to create user");
		} finally {
			setSubmitting(false);
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
					<div className="flex items-center gap-2">
						<UserIcon className="h-4 w-4 text-muted-foreground" />
						<span>
							{row.original.firstName} {row.original.lastName}
						</span>
					</div>
				),
			},
			{
				accessorKey: "email",
				header: "Email",
			},
			{
				accessorKey: "role",
				header: "Role",
				cell: ({ row }) => (
					<Badge variant={getRoleBadgeVariant(row.original.role)}>
						{formatRole(row.original.role)}
					</Badge>
				),
			},
			{
				accessorKey: "isActive",
				header: "Status",
				cell: ({ row }) => (
					<Badge variant={row.original.isActive ? "default" : "secondary"}>
						{row.original.isActive ? "Active" : "Inactive"}
					</Badge>
				),
			},
		],
		[]
	);

	const table = useReactTable({
		data: users,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: setSorting,
		state: { sorting },
	});

	if (!isSuperAdmin) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-muted-foreground">Access denied. Platform Admin only.</p>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="container mx-auto py-6 space-y-6">
				<Skeleton className="h-8 w-48" />
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-32" />
						<Skeleton className="h-4 w-24" />
					</CardHeader>
					<CardContent>
						<Skeleton className="h-32 w-full" />
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!organization) {
		return (
			<div className="container mx-auto py-6">
				<p className="text-muted-foreground">Organization not found</p>
			</div>
		);
	}

	return (
		<div className="container mx-auto py-6 space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/admin/organizations">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div className="flex-1">
					<div className="flex items-center gap-3">
						<h1 className="text-2xl font-semibold">{organization.name}</h1>
						<Badge variant={organization.isActive ? "default" : "secondary"}>
							{organization.isActive ? "Active" : "Inactive"}
						</Badge>
					</div>
					<p className="text-muted-foreground font-mono text-sm">
						{organization.slug}
					</p>
				</div>
				<Button variant="outline" size="icon" onClick={fetchData}>
					<RefreshCcw className="h-4 w-4" />
				</Button>
			</div>

			{(organization.contactEmail || organization.contactPhone) && (
				<Card>
					<CardContent className="py-4">
						<div className="flex items-center gap-6 text-sm text-muted-foreground">
							{organization.contactEmail && (
								<div className="flex items-center gap-2">
									<Mail className="h-4 w-4" />
									<span>{organization.contactEmail}</span>
								</div>
							)}
							{organization.contactPhone && (
								<div className="flex items-center gap-2">
									<Phone className="h-4 w-4" />
									<span>{organization.contactPhone}</span>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Users className="h-5 w-5" />
							<CardTitle>Users</CardTitle>
							<Badge variant="secondary">{users.length}</Badge>
						</div>
						<Button onClick={() => setModalOpen(true)}>
							<Plus className="h-4 w-4 mr-2" />
							Add User
						</Button>
					</div>
					<CardDescription>
						Manage users in this organization
					</CardDescription>
				</CardHeader>
				<CardContent>
					{users.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-8">
							<Users className="h-12 w-12 text-muted-foreground mb-4" />
							<p className="text-muted-foreground">No users in this organization</p>
							<Button className="mt-4" onClick={() => setModalOpen(true)}>
								<Plus className="h-4 w-4 mr-2" />
								Add First User
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
										<TableRow key={row.id}>
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
				</CardContent>
			</Card>

			<Dialog open={modalOpen} onOpenChange={setModalOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add Team Member</DialogTitle>
						<DialogDescription>
							Create a new user in {organization.name}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="email">Email *</Label>
							<Input
								id="email"
								type="email"
								placeholder="user@company.com"
								value={form.email}
								onChange={(e) => handleInputChange("email", e.target.value)}
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="password">Password *</Label>
								<Input
									id="password"
									type="password"
									value={form.password}
									onChange={(e) => handleInputChange("password", e.target.value)}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="confirmPassword">Confirm *</Label>
								<Input
									id="confirmPassword"
									type="password"
									value={form.confirmPassword}
									onChange={(e) =>
										handleInputChange("confirmPassword", e.target.value)
									}
								/>
							</div>
						</div>
						<p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="firstName">First Name *</Label>
								<Input
									id="firstName"
									value={form.firstName}
									onChange={(e) => handleInputChange("firstName", e.target.value)}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="lastName">Last Name *</Label>
								<Input
									id="lastName"
									value={form.lastName}
									onChange={(e) => handleInputChange("lastName", e.target.value)}
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="role">Role *</Label>
							<Select
								value={form.role}
								onValueChange={(value) =>
									handleInputChange("role", value as Exclude<UserRole, "admin">)
								}
							>
								<SelectTrigger>
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
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setModalOpen(false);
								resetForm();
							}}
						>
							Cancel
						</Button>
						<Button
							onClick={handleCreateUser}
							disabled={!canSubmitForm || submitting}
						>
							{submitting ? "Creating..." : "Create User"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
