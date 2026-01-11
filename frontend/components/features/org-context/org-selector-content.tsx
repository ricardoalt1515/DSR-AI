"use client";

import { Building2, Check, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import type { Organization } from "@/lib/api/organizations";
import { OrgAvatar } from "../admin/org-avatar";

interface OrgSelectorContentProps {
	organizations: Organization[];
	selectedOrgId?: string | null;
	onSelect: (orgId: string | null) => void;
	isLoading?: boolean;
	showAllOrgsOption?: boolean;
	onCreateNew?: () => void;
	autoFocus?: boolean;
}

const SKELETON_ROWS = 3;

function OrgSelectorSkeleton() {
	const rows = Array.from({ length: SKELETON_ROWS }, (_, index) => index);

	return (
		<div className="p-2 space-y-2">
			<Skeleton className="h-9 w-full rounded-md" />
			<div className="space-y-1 pt-2">
				{rows.map((rowIndex) => (
					<div key={rowIndex} className="flex items-center gap-3 p-2">
						<Skeleton className="h-8 w-8 rounded-lg" />
						<div className="flex-1 space-y-1">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-3 w-16" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function OrgSelectorEmpty({ hasOrganizations }: { hasOrganizations: boolean }) {
	const title = hasOrganizations
		? "No organizations found"
		: "No organizations yet";
	const description = hasOrganizations
		? "Try a different search term"
		: "Create your first organization to get started";

	return (
		<div className="py-6 text-center">
			<Building2 className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
			<p className="text-sm font-medium">{title}</p>
			<p className="text-xs text-muted-foreground mt-1">{description}</p>
		</div>
	);
}

/**
 * Shared organization selector content component.
 * Used by both OrgSwitcher (popover) and OrgSelectionModal (dialog).
 *
 * Features:
 * - Search functionality
 * - Organization list with avatars
 * - Optional "All organizations" option
 * - Optional "Create new" action
 * - Loading and empty states
 */
export function OrgSelectorContent({
	organizations,
	selectedOrgId,
	onSelect,
	isLoading = false,
	showAllOrgsOption = false,
	onCreateNew,
	autoFocus = true,
}: OrgSelectorContentProps) {
	if (isLoading) {
		return <OrgSelectorSkeleton />;
	}

	return (
		<Command>
			<CommandInput
				placeholder="Search organizations..."
				autoFocus={autoFocus}
			/>
			<CommandList>
				<CommandEmpty>
					<OrgSelectorEmpty hasOrganizations={organizations.length > 0} />
				</CommandEmpty>

				{showAllOrgsOption && (
					<>
						<CommandGroup heading="Scope">
							<CommandItem
								onSelect={() => onSelect(null)}
								className="flex items-center gap-3"
							>
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
									<Building2 className="h-4 w-4 text-muted-foreground" />
								</div>
								<div className="flex-1">
									<div className="font-medium">All organizations</div>
									<div className="text-xs text-muted-foreground">
										View platform-wide data
									</div>
								</div>
								{!selectedOrgId && (
									<Check className="ml-auto h-4 w-4 text-primary" />
								)}
							</CommandItem>
						</CommandGroup>
						<CommandSeparator />
					</>
				)}

				<CommandGroup heading="Organizations">
					{organizations.map((org) => (
						<CommandItem
							key={org.id}
							value={`${org.name} ${org.slug}`}
							onSelect={() => onSelect(org.id)}
							className="flex items-center gap-3"
						>
							<OrgAvatar name={org.name} slug={org.slug} size="sm" />
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2">
									<span className="truncate font-medium">{org.name}</span>
									{!org.isActive && (
										<Badge
											variant="secondary"
											className="text-[10px] px-1.5 py-0"
										>
											Inactive
										</Badge>
									)}
								</div>
								<div className="text-xs text-muted-foreground truncate font-mono">
									{org.slug}
								</div>
							</div>
							{selectedOrgId === org.id && (
								<Check className="ml-auto h-4 w-4 shrink-0 text-primary" />
							)}
						</CommandItem>
					))}
				</CommandGroup>

				{onCreateNew && (
					<>
						<CommandSeparator />
						<CommandGroup>
							<CommandItem
								onSelect={onCreateNew}
								className="flex items-center gap-3"
							>
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
									<Plus className="h-4 w-4 text-primary" />
								</div>
								<span className="font-medium">Create organization</span>
							</CommandItem>
						</CommandGroup>
					</>
				)}
			</CommandList>
		</Command>
	);
}
