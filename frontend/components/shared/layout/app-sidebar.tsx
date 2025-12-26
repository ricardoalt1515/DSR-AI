"use client";

import {
    Building2,
    ChevronRight,
    FolderOpen,
    Home,
    Plus,
    Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { PremiumProjectWizard } from "@/components/features/dashboard";
import { DSRLogo } from "@/components/shared/branding/dsr-logo";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarRail,
    useSidebar,
} from "@/components/ui/sidebar";
import { routes } from "@/lib/routes";
import { useProjects, useEnsureProjectsLoaded } from "@/lib/stores";
import { cn } from "@/lib/utils";

// Navigation config - single source of truth
const NAV_ITEMS = [
    { title: "Dashboard", href: "/dashboard", icon: Home },
    { title: "Companies", href: "/companies", icon: Building2 },
    { title: "Settings", href: "/settings", icon: Settings },
] as const;

const MAX_RECENT_PROJECTS = 5;

/**
 * AppSidebar - Main navigation sidebar using shadcn sidebar component.
 * Collapsible on desktop (icon mode), sheet on mobile.
 */
export function AppSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { state } = useSidebar();
    const isCollapsed = state === "collapsed";

    const projects = useProjects();
    useEnsureProjectsLoaded();

    const [projectsOpen, setProjectsOpen] = useState(true);
    const [createModalOpen, setCreateModalOpen] = useState(false);

    const recentProjects = projects.slice(0, MAX_RECENT_PROJECTS);

    const isActive = (href: string) => pathname?.startsWith(href);

    return (
        <>
            <Sidebar collapsible="icon" className="border-r">
                <SidebarHeader className="border-b border-sidebar-border">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                size="lg"
                                className="data-[state=open]:bg-sidebar-accent"
                                asChild
                            >
                                <Link href="/dashboard">
                                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                        <DSRLogo width={20} height={20} showText={false} />
                                    </div>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold">DSR Inc.</span>
                                        <span className="truncate text-xs text-muted-foreground">
                                            Waste Platform
                                        </span>
                                    </div>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarHeader>

                <SidebarContent>
                    {/* Main Navigation */}
                    <SidebarGroup>
                        <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {NAV_ITEMS.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive(item.href)}
                                            tooltip={item.title}
                                        >
                                            <Link href={item.href}>
                                                <item.icon className="h-4 w-4" />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    {/* Recent Projects - Collapsible */}
                    <SidebarGroup>
                        <Collapsible
                            open={projectsOpen && !isCollapsed}
                            onOpenChange={setProjectsOpen}
                            className="group/collapsible"
                        >
                            <SidebarGroupLabel asChild>
                                <CollapsibleTrigger className="flex w-full items-center justify-between">
                                    <span>Recent Waste Streams</span>
                                    <ChevronRight
                                        className={cn(
                                            "h-4 w-4 transition-transform",
                                            projectsOpen && "rotate-90"
                                        )}
                                    />
                                </CollapsibleTrigger>
                            </SidebarGroupLabel>
                            <CollapsibleContent>
                                <SidebarGroupContent>
                                    <SidebarMenu>
                                        {recentProjects.length === 0 ? (
                                            <SidebarMenuItem>
                                                <SidebarMenuButton disabled className="text-muted-foreground">
                                                    <span className="text-xs">No waste streams yet</span>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        ) : (
                                            recentProjects.map((project) => (
                                                <SidebarMenuItem key={project.id}>
                                                    <SidebarMenuButton
                                                        asChild
                                                        isActive={pathname?.includes(project.id)}
                                                        tooltip={project.name}
                                                    >
                                                        <Link href={routes.project.detail(project.id)}>
                                                            <FolderOpen className="h-4 w-4" />
                                                            <span className="truncate">{project.name}</span>
                                                        </Link>
                                                    </SidebarMenuButton>
                                                </SidebarMenuItem>
                                            ))
                                        )}
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </CollapsibleContent>
                        </Collapsible>
                    </SidebarGroup>
                </SidebarContent>

                <SidebarFooter className="border-t border-sidebar-border">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => setCreateModalOpen(true)}
                                className="bg-primary/10 text-primary hover:bg-primary/20"
                                tooltip="New Waste Stream"
                            >
                                <Plus className="h-4 w-4" />
                                <span>New Waste Stream</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>

                <SidebarRail />
            </Sidebar>

            <PremiumProjectWizard
                open={createModalOpen}
                onOpenChange={setCreateModalOpen}
                onProjectCreated={(projectId) => {
                    router.push(routes.project.detail(projectId));
                }}
            />
        </>
    );
}
