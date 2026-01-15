"use client";

import { ChevronDown, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/lib/contexts";
import { useOrganizationStore } from "@/lib/stores/organization-store";
import { cn } from "@/lib/utils";

interface OrgContextBadgeProps {
	className?: string;
}

/**
 * Compact badge showing current organization context in the navbar.
 * Only visible for super admins when an organization is selected.
 *
 * Clicking opens the OrgSelectionModal to switch organizations.
 */
export function OrgContextBadge({ className }: OrgContextBadgeProps) {
	const { isSuperAdmin } = useAuth();
	const { selectedOrgId, organizations, openOrgSwitchModal } =
		useOrganizationStore();

	if (!isSuperAdmin || !selectedOrgId) {
		return null;
	}

	const selectedOrg = organizations.find((org) => org.id === selectedOrgId);
	const orgName = selectedOrg?.name || "Organization";

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						onClick={openOrgSwitchModal}
						className={cn(
							"gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground",
							"border border-dashed border-border/50 hover:border-border",
							"h-8 px-2.5",
							className,
						)}
					>
						<Filter className="h-3 w-3" />
						<span className="max-w-[120px] truncate">{orgName}</span>
						<ChevronDown className="h-3 w-3 opacity-50" />
					</Button>
				</TooltipTrigger>
				<TooltipContent side="bottom">
					<p className="text-xs">
						Viewing data for <strong>{orgName}</strong>
					</p>
					<p className="text-xs text-muted-foreground">Click to switch</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
