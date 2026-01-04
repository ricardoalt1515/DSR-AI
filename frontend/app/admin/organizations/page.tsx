"use client";

import { Building2, CheckCircle, Loader2, Plus, RefreshCcw, Search, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	AdminStatsCard,
	EditOrgModal,
	OrgCard,
} from "@/components/features/admin";
import { Button } from "@/components/ui/button";
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
	type OrganizationUpdateInput,
} from "@/lib/api";
import { useOrganizationStore } from "@/lib/stores/organization-store";

function slugify(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, "")
		.replace(/[\s_-]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export default function AdminOrganizationsPage() {
	const { selectedOrgId, loadOrganizations } = useOrganizationStore();
	const [organizations, setOrganizations] = useState<Organization[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
	const [form, setForm] = useState({
		name: "",
		slug: "",
		contactEmail: "",
		contactPhone: "",
	});
	const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		fetchOrganizations();
	}, []);

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

	const stats = useMemo(() => {
		const total = organizations.length;
		const active = organizations.filter((org) => org.isActive).length;
		const inactive = total - active;
		return { total, active, inactive };
	}, [organizations]);

	const filteredOrganizations = useMemo(() => {
		let filtered = organizations;

		if (selectedOrgId) {
			filtered = filtered.filter((org) => org.id === selectedOrgId);
		}

		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(org) =>
					org.name.toLowerCase().includes(query) ||
					org.slug.toLowerCase().includes(query) ||
					org.contactEmail?.toLowerCase().includes(query)
			);
		}

		return filtered;
	}, [organizations, selectedOrgId, searchQuery]);

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
			const trimmedEmail = form.contactEmail.trim();
			const trimmedPhone = form.contactPhone.trim();
			const payload: OrganizationCreateInput = {
				name: form.name.trim(),
				slug: form.slug.trim(),
				...(trimmedEmail ? { contactEmail: trimmedEmail } : {}),
				...(trimmedPhone ? { contactPhone: trimmedPhone } : {}),
			};
			const newOrg = await organizationsAPI.create(payload);
			setOrganizations((prev) => [...prev, newOrg]);
			await loadOrganizations();
			toast.success(`Organization "${newOrg.name}" created`);
			setCreateModalOpen(false);
			resetForm();
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Failed to create organization";
			toast.error(message);
		} finally {
			setSubmitting(false);
		}
	};

	const handleUpdateOrganization = async (orgId: string, data: OrganizationUpdateInput) => {
		try {
			const updated = await organizationsAPI.update(orgId, data);
			setOrganizations((prev) =>
				prev.map((org) => (org.id === orgId ? updated : org))
			);
			await loadOrganizations();
			toast.success("Organization updated");
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Failed to update organization";
			toast.error(message);
			throw error;
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-2xl font-semibold tracking-tight">Organizations</h2>
					<p className="text-sm text-muted-foreground mt-1">
						Manage tenant organizations and their users
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="icon"
						onClick={fetchOrganizations}
						disabled={isLoading}
						aria-label="Refresh organizations list"
					>
						<RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
					</Button>
					<Button onClick={() => setCreateModalOpen(true)}>
						<Plus className="h-4 w-4 mr-2" />
						New Organization
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<AdminStatsCard
					label="Total"
					value={stats.total}
					icon={Building2}
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

			<div className="flex items-center gap-3">
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search organizations..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9"
					/>
				</div>
				{searchQuery && (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setSearchQuery("")}
						className="text-muted-foreground"
					>
						Clear
					</Button>
				)}
			</div>

			{isLoading ? (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{[1, 2, 3].map((i) => (
						<div key={i} className="p-6 border rounded-lg space-y-4">
							<div className="flex items-start gap-4">
								<Skeleton className="h-14 w-14 rounded-xl" />
								<div className="flex-1 space-y-2">
									<Skeleton className="h-5 w-32" />
									<Skeleton className="h-4 w-24" />
								</div>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<Skeleton className="h-12" />
								<Skeleton className="h-12" />
							</div>
							<Skeleton className="h-9 w-full" />
						</div>
					))}
				</div>
			) : filteredOrganizations.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-16 border rounded-xl bg-muted/20">
					<div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
						<Building2 className="h-8 w-8 text-primary/60" />
					</div>
					<h3 className="font-medium text-lg mb-1">
						{searchQuery
							? "No organizations found"
							: selectedOrgId
							? "No organization matches the filter"
							: "No organizations yet"}
					</h3>
					<p className="text-sm text-muted-foreground mb-4">
						{searchQuery
							? "Try adjusting your search query"
							: "Create your first organization to get started"}
					</p>
					{!searchQuery && !selectedOrgId && (
						<Button onClick={() => setCreateModalOpen(true)}>
							<Plus className="h-4 w-4 mr-2" />
							Create Organization
						</Button>
					)}
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{filteredOrganizations.map((org) => (
						<OrgCard
							key={org.id}
							organization={org}
							onEdit={(org) => setEditingOrg(org)}
						/>
					))}
				</div>
			)}

			<Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
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
								setCreateModalOpen(false);
								resetForm();
							}}
						>
							Cancel
						</Button>
						<Button
							onClick={handleCreateOrganization}
							disabled={!canSubmitForm || submitting}
						>
							{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							{submitting ? "Creating..." : "Create"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<EditOrgModal
				open={!!editingOrg}
				onOpenChange={(open) => !open && setEditingOrg(null)}
				organization={editingOrg}
				onSubmit={handleUpdateOrganization}
			/>
		</div>
	);
}
