"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, Crown, RefreshCcw, Shield, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
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
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	adminUsersAPI,
	type AdminCreateUserInput,
	type AdminUpdateUserInput,
	type User,
} from "@/lib/api";
import { useAuth } from "@/lib/contexts";

const PASSWORD_HINT = "Min 8 chars, 1 uppercase, 1 number";

export default function AdminUsersPage() {
	const { isAdmin } = useAuth();
	const [users, setUsers] = useState<User[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [modalOpen, setModalOpen] = useState(false);
	const [form, setForm] = useState({
		email: "",
		password: "",
		confirmPassword: "",
		firstName: "",
		lastName: "",
		role: "member" as "admin" | "member",
	});
	const [submitting, setSubmitting] = useState(false);
	const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

	useEffect(() => {
		if (!isAdmin) return;
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
	}, [isAdmin]);

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
			role: "member",
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
		const payload: AdminCreateUserInput = {
			email: form.email.trim(),
			password: form.password,
			firstName: form.firstName.trim(),
			lastName: form.lastName.trim(),
			isSuperuser: form.role === "admin",
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
		} catch {
			toast.error("Failed to update user");
		} finally {
			setUpdatingUserId(null);
		}
	};

	if (!isAdmin) {
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
					<CardDescription>Admins can promote members or deactivate accounts.</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="space-y-3">
							<Skeleton className="h-6 w-40" />
							{Array.from({ length: 4 }).map((_, idx) => (
								<Skeleton key={idx} className="h-12 w-full" />
							))}
						</div>
					) : users.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground">
							<p>No users yet. Create the first one.</p>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>Email</TableHead>
									<TableHead>Role</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{users.map((user) => (
									<TableRow key={user.id}>
										<TableCell>
											<div className="font-medium">
												{user.firstName} {user.lastName}
											</div>
											<div className="text-xs text-muted-foreground">
												Member since {new Date(user.createdAt).toLocaleDateString()}
											</div>
										</TableCell>
										<TableCell className="font-mono text-sm">{user.email}</TableCell>
										<TableCell>
											<span className="inline-flex items-center gap-2">
												{user.isSuperuser ? (
													<Crown className="h-4 w-4 text-amber-500" />
												) : (
													<Shield className="h-4 w-4 text-muted-foreground" />
												)}
												{user.isSuperuser ? "Admin" : "Member"}
											</span>
										</TableCell>
										<TableCell>
											<span className={user.isVerified ? "text-green-600" : "text-muted-foreground"}>
												{user.isVerified ? "Active" : "Pending"}
											</span>
										</TableCell>
										<TableCell className="text-right space-x-2">
											<Button
												variant={user.isSuperuser ? "outline" : "secondary"}
												size="sm"
												disabled={updatingUserId === user.id}
												onClick={() =>
													handleUpdateUser(
														user.id,
														{ isSuperuser: !user.isSuperuser },
														user.isSuperuser ? "Role set to member" : "Role set to admin",
													)
												}
											>
												{updatingUserId === user.id ? (
													<RefreshCcw className="h-4 w-4 animate-spin" />
												) : user.isSuperuser ? (
													"Make Member"
												) : (
													"Make Admin"
												)}
											</Button>
											<Button
												variant={user.isVerified ? "destructive" : "secondary"}
												size="sm"
												disabled={updatingUserId === user.id}
												onClick={() =>
													handleUpdateUser(
														user.id,
														{ isActive: !user.isVerified },
														user.isVerified ? "User deactivated" : "User activated",
													)
												}
											>
												{updatingUserId === user.id ? (
													<RefreshCcw className="h-4 w-4 animate-spin" />
												) : user.isVerified ? (
													<Ban className="h-4 w-4" />
												) : (
													"Activate"
												)}
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
							<TableCaption>Only admins can manage users.</TableCaption>
						</Table>
					)}
				</CardContent>
			</Card>

			<Dialog open={modalOpen} onOpenChange={setModalOpen}>
				<DialogTrigger asChild>
					<span />
				</DialogTrigger>
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
							<Select value={form.role} onValueChange={(value) => handleInputChange("role", value)}>
								<SelectTrigger>
									<SelectValue placeholder="Select role" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="member">Member</SelectItem>
									<SelectItem value="admin">Admin</SelectItem>
								</SelectContent>
							</Select>
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
		</div>
	);
}
