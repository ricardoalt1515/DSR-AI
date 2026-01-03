"use client";

import { AlertTriangle, Building2, Check, ChevronDown, Eye, Plus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { organizationsAPI } from "@/lib/api";
import { useOrganizationStore } from "@/lib/stores/organization-store";
import { cn } from "@/lib/utils";
import { OrgAvatar } from "./org-avatar";

interface OrgSwitcherProps {
	onCreateNew?: () => void;
}

type LoadState = "loading" | "loaded" | "retrying" | "error";

export function OrgSwitcher({ onCreateNew }: OrgSwitcherProps) {
	const [open, setOpen] = useState(false);
	const [loadState, setLoadState] = useState<LoadState>("loading");
	const {
		organizations,
		loadOrganizations,
		selectedOrgId,
		selectOrganization,
		clearSelection,
	} = useOrganizationStore();

	const selectedOrg = organizations.find((org) => org.id === selectedOrgId);
	const hasContext = !!selectedOrgId;
	const hasUnresolvedContext = hasContext && !selectedOrg && loadState !== "loading" && loadState !== "retrying";

	const fetchOrganizations = useCallback(async () => {
		setLoadState("loading");
		await loadOrganizations();

		const storedOrgId = selectedOrgId;
		const orgs = useOrganizationStore.getState().organizations;
		const foundOrg = orgs.find((org) => org.id === storedOrgId);

		if (storedOrgId && !foundOrg) {
			setLoadState("retrying");
			try {
				const org = await organizationsAPI.get(storedOrgId);
				useOrganizationStore.setState({
					organizations: [...orgs, org],
				});
				setLoadState("loaded");
			} catch {
				setLoadState("error");
			}
		} else {
			setLoadState("loaded");
		}
	}, [loadOrganizations, selectedOrgId]);

	useEffect(() => {
		fetchOrganizations();
	}, [fetchOrganizations]);

	const handleSelect = (orgId: string | null) => {
		if (orgId) {
			selectOrganization(orgId);
		} else {
			clearSelection();
		}
		setOpen(false);
	};

	if (loadState === "loading" || loadState === "retrying") {
		return (
			<div className="flex items-center gap-2">
				<Skeleton className="h-10 w-[240px] rounded-lg" />
				<span className="text-xs text-muted-foreground animate-pulse">
					{loadState === "retrying" ? "Verifying context..." : "Loading..."}
				</span>
			</div>
		);
	}

	if (hasUnresolvedContext) {
		return (
			<TooltipProvider>
				<div className="flex items-center gap-2">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="outline"
								className="w-[280px] justify-start gap-2 border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400"
							>
								<AlertTriangle className="h-4 w-4 shrink-0" />
								<span className="text-sm">Active context (org not loaded)</span>
								<code className="ml-auto text-xs font-mono opacity-70">
									{selectedOrgId?.slice(0, 8)}...
								</code>
							</Button>
						</TooltipTrigger>
						<TooltipContent side="bottom" className="max-w-[320px]">
							<p className="text-xs">
								A context filter is active but the organization could not be loaded.
								Clear the filter to view all organizations safely.
							</p>
						</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								onClick={clearSelection}
								className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-500/20"
							>
								<X className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="bottom">
							<p className="text-xs">Clear context filter</p>
						</TooltipContent>
					</Tooltip>
				</div>
			</TooltipProvider>
		);
	}

	return (
		<TooltipProvider>
			<div className="flex items-center gap-2">
				<Popover open={open} onOpenChange={setOpen}>
					<Tooltip>
						<TooltipTrigger asChild>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									role="combobox"
									aria-expanded={open}
									className={cn(
										"w-[240px] justify-between transition-all duration-200",
										"backdrop-blur-sm",
										open && "shadow-md ring-1 ring-primary/20",
										hasContext
											? "border-[var(--context-scoped-border)] bg-[var(--context-scoped-bg)] hover:bg-[var(--context-scoped-bg)]/80"
											: "border-dashed border-muted-foreground/30 bg-background/50 hover:bg-muted/50"
									)}
								>
									{selectedOrg ? (
										<div className="flex items-center gap-2.5 truncate">
											<Eye className="h-3.5 w-3.5 text-[var(--context-scoped-text)] shrink-0" />
											<span className="text-xs text-[var(--context-scoped-text)] shrink-0">
												Viewing:
											</span>
											<OrgAvatar name={selectedOrg.name} slug={selectedOrg.slug} size="sm" />
											<span className="truncate font-medium text-foreground">
												{selectedOrg.name}
											</span>
										</div>
									) : (
										<div className="flex items-center gap-2.5">
											<Building2 className="h-4 w-4 text-muted-foreground" />
											<span className="text-muted-foreground">All organizations</span>
										</div>
									)}
									<ChevronDown
										className={cn(
											"ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
											open && "rotate-180"
										)}
									/>
								</Button>
							</PopoverTrigger>
						</TooltipTrigger>
						<TooltipContent side="bottom" className="max-w-[280px]">
							<p className="text-xs">
								{hasContext
									? "All API requests are scoped to this organization"
									: "Showing data from all organizations"}
							</p>
						</TooltipContent>
					</Tooltip>
					<PopoverContent className="w-[300px] p-0" align="end">
						<Command>
							<CommandInput placeholder="Search organizations..." />
							<CommandList>
								<CommandEmpty>
									<div className="py-6 text-center">
										<Building2 className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
										<p className="text-sm font-medium">No organizations found</p>
										<p className="text-xs text-muted-foreground mt-1">
											Try a different search term
										</p>
									</div>
								</CommandEmpty>
								<CommandGroup heading="Scope">
									<CommandItem
										onSelect={() => handleSelect(null)}
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
								{organizations.length > 0 ? (
									<CommandGroup heading="Organizations">
										{organizations.map((org) => (
											<CommandItem
												key={org.id}
												value={`${org.name} ${org.slug}`}
												onSelect={() => handleSelect(org.id)}
												className="flex items-center gap-3"
											>
												<OrgAvatar name={org.name} slug={org.slug} size="sm" />
												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-2">
														<span className="truncate font-medium">{org.name}</span>
														{!org.isActive && (
															<Badge variant="secondary" className="text-[10px] px-1.5 py-0">
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
								) : (
									<CommandGroup heading="Organizations">
										<div className="py-6 text-center">
											<Building2 className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
											<p className="text-sm font-medium">No organizations yet</p>
											<p className="text-xs text-muted-foreground mt-1">
												Create your first organization to get started
											</p>
										</div>
									</CommandGroup>
								)}
								{onCreateNew && (
									<>
										<CommandSeparator />
										<CommandGroup>
											<CommandItem
												onSelect={() => {
													setOpen(false);
													onCreateNew();
												}}
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
					</PopoverContent>
				</Popover>

				{/* Persistent scoped badge - always visible when org is selected */}
				{hasContext && selectedOrg && (
					<Badge
						variant="outline"
						className="border-[var(--context-scoped-border)] bg-[var(--context-scoped-bg)] text-[var(--context-scoped-text)] gap-1.5 px-2 py-1"
					>
						<span className="h-1.5 w-1.5 rounded-full bg-[var(--context-scoped-text)] animate-pulse" />
						Scoped
					</Badge>
				)}

				{/* Clear button - only show when org is selected */}
				{hasContext && selectedOrg && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								onClick={clearSelection}
								className="h-8 w-8 text-muted-foreground hover:text-foreground"
							>
								<X className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="bottom">
							<p className="text-xs">Clear organization filter</p>
						</TooltipContent>
					</Tooltip>
				)}
			</div>
		</TooltipProvider>
	);
}
