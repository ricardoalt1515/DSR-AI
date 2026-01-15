"use client";

import { Calendar, Edit2, Mail, Phone, Users } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Organization } from "@/lib/api";
import { cn } from "@/lib/utils";
import { OrgAvatar } from "./org-avatar";

interface OrgCardProps {
	organization: Organization;
	userCount?: number;
	onEdit?: (org: Organization) => void;
}

export function OrgCard({ organization, userCount, onEdit }: OrgCardProps) {
	const createdDate = organization.createdAt
		? new Date(organization.createdAt).toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
			})
		: null;

	return (
		<Card
			className={cn(
				"group relative h-full transition-all duration-200",
				"hover:shadow-lg hover:border-primary/40 hover:-translate-y-1",
				!organization.isActive && "opacity-70",
			)}
		>
			<CardHeader className="pb-4">
				<div className="flex items-start gap-4">
					<OrgAvatar
						name={organization.name}
						slug={organization.slug}
						size="lg"
					/>
					<div className="flex-1 min-w-0 space-y-1">
						<div className="flex items-start justify-between gap-2">
							<div className="min-w-0">
								<h3 className="font-semibold text-base truncate leading-tight">
									{organization.name}
								</h3>
								<p className="font-mono text-xs text-muted-foreground mt-0.5">
									{organization.slug}
								</p>
							</div>
							<Badge
								variant={organization.isActive ? "default" : "secondary"}
								className={cn(
									"shrink-0",
									organization.isActive
										? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
										: "bg-muted text-muted-foreground",
								)}
							>
								{organization.isActive ? "Active" : "Inactive"}
							</Badge>
						</div>
					</div>
				</div>
			</CardHeader>
			<CardContent className="pt-0 space-y-4">
				<div className="grid grid-cols-2 gap-3">
					{userCount !== undefined && (
						<div className="flex items-center gap-2 text-sm">
							<div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted/50">
								<Users className="h-3.5 w-3.5 text-muted-foreground" />
							</div>
							<div>
								<p className="font-medium tabular-nums">{userCount}</p>
								<p className="text-xs text-muted-foreground">Members</p>
							</div>
						</div>
					)}
					{createdDate && (
						<div className="flex items-center gap-2 text-sm">
							<div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted/50">
								<Calendar className="h-3.5 w-3.5 text-muted-foreground" />
							</div>
							<div>
								<p className="font-medium">{createdDate}</p>
								<p className="text-xs text-muted-foreground">Created</p>
							</div>
						</div>
					)}
				</div>

				{(organization.contactEmail || organization.contactPhone) && (
					<div className="space-y-1.5 pt-2 border-t border-border/50">
						{organization.contactEmail && (
							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<Mail className="h-3 w-3 shrink-0" />
								<span className="truncate">{organization.contactEmail}</span>
							</div>
						)}
						{organization.contactPhone && (
							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<Phone className="h-3 w-3 shrink-0" />
								<span>{organization.contactPhone}</span>
							</div>
						)}
					</div>
				)}

				<div className="flex items-center gap-2 pt-2">
					<Link
						href={`/admin/organizations/${organization.id}`}
						className="flex-1"
					>
						<Button variant="outline" size="sm" className="w-full">
							<Users className="h-3.5 w-3.5 mr-2 text-blue-500" />
							Manage Members
						</Button>
					</Link>
					{onEdit && (
						<Button
							variant="ghost"
							size="sm"
							className="shrink-0"
							aria-label={`Edit ${organization.name}`}
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								onEdit(organization);
							}}
						>
							<Edit2 className="h-3.5 w-3.5" />
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
