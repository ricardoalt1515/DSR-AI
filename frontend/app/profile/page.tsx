"use client";

import { ArrowLeft, Loader2, Save, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/contexts";

export default function ProfilePage() {
	const { user, isLoading, updateUser } = useAuth();
	const [saving, setSaving] = useState(false);

	// Local form state
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [companyName, setCompanyName] = useState("");
	const [location, setLocation] = useState("");

	// Sync with user data
	useEffect(() => {
		if (user) {
			setFirstName(user.firstName || "");
			setLastName(user.lastName || "");
			setCompanyName(user.companyName || "");
			setLocation(user.location || "");
		}
	}, [user]);

	// Check for changes
	const hasChanges =
		user &&
		(firstName !== (user.firstName || "") ||
			lastName !== (user.lastName || "") ||
			companyName !== (user.companyName || "") ||
			location !== (user.location || ""));

	const canSave = firstName.trim() && lastName.trim() && hasChanges;
	const roleLabel = user?.isSuperuser ? "Admin" : "Member";
	const memberSince = user?.createdAt
		? new Date(user.createdAt).toLocaleDateString()
		: "—";

	const handleSave = async () => {
		if (!canSave) return;
		setSaving(true);
		try {
			// Build updates object dynamically to avoid TypeScript issues
			const updates: Record<string, string> = {
				firstName: firstName.trim(),
				lastName: lastName.trim(),
			};
			if (companyName.trim()) updates.companyName = companyName.trim();
			if (location.trim()) updates.location = location.trim();

			await updateUser(updates);
			toast.success("Profile updated");
		} catch {
			toast.error("Failed to update profile");
		} finally {
			setSaving(false);
		}
	};

	if (isLoading) {
		return (
			<div className="container max-w-xl mx-auto py-8 space-y-6">
				<Skeleton className="h-8 w-32" />
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	return (
		<div className="container max-w-xl mx-auto py-8 space-y-6">
			{/* Header */}
			<div className="flex items-center gap-3">
				<Button variant="ghost" size="icon" aria-label="Go back" asChild>
					<Link href="/dashboard">
						<ArrowLeft className="h-4 w-4" />
					</Link>
				</Button>
				<h1 className="text-2xl font-bold">Profile</h1>
			</div>

			{/* Profile Card */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<User className="h-5 w-5" />
						Personal Information
					</CardTitle>
					<CardDescription>Your account details</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Role & membership */}
					<div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
						<div>
							<span className="font-medium text-foreground">Role:</span>{" "}
							{roleLabel}
						</div>
						<div>
							<span className="font-medium text-foreground">Member since:</span>{" "}
							{memberSince}
						</div>
					</div>
					{/* Email (read-only) */}
					<div className="space-y-1">
						<Label className="text-muted-foreground">Email</Label>
						<Input value={user?.email || ""} disabled className="bg-muted" />
					</div>

					{/* Name */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1">
							<Label htmlFor="firstName">First Name</Label>
							<Input
								id="firstName"
								value={firstName}
								onChange={(e) => setFirstName(e.target.value)}
								placeholder="John"
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="lastName">Last Name</Label>
							<Input
								id="lastName"
								value={lastName}
								onChange={(e) => setLastName(e.target.value)}
								placeholder="Doe"
							/>
						</div>
					</div>

					{/* Company */}
					<div className="space-y-1">
						<Label htmlFor="company">Company</Label>
						<Input
							id="company"
							value={companyName}
							onChange={(e) => setCompanyName(e.target.value)}
							placeholder="ACME Corp"
						/>
					</div>

					{/* Location */}
					<div className="space-y-1">
						<Label htmlFor="location">Location</Label>
						<Input
							id="location"
							value={location}
							onChange={(e) => setLocation(e.target.value)}
							placeholder="San Francisco, CA"
						/>
					</div>

					{/* Save Button */}
					<div className="pt-4 flex justify-end">
						<Button onClick={handleSave} disabled={!canSave || saving}>
							{saving ? (
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							) : (
								<Save className="h-4 w-4 mr-2" />
							)}
							Save Changes
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
