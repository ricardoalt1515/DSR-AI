"use client";

import { CheckCircle, Plus, RefreshCcw, Users, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AddUserModal, AdminStatsCard, UsersTable } from "@/components/features/admin";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	organizationsAPI,
	type OrgUserCreateInput,
} from "@/lib/api";
import { useAuth } from "@/lib/contexts";
import type { User, UserRole } from "@/lib/types/user";

export default function SettingsTeamPage() {
	const { user: currentUser, isOrgAdmin, isSuperAdmin } = useAuth();
	const canManageUsers = isOrgAdmin;

	const [users, setUsers] = useState<User[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [modalOpen, setModalOpen] = useState(false);

	useEffect(() => {
		if (!canManageUsers) return;
		fetchUsers();
	}, [canManageUsers]);

	const fetchUsers = async () => {
		try {
			setIsLoading(true);
			const data = await organizationsAPI.listMyOrgUsers();
			setUsers(data);
		} catch {
			toast.error("Failed to load team members");
		} finally {
			setIsLoading(false);
		}
	};

	const stats = useMemo(() => {
		const total = users.length;
		const active = users.filter((u) => u.isActive).length;
		const inactive = total - active;
		return { total, active, inactive };
	}, [users]);

	const handleCreateUser = async (data: OrgUserCreateInput) => {
		try {
			const newUser = await organizationsAPI.createMyOrgUser(data);
			setUsers((prev) => [...prev, newUser]);
			toast.success(`User "${newUser.email}" created`);
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Failed to create user";
			toast.error(message);
			throw error;
		}
	};

	const handleRoleChange = async (userId: string, newRole: Exclude<UserRole, "admin">) => {
		try {
			const updated = await organizationsAPI.updateMyOrgUser(userId, { role: newRole });
			setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
			toast.success("Role updated");
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Failed to update role";
			toast.error(message);
			throw error;
		}
	};

	const handleStatusChange = async (userId: string, isActive: boolean) => {
		try {
			const updated = await organizationsAPI.updateMyOrgUser(userId, { isActive });
			setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
			toast.success(isActive ? "User activated" : "User deactivated");
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Failed to update status";
			toast.error(message);
			throw error;
		}
	};

	if (!canManageUsers) {
		if (isSuperAdmin) {
			return (
				<div className="flex items-center justify-center min-h-[400px]">
					<p className="text-muted-foreground">
						Platform Admins should manage teams via Admin Console.
					</p>
				</div>
			);
		}
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-muted-foreground">
					Access denied. Only Org Admins can manage team members.
				</p>
			</div>
		);
	}

	return (
		<div className="container mx-auto py-6 space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Team</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Manage your organization's team members
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" size="icon" onClick={fetchUsers} disabled={isLoading}>
						<RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
					</Button>
					<Button onClick={() => setModalOpen(true)}>
						<Plus className="h-4 w-4 mr-2" />
						Add Member
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<AdminStatsCard
					label="Total Members"
					value={stats.total}
					icon={Users}
					variant="default"
				/>
				<AdminStatsCard
					label="Active"
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
							<CardTitle className="text-lg">Team Members</CardTitle>
							<CardDescription>
								Users who have access to your organization
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="space-y-2">
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
						</div>
					) : (
						<UsersTable
							users={users}
							currentUserId={currentUser?.id}
							canEditRoles
							canEditStatus
							onRoleChange={handleRoleChange}
							onStatusChange={handleStatusChange}
						/>
					)}
				</CardContent>
			</Card>

			<AddUserModal
				open={modalOpen}
				onOpenChange={setModalOpen}
				onSubmit={handleCreateUser}
			/>
		</div>
	);
}
