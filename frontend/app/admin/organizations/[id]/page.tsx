"use client";

import {
	AlertTriangle,
	ArrowLeft,
	CheckCircle,
	Mail,
	Phone,
	Plus,
	RefreshCcw,
	Users,
	XCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminStatsCard, OrgAvatar } from "@/components/features/admin";
import { Skeleton } from "@/components/ui/skeleton";

const AddUserModal = dynamic(
	() =>
		import("@/components/features/admin/add-user-modal").then(
			(mod) => mod.AddUserModal,
		),
	{ ssr: false, loading: () => null },
);

const EditOrgModal = dynamic(
	() =>
		import("@/components/features/admin/edit-org-modal").then(
			(mod) => mod.EditOrgModal,
		),
	{ ssr: false, loading: () => null },
);

const UsersTable = dynamic(
	() =>
		import("@/components/features/admin/users-table").then(
			(mod) => mod.UsersTable,
		),
	{
		ssr: false,
		loading: () => (
			<div className="space-y-3">
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-full" />
			</div>
		),
	},
);

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	type Organization,
	type OrganizationUpdateInput,
	type OrgUserCreateInput,
	organizationsAPI,
} from "@/lib/api/organizations";
import type { User, UserRole } from "@/lib/types/user";
import { cn } from "@/lib/utils";

