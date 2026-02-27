"use client";

import { Crown, Mail, Pencil, Phone, Plus, Trash2, User } from "lucide-react";
import { useMemo, useState } from "react";
import { CompanyContactDialog } from "@/components/features/companies/company-contact-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { isForbiddenError } from "@/lib/api/client";
import { companiesAPI } from "@/lib/api/companies";
import { useToast } from "@/lib/hooks/use-toast";
import type { CompanyContact } from "@/lib/types/company";

interface CompanyContactsCardProps {
	companyId: string;
	contacts: CompanyContact[];
	canManageContacts: boolean;
	onContactsUpdated: () => void | Promise<void>;
}

export function CompanyContactsCard({
	companyId,
	contacts,
	canManageContacts,
	onContactsUpdated,
}: CompanyContactsCardProps) {
	const sortedContacts = useMemo(
		() =>
			[...contacts].sort((a, b) => {
				const nameA = (a.name ?? "").localeCompare(b.name ?? "", undefined, {
					sensitivity: "base",
				});
				if (nameA !== 0) return nameA;
				return a.id.localeCompare(b.id);
			}),
		[contacts],
	);

	const [loading, setLoading] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [contactToDelete, setContactToDelete] = useState<CompanyContact | null>(
		null,
	);
	const { toast } = useToast();

	const handleCreate = async (data: {
		name?: string;
		email?: string;
		phone?: string;
		title?: string;
		notes?: string;
		isPrimary: boolean;
	}) => {
		setLoading(true);
		try {
			await companiesAPI.createContact(companyId, data);
			toast({
				title: "Contact added",
				description: "Company contact saved successfully.",
			});
			await onContactsUpdated();
		} catch (error) {
			if (!isForbiddenError(error)) {
				toast({
					title: "Error",
					description:
						error instanceof Error ? error.message : "Failed to add contact",
					variant: "destructive",
				});
			}
			throw error;
		} finally {
			setLoading(false);
		}
	};

	const handleUpdate = async (
		contactId: string,
		data: {
			name?: string;
			email?: string;
			phone?: string;
			title?: string;
			notes?: string;
			isPrimary: boolean;
		},
	) => {
		setLoading(true);
		try {
			await companiesAPI.updateContact(companyId, contactId, data);
			toast({
				title: "Contact updated",
				description: "Company contact updated successfully.",
			});
			await onContactsUpdated();
		} catch (error) {
			if (!isForbiddenError(error)) {
				toast({
					title: "Error",
					description:
						error instanceof Error ? error.message : "Failed to update contact",
					variant: "destructive",
				});
			}
			throw error;
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async () => {
		if (!contactToDelete) return;
		setLoading(true);
		try {
			await companiesAPI.deleteContact(companyId, contactToDelete.id);
			toast({
				title: "Contact deleted",
				description: "Company contact removed successfully.",
			});
			setDeleteDialogOpen(false);
			setContactToDelete(null);
			await onContactsUpdated();
		} catch (error) {
			if (!isForbiddenError(error)) {
				toast({
					title: "Error",
					description:
						error instanceof Error ? error.message : "Failed to delete contact",
					variant: "destructive",
				});
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle className="text-xl font-semibold">Contacts</CardTitle>
				{canManageContacts && (
					<CompanyContactDialog
						trigger={
							<Button size="sm" disabled={loading}>
								<Plus className="mr-2 h-4 w-4" />
								Add Contact
							</Button>
						}
						onSubmit={handleCreate}
					/>
				)}
			</CardHeader>
			<CardContent className="space-y-4">
				{sortedContacts.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No contacts for this company yet.
					</p>
				) : (
					<div className="space-y-4">
						{sortedContacts.map((contact) => (
							<div key={contact.id} className="border rounded-lg p-4 space-y-3">
								<div className="flex items-start justify-between gap-3">
									<div className="space-y-1">
										<div className="flex items-center gap-2">
											<User className="h-4 w-4 text-muted-foreground" />
											<p className="text-sm font-semibold">
												{contact.name || "Unnamed"}
											</p>
											{contact.title && (
												<Badge variant="outline">{contact.title}</Badge>
											)}
											{contact.isPrimary && (
												<Badge variant="secondary" className="gap-1">
													<Crown className="h-3.5 w-3.5" />
													Primary
												</Badge>
											)}
										</div>
										{contact.email && (
											<div className="flex items-center gap-2 text-sm text-muted-foreground">
												<Mail className="h-4 w-4" />
												<span>{contact.email}</span>
											</div>
										)}
										{contact.phone && (
											<div className="flex items-center gap-2 text-sm text-muted-foreground">
												<Phone className="h-4 w-4" />
												<span>{contact.phone}</span>
											</div>
										)}
										{contact.notes && (
											<p className="text-sm text-muted-foreground whitespace-pre-wrap">
												{contact.notes}
											</p>
										)}
									</div>
									{canManageContacts && (
										<div className="flex items-center gap-2">
											<CompanyContactDialog
												contact={contact}
												trigger={
													<Button
														size="icon"
														variant="ghost"
														disabled={loading}
														aria-label={`Edit contact ${contact.name || "Unnamed"}`}
													>
														<Pencil className="h-4 w-4" />
													</Button>
												}
												onSubmit={(data) => handleUpdate(contact.id, data)}
											/>
											<Button
												size="icon"
												variant="ghost"
												disabled={loading}
												aria-label={`Delete contact ${contact.name || "Unnamed"}`}
												onClick={() => {
													setContactToDelete(contact);
													setDeleteDialogOpen(true);
												}}
											>
												<Trash2 className="h-4 w-4 text-destructive" />
											</Button>
										</div>
									)}
								</div>
							</div>
						))}
					</div>
				)}
			</CardContent>
			{canManageContacts && (
				<ConfirmDeleteDialog
					open={deleteDialogOpen}
					onOpenChange={(open) => {
						setDeleteDialogOpen(open);
						if (!open) setContactToDelete(null);
					}}
					onConfirm={handleDelete}
					title="Delete Contact"
					description="This will permanently delete this contact."
					itemName={contactToDelete?.name || "Unnamed"}
					loading={loading}
				/>
			)}
		</Card>
	);
}
