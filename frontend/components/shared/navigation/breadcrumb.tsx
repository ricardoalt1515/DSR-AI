"use client";

import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
	label: string;
	href?: string;
	icon?: React.ComponentType<{ className?: string }>;
}

interface BreadcrumbProps {
	items: BreadcrumbItem[];
	className?: string;
}

/**
 * Breadcrumb navigation component
 * Shows hierarchical navigation path with optional icons
 */
export function Breadcrumb({ items, className }: BreadcrumbProps) {
	return (
		<nav
			aria-label="Breadcrumb"
			className={cn("flex items-center gap-2 text-sm", className)}
		>
			{/* Home link */}
			<Link
				href="/dashboard"
				className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
			>
				<Home className="h-4 w-4" />
				<span className="sr-only">Dashboard</span>
			</Link>

			{/* Breadcrumb items */}
			{items.map((item, index) => {
				const isLast = index === items.length - 1;
				const Icon = item.icon;

				return (
					<Fragment key={index}>
						<ChevronRight className="h-4 w-4 text-muted-foreground/50" />
						{item.href && !isLast ? (
							<Link
								href={item.href}
								className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
							>
								{Icon && <Icon className="h-4 w-4" />}
								<span>{item.label}</span>
							</Link>
						) : (
							<span
								className={cn(
									"flex items-center gap-1.5",
									isLast
										? "font-medium text-foreground"
										: "text-muted-foreground",
								)}
							>
								{Icon && <Icon className="h-4 w-4" />}
								<span>{item.label}</span>
							</span>
						)}
					</Fragment>
				);
			})}
		</nav>
	);
}
