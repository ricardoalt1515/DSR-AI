"use client";

import { Mail, Pencil, Phone, Plus, Trash2, User } from "lucide-react";
import { useState } from "react";
import { LocationContactDialog } from "@/components/features/locations/location-contact-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { locationsAPI } from "@/lib/api/companies";
import { useToast } from "@/lib/hooks/use-toast";
import type { LocationContact } from "@/lib/types/company";

interface LocationContactsCardProps {
	contacts: LocationContact[];
	locationId: string;
	canWriteContacts: boolean;
	onContactsUpdated: () => void | Promise<void>;
}

export function LocationContactsCard({
	contacts,
	locationId,
	canWriteContacts,
	onContactsUpdated,
}: LocationContactsCardProps) {
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [contactToDelete, setContactToDelete] =
		useState<LocationContact | null>(null);
	const [loading, setLoading] = useState(false);
	const { toast } = useToast();

	const handleCreate = async (data: {
		name: string;
		email?: string;
		phone?: string;
		title?: string;
		notes?: string;
	}) => {
		setLoading(true);
		try {
			await locationsAPI.createContact(locationId, data);
			toast({
				title: "Contact added",
				description: "Location contact saved successfully.",
			});
			await onContactsUpdated();
		} catch (error) {
			toast({
				title: "Error",
				description:
					error instanceof Error ? error.message : "Failed to add contact",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleUpdate = async (
		contactId: string,
		data: {
			name: string;
			email?: string;
			phone?: string;
			title?: string;
			notes?: string;
		},
	) => {
		setLoading(true);
		try {
			await locationsAPI.updateContact(locationId, contactId, data);
			toast({
				title: "Contact updated",
				description: "Location contact updated successfully.",
			});
			await onContactsUpdated();
		} catch (error) {
			toast({
				title: "Error",
				description:
					error instanceof Error ? error.message : "Failed to update contact",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async () => {
		if (!contactToDelete) return;
		setLoading(true);
		try {
			await locationsAPI.deleteContact(locationId, contactToDelete.id);
			toast({
				title: "Contact deleted",
				description: "Location contact removed successfully.",
			});
			setDeleteDialogOpen(false);
			setContactToDelete(null);
			await onContactsUpdated();
		} catch (error) {
			toast({
				title: "Error",
				description:
					error instanceof Error ? error.message : "Failed to delete contact",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle className="text-xl font-semibold">Contacts</CardTitle>
				{canWriteContacts && (
					<LocationContactDialog
						trigger={
							<Button size="sm">
								<Plus className="mr-2 h-4 w-4" />
								Add Contact
							</Button>
						}
						onSubmit={handleCreate}
					/>
				)}
			</CardHeader>
			<CardContent className="space-y-4">
				{contacts.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No contacts for this location yet.
					</p>
				) : (
					<div className="space-y-4">
						{contacts.map((contact) => (
							<div key={contact.id} className="border rounded-lg p-4 space-y-3">
								<div className="flex items-start justify-between gap-3">
									<div className="space-y-1">
										<div className="flex items-center gap-2">
											<User className="h-4 w-4 text-muted-foreground" />
											<p className="text-sm font-semibold">{contact.name}</p>
											{contact.title && (
												<Badge variant="outline">{contact.title}</Badge>
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
									{canWriteContacts && (
										<div className="flex items-center gap-2">
											<LocationContactDialog
												contact={contact}
												trigger={
													<Button size="icon" variant="ghost">
														<Pencil className="h-4 w-4" />
													</Button>
												}
												onSubmit={(data) => handleUpdate(contact.id, data)}
											/>
											<Button
												size="icon"
												variant="ghost"
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
			<ConfirmDeleteDialog
				open={deleteDialogOpen}
				onOpenChange={(open) => {
					setDeleteDialogOpen(open);
					if (!open) setContactToDelete(null);
				}}
				onConfirm={handleDelete}
				title="Delete Contact"
				description="This will permanently delete this contact."
				itemName={contactToDelete?.name}
				loading={loading}
			/>
		</Card>
	);
}