export default function OrganizationDetailPage() {
	const params = useParams();
	const orgId = params.id as string;

	const [organization, setOrganization] = useState<Organization | null>(null);
	const [users, setUsers] = useState<User[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [addUserModalOpen, setAddUserModalOpen] = useState(false);
	const [editOrgModalOpen, setEditOrgModalOpen] = useState(false);
	const isOrgActive = organization?.isActive ?? true;

	const fetchData = useCallback(async () => {
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
	}, [orgId]);

	useEffect(() => {
		if (orgId) {
			fetchData();
		}
	}, [fetchData, orgId]);

	const stats = useMemo(() => {
		const total = users.length;
		const active = users.filter((u) => u.isActive).length;
		const inactive = total - active;
		return { total, active, inactive };
	}, [users]);

	const handleCreateUser = async (data: OrgUserCreateInput) => {
		try {
			const newUser = await organizationsAPI.createOrgUser(orgId, data);
			setUsers((prev) => [...prev, newUser]);
			toast.success(`User "${newUser.email}" created`);
		} catch (error: unknown) {
			const message =
				error instanceof Error ? error.message : "Failed to create user";
			toast.error(message);
			throw error;
		}
	};

	const handleUpdateOrganization = async (
		id: string,
		data: OrganizationUpdateInput,
	) => {
		try {
			const updated = await organizationsAPI.update(id, data);
			setOrganization(updated);
			toast.success("Organization updated");
		} catch (error: unknown) {
			const message =
				error instanceof Error
					? error.message
					: "Failed to update organization";
			toast.error(message);
			throw error;
		}
	};

	const handleRoleChange = async (
		userId: string,
		newRole: Exclude<UserRole, "admin">,
	) => {
		try {
			const updated = await organizationsAPI.updateOrgUser(orgId, userId, {
				role: newRole,
			});
			setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
			toast.success("Role updated");
		} catch (error: unknown) {
			const message =
				error instanceof Error ? error.message : "Failed to update role";
			toast.error(message);
			throw error;
		}
	};

	const handleStatusChange = async (userId: string, isActive: boolean) => {
		try {
			const updated = await organizationsAPI.updateOrgUser(orgId, userId, {
				isActive,
			});
			setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
			toast.success(isActive ? "User activated" : "User deactivated");
		} catch (error: unknown) {
			const message =
				error instanceof Error ? error.message : "Failed to update status";
			toast.error(message);
			throw error;
		}
	};

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center gap-4">
					<Skeleton className="h-10 w-10 rounded-lg" />
					<Skeleton className="h-14 w-14 rounded-xl" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-7 w-48" />
						<Skeleton className="h-4 w-32" />
					</div>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<Skeleton className="h-20 rounded-xl" />
					<Skeleton className="h-20 rounded-xl" />
					<Skeleton className="h-20 rounded-xl" />
				</div>
				<Skeleton className="h-64 w-full rounded-lg" />
			</div>
		);
	}

	if (!organization) {
		return (
			<div className="flex flex-col items-center justify-center py-16 border rounded-xl bg-muted/20">
				<p className="text-muted-foreground mb-4">Organization not found</p>
				<Link href="/admin/organizations">
					<Button variant="outline">Back to Organizations</Button>
				</Link>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
				<Link href="/admin/organizations">
					<Button variant="ghost" size="icon" className="shrink-0">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div className="flex items-center gap-4 flex-1 min-w-0">
					<OrgAvatar
						name={organization.name}
						slug={organization.slug}
						size="lg"
					/>
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-3 flex-wrap">
							<h2 className="text-2xl font-semibold tracking-tight truncate">
								{organization.name}
							</h2>
							<Badge
								variant={organization.isActive ? "default" : "secondary"}
								className={cn(
									organization.isActive
										? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
										: "bg-muted text-muted-foreground",
								)}
							>
								{organization.isActive ? "Active" : "Inactive"}
							</Badge>
						</div>
						<p className="text-muted-foreground font-mono text-sm">
							{organization.slug}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<Button
						variant="outline"
						size="icon"
						onClick={fetchData}
						disabled={isLoading}
						aria-label="Refresh organization data"
					>
						<RefreshCcw
							className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
						/>
					</Button>
					<Button variant="outline" onClick={() => setEditOrgModalOpen(true)}>
						Edit
					</Button>
				</div>
			</div>

			{(organization.contactEmail || organization.contactPhone) && (
				<div className="flex items-center gap-6 text-sm text-muted-foreground px-1">
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
			)}
			{!isOrgActive && (
				<Alert className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
					<AlertTriangle className="h-4 w-4" />
					<AlertTitle>Organization inactive</AlertTitle>
					<AlertDescription>
						User changes are disabled until this organization is reactivated.
					</AlertDescription>
				</Alert>
			)}

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<AdminStatsCard
					label="Total Members"
					value={stats.total}
					icon={Users}
					variant="default"
				/>
				<AdminStatsCard
					label="Active Members"
					value={stats.active}
					icon={CheckCircle}
					variant="success"
				/>
				<AdminStatsCard
					label="Inactive"
					value={stats.inactive}
					icon={XCircle}
					variant="muted"
				/>
			</div>

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-lg">Organization Members</CardTitle>
							<CardDescription>Members of {organization.name}</CardDescription>
						</div>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<span tabIndex={!isOrgActive ? 0 : undefined}>
										<Button
											onClick={() => setAddUserModalOpen(true)}
											disabled={!isOrgActive}
										>
											<Plus className="h-4 w-4 mr-2" />
											Add Member
										</Button>
									</span>
								</TooltipTrigger>
								{!isOrgActive && (
									<TooltipContent>
										<p>Reactivate organization to add members</p>
									</TooltipContent>
								)}
							</Tooltip>
						</TooltipProvider>
					</div>
				</CardHeader>
				<CardContent>
					<UsersTable
						users={users}
						canEditRoles={isOrgActive}
						canEditStatus={isOrgActive}
						onRoleChange={handleRoleChange}
						onStatusChange={handleStatusChange}
					/>
				</CardContent>
			</Card>

			<AddUserModal
				open={addUserModalOpen}
				onOpenChange={setAddUserModalOpen}
				onSubmit={handleCreateUser}
				organizationName={organization.name}
			/>

			<EditOrgModal
				open={editOrgModalOpen}
				onOpenChange={setEditOrgModalOpen}
				organization={organization}
				onSubmit={handleUpdateOrganization}
			/>
		</div>
	);
}
