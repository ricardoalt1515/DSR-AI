"use client";

import { Home } from "lucide-react";
import Link from "next/link";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbItemData {
    label: string;
    href?: string;
}

interface PageBreadcrumbsProps {
    /** Array of breadcrumb items */
    items: BreadcrumbItemData[];
    /** Show home icon as first item */
    showHome?: boolean;
    /** Custom class name */
    className?: string;
}

/**
 * PageBreadcrumbs - Reusable breadcrumb navigation for page headers.
 *
 * Usage:
 * ```tsx
 * <PageBreadcrumbs
 *   items={[
 *     { label: "Projects", href: "/dashboard" },
 *     { label: "ACME Corp Assessment" },
 *   ]}
 * />
 * ```
 */
export function PageBreadcrumbs({
    items,
    showHome = true,
    className,
}: PageBreadcrumbsProps) {
    if (!items.length) return null;

    return (
        <Breadcrumb className={className}>
            <BreadcrumbList>
                {showHome && (
                    <>
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link
                                    href="/dashboard"
                                    className="flex items-center gap-1.5 hover:text-foreground"
                                >
                                    <Home className="h-3.5 w-3.5" />
                                    <span className="sr-only">Dashboard</span>
                                </Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                    </>
                )}

                {items.map((item, index) => {
                    const isLast = index === items.length - 1;

                    return (
                        <BreadcrumbItem key={item.label}>
                            {isLast ? (
                                <BreadcrumbPage>{item.label}</BreadcrumbPage>
                            ) : (
                                <>
                                    <BreadcrumbLink asChild>
                                        <Link href={item.href || "#"}>{item.label}</Link>
                                    </BreadcrumbLink>
                                    <BreadcrumbSeparator />
                                </>
                            )}
                        </BreadcrumbItem>
                    );
                })}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
