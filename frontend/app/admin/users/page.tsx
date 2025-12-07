"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, Crown, RefreshCcw, Shield, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "@/lib/api";
import { useAuth } from "@/lib/contexts";

const PASSWORD_HINT = "Min 8 chars, 1 uppercase, 1 number";

export default function AdminUsersPage() {
	const { isAdmin, user: currentUser } = useAuth();
	const [users, setUsers] = useState<User[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [modalOpen, setModalOpen] = useState(false);
	const [form, setForm] = useState({
		email: "",
		password: "",
		confirmPassword: "",
		firstName: "",
		lastName: "",
		role: "field_agent" as "admin" | "field_agent" | "contractor" | "compliance" | "sales",
	});
	const [submitting, setSubmitting] = useState(false);
	const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
	const [resetUserId, setResetUserId] = useState<string | null>(null);
	const [resetPassword, setResetPassword] = useState("");
	const [resetConfirmPassword, setResetConfirmPassword] = useState("");
	const [resetSubmitting, setResetSubmitting] = useState(false);

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
			isSuperuser: form.role === "admin",
			role: form.role,
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
						<TooltipProvider delayDuration={200}>
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
												<div className="flex items-center gap-2 flex-wrap">
													<div className="font-medium">
														{user.firstName} {user.lastName}
													</div>
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
											</TableCell>
											<TableCell className="font-mono text-sm">{user.email}</TableCell>
											<TableCell>
												<span className="inline-flex items-center gap-2">
													{user.role === "admin" || user.isSuperuser ? (
														<Crown className="h-4 w-4 text-amber-500" />
													) : (
														<Shield className="h-4 w-4 text-muted-foreground" />
													)}
													{user.role?.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase()) ?? (user.isSuperuser ? "Admin" : "Field Agent")}
												</span>
											</TableCell>
											<TableCell>
												<div className="flex flex-col space-y-0.5">
													<span className={user.isActive ? "text-green-600" : "text-muted-foreground"}>
														{user.isActive ? "Active · Can sign in" : "Disabled · Login blocked"}
													</span>
													{!user.isVerified && (
														<span className="text-xs text-muted-foreground">Email not verified</span>
													)}
												</div>
											</TableCell>
											<TableCell className="text-right space-x-2">
												{(() => {
													const isSelf = currentUser?.id === user.id;
													const isLastActiveAdmin = user.isSuperuser && user.isActive && lastActiveAdminId === user.id;
													const disableRoleChange = isSelf || isLastActiveAdmin;
													const roleTooltipMessage = isSelf
														? "You can't change your own role"
														: isLastActiveAdmin
															? "Keep at least one active admin"
															: "";

													const roleButton = (
														<Button
															variant={user.isSuperuser ? "outline" : "secondary"}
															size="sm"
															disabled={disableRoleChange || updatingUserId === user.id}
															onClick={() => {
																const nextIsSuperuser = !user.isSuperuser;
																const updates: AdminUpdateUserInput = nextIsSuperuser
																	? { isSuperuser: true, role: "admin" }
																	: { isSuperuser: false, role: "field_agent" };

																handleUpdateUser(
																	user.id,
																	updates,
																	nextIsSuperuser
																		? `${user.firstName} promoted to Admin`
																		: `${user.firstName} is now Member`,
																);
															}}
														>
															{updatingUserId === user.id ? (
																<RefreshCcw className="h-4 w-4 animate-spin" />
															) : user.isSuperuser ? (
																"Make Member"
															) : (
																"Make Admin"
															)}
														</Button>
													);

													return roleTooltipMessage ? (
														<Tooltip>
															<TooltipTrigger asChild>{roleButton}</TooltipTrigger>
															<TooltipContent>{roleTooltipMessage}</TooltipContent>
														</Tooltip>
													) : (
														roleButton
													);
												})()}
												{(() => {
													const isSelf = currentUser?.id === user.id;
													const isLastActiveAdmin = user.isSuperuser && user.isActive && lastActiveAdminId === user.id;
													const disableStatusChange = isSelf || isLastActiveAdmin;
													const statusTooltipMessage = isSelf
														? "You can't deactivate your own account"
														: isLastActiveAdmin
															? "Keep at least one active admin"
															: "";

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

													return statusTooltipMessage ? (
														<Tooltip>
															<TooltipTrigger asChild>{statusButton}</TooltipTrigger>
															<TooltipContent>{statusTooltipMessage}</TooltipContent>
														</Tooltip>
													) : (
														statusButton
													);
												})()}
												<Button
													variant="outline"
													size="sm"
													onClick={() => handleOpenResetDialog(user.id)}
												>
													Reset password
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
								<TableCaption>Only admins can manage users.</TableCaption>
							</Table>
						</TooltipProvider>
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
									<SelectItem value="field_agent">Field Agent</SelectItem>
									<SelectItem value="contractor">Contractor</SelectItem>
									<SelectItem value="compliance">Compliance</SelectItem>
									<SelectItem value="sales">Sales</SelectItem>
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
							{resetSubmitting ? (
								<RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
							) : null}
							{resetSubmitting ? "Updating..." : "Update password"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
