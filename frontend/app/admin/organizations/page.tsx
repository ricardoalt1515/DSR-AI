"use client";

import { ArrowRight, Building2, Plus, RefreshCcw } from "lucide-react";
import Link from "next/link";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
	organizationsAPI,
	type Organization,
	type OrganizationCreateInput,
} from "@/lib/api";
import { useAuth } from "@/lib/contexts";

function slugify(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, "")
		.replace(/[\s_-]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export default function AdminOrganizationsPage() {
	const { isSuperAdmin } = useAuth();
	const [organizations, setOrganizations] = useState<Organization[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [modalOpen, setModalOpen] = useState(false);
	const [form, setForm] = useState({
		name: "",
		slug: "",
		contactEmail: "",
		contactPhone: "",
	});
	const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (!isSuperAdmin) return;
		fetchOrganizations();
	}, [isSuperAdmin]);

	const fetchOrganizations = async () => {
		try {
			setIsLoading(true);
			const data = await organizationsAPI.list();
			setOrganizations(data);
		} catch {
			toast.error("Failed to load organizations");
		} finally {
			setIsLoading(false);
		}
	};

	const handleNameChange = (value: string) => {
		setForm((prev) => ({
			...prev,
			name: value,
			slug: slugManuallyEdited ? prev.slug : slugify(value),
		}));
	};

	const handleSlugChange = (value: string) => {
		setSlugManuallyEdited(true);
		setForm((prev) => ({ ...prev, slug: slugify(value) }));
	};

	const handleInputChange = (field: "contactEmail" | "contactPhone", value: string) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	const resetForm = () => {
		setForm({ name: "", slug: "", contactEmail: "", contactPhone: "" });
		setSlugManuallyEdited(false);
	};

	const canSubmitForm = useMemo(() => {
		return form.name.trim() !== "" && form.slug.trim() !== "";
	}, [form.name, form.slug]);

	const handleCreateOrganization = async () => {
		if (!canSubmitForm) return;

		setSubmitting(true);
		try {
			const payload: OrganizationCreateInput = {
				name: form.name.trim(),
				slug: form.slug.trim(),
				contactEmail: form.contactEmail.trim() || undefined,
				contactPhone: form.contactPhone.trim() || undefined,
			};
			const newOrg = await organizationsAPI.create(payload);
			setOrganizations((prev) => [...prev, newOrg]);
			toast.success(`Organization "${newOrg.name}" created`);
			setModalOpen(false);
			resetForm();
		} catch (error: any) {
			toast.error(error.message || "Failed to create organization");
		} finally {
			setSubmitting(false);
		}
	};

	if (!isSuperAdmin) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-muted-foreground">Access denied. Platform Admin only.</p>
			</div>
		);
	}

	return (
		<div className="container mx-auto py-6 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Organizations</h1>
					<p className="text-muted-foreground">
						Manage tenant organizations and their users
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" size="icon" onClick={fetchOrganizations}>
						<RefreshCcw className="h-4 w-4" />
					</Button>
					<Button onClick={() => setModalOpen(true)}>
						<Plus className="h-4 w-4 mr-2" />
						New Organization
					</Button>
				</div>
			</div>

			{isLoading ? (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{[1, 2, 3].map((i) => (
						<Card key={i}>
							<CardHeader>
								<Skeleton className="h-5 w-32" />
								<Skeleton className="h-4 w-24" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-4 w-full" />
							</CardContent>
						</Card>
					))}
				</div>
			) : organizations.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<Building2 className="h-12 w-12 text-muted-foreground mb-4" />
						<p className="text-muted-foreground">No organizations yet</p>
						<Button className="mt-4" onClick={() => setModalOpen(true)}>
							<Plus className="h-4 w-4 mr-2" />
							Create First Organization
						</Button>
					</CardContent>
				</Card>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{organizations.map((org) => (
						<Link key={org.id} href={`/admin/organizations/${org.id}`}>
							<Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
								<CardHeader className="pb-2">
									<div className="flex items-start justify-between">
										<CardTitle className="text-lg">{org.name}</CardTitle>
										<Badge variant={org.isActive ? "default" : "secondary"}>
											{org.isActive ? "Active" : "Inactive"}
										</Badge>
									</div>
									<CardDescription className="font-mono text-xs">
										{org.slug}
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="flex items-center justify-between text-sm text-muted-foreground">
										<span>
											{org.contactEmail || "No contact email"}
										</span>
										<ArrowRight className="h-4 w-4" />
									</div>
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
			)}

			<Dialog open={modalOpen} onOpenChange={setModalOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create Organization</DialogTitle>
						<DialogDescription>
							Add a new tenant organization to the platform
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="name">Name *</Label>
							<Input
								id="name"
								placeholder="Acme Corporation"
								value={form.name}
								onChange={(e) => handleNameChange(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="slug">Slug *</Label>
							<Input
								id="slug"
								placeholder="acme-corp"
								value={form.slug}
								onChange={(e) => handleSlugChange(e.target.value)}
								className="font-mono"
							/>
							<p className="text-xs text-muted-foreground">
								Auto-generated from name. URL-friendly identifier.
							</p>
						</div>
						<div className="space-y-2">
							<Label htmlFor="contactEmail">Contact Email</Label>
							<Input
								id="contactEmail"
								type="email"
								placeholder="admin@acme.com"
								value={form.contactEmail}
								onChange={(e) => handleInputChange("contactEmail", e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="contactPhone">Contact Phone</Label>
							<Input
								id="contactPhone"
								placeholder="+1 555 123 4567"
								value={form.contactPhone}
								onChange={(e) => handleInputChange("contactPhone", e.target.value)}
							/>
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
							onClick={handleCreateOrganization}
							disabled={!canSubmitForm || submitting}
						>
							{submitting ? "Creating..." : "Create"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
