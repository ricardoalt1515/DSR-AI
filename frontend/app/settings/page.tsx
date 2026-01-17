"use client";

import { ArrowLeft, Key, Loader2, Moon, Sun, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useState } from "react";
import { toast } from "sonner";

import { SimplePasswordInput } from "@/components/features/auth";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authAPI } from "@/lib/api/auth";
import { useAuth } from "@/lib/contexts";

// Password requirements
const MIN_LENGTH = 8;

export default function SettingsPage() {
	const { logout, isAdmin } = useAuth();
	const { theme, setTheme } = useTheme();

	// Password form
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [changingPassword, setChangingPassword] = useState(false);

	// Delete account
	const [deleteText, setDeleteText] = useState("");
	const [deleting, setDeleting] = useState(false);

	// Password validation
	const passwordValid =
		newPassword.length >= MIN_LENGTH &&
		/[A-Z]/.test(newPassword) &&
		/[0-9]/.test(newPassword);
	const passwordsMatch = newPassword === confirmPassword;
	const canChangePassword =
		passwordValid && passwordsMatch && confirmPassword.length > 0;

	const handleChangePassword = async () => {
		if (!canChangePassword) return;
		setChangingPassword(true);
		try {
			await authAPI.changePassword("", newPassword);
			toast.success("Password changed successfully");
			setNewPassword("");
			setConfirmPassword("");
		} catch {
			toast.error("Failed to change password");
		} finally {
			setChangingPassword(false);
		}
	};

	const handleDeleteAccount = async () => {
		if (deleteText !== "DELETE") return;
		setDeleting(true);
		try {
			await authAPI.deleteAccount();
			toast.success("Account deleted");
			logout();
		} catch {
			toast.error("Failed to delete account");
			setDeleting(false);
		}
	};

	return (
		<div className="container max-w-xl mx-auto py-8 space-y-6">
			{/* Header */}
			<div className="flex items-center gap-3">
				<Button variant="ghost" size="icon" asChild>
					<Link href="/dashboard">
						<ArrowLeft className="h-4 w-4" />
					</Link>
				</Button>
				<h1 className="text-2xl font-bold">Settings</h1>
			</div>

			{/* Theme */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						{theme === "dark" ? (
							<Moon className="h-5 w-5" />
						) : (
							<Sun className="h-5 w-5" />
						)}
						Appearance
					</CardTitle>
					<CardDescription>Choose your preferred theme</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex gap-2">
						<Button
							variant={theme === "light" ? "default" : "outline"}
							onClick={() => setTheme("light")}
							className="flex-1"
						>
							<Sun className="h-4 w-4 mr-2" />
							Light
						</Button>
						<Button
							variant={theme === "dark" ? "default" : "outline"}
							onClick={() => setTheme("dark")}
							className="flex-1"
						>
							<Moon className="h-4 w-4 mr-2" />
							Dark
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Change Password */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Key className="h-5 w-5" />
						Change Password
					</CardTitle>
					<CardDescription>Update your account password</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-1">
						<Label htmlFor="newPassword">New Password</Label>
						<SimplePasswordInput
							id="newPassword"
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
							placeholder="Enter new password"
						/>
						<p className="text-xs text-muted-foreground">
							Min {MIN_LENGTH} chars, 1 uppercase, 1 number
						</p>
					</div>

					<div className="space-y-1">
						<Label htmlFor="confirmPassword">Confirm Password</Label>
						<SimplePasswordInput
							id="confirmPassword"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							placeholder="Confirm new password"
						/>
						{confirmPassword && !passwordsMatch && (
							<p className="text-xs text-destructive">
								Passwords don&apos;t match
							</p>
						)}
					</div>

					<Button
						onClick={handleChangePassword}
						disabled={!canChangePassword || changingPassword}
						className="w-full"
					>
						{changingPassword ? (
							<Loader2 className="h-4 w-4 mr-2 animate-spin" />
						) : (
							<Key className="h-4 w-4 mr-2" />
						)}
						Change Password
					</Button>
				</CardContent>
			</Card>

			{/* Danger Zone */}
			{isAdmin && (
				<Card className="border-destructive/50">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-destructive">
							<Trash2 className="h-5 w-5" />
							Danger Zone
						</CardTitle>
						<CardDescription>Permanently delete your account</CardDescription>
					</CardHeader>
					<CardContent>
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button variant="destructive" className="w-full">
									<Trash2 className="h-4 w-4 mr-2" />
									Delete Account
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Delete Account?</AlertDialogTitle>
									<AlertDialogDescription>
										This action cannot be undone. All your data will be
										permanently deleted.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<div className="py-4">
									<Label htmlFor="deleteConfirm">
										Type <span className="font-bold">DELETE</span> to confirm
									</Label>
									<Input
										id="deleteConfirm"
										value={deleteText}
										onChange={(e) =>
											setDeleteText(e.target.value.toUpperCase())
										}
										placeholder="DELETE"
										className="mt-2"
									/>
								</div>
								<AlertDialogFooter>
									<AlertDialogCancel onClick={() => setDeleteText("")}>
										Cancel
									</AlertDialogCancel>
									<AlertDialogAction
										onClick={handleDeleteAccount}
										disabled={deleteText !== "DELETE" || deleting}
										className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
									>
										{deleting && (
											<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										)}
										Delete Account
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
