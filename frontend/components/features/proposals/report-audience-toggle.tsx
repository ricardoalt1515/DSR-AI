"use client";

/**
 * Report Audience Toggle
 *
 * A segmented control for switching between Internal (operator) and Client (external)
 * report views. Uses a pill-style design with smooth transitions.
 */

import { Building2, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export type ReportAudience = "internal" | "external";

interface ReportAudienceToggleProps {
    value: ReportAudience;
    onValueChange: (value: ReportAudience) => void;
    className?: string;
}

export function ReportAudienceToggle({
    value,
    onValueChange,
    className,
}: ReportAudienceToggleProps) {
    return (
        <div
            className={cn(
                "relative inline-flex items-center rounded-full bg-muted/80 p-1 backdrop-blur-sm",
                "border border-border/50 shadow-sm",
                className,
            )}
        >
            {/* Sliding pill indicator */}
            <div
                className={cn(
                    "absolute h-[calc(100%-8px)] w-[calc(50%-4px)] rounded-full",
                    "bg-background shadow-md border border-border/30",
                    "transition-transform duration-300 ease-out",
                    value === "external" ? "translate-x-[calc(100%+4px)]" : "translate-x-0",
                )}
                style={{ top: "4px", left: "4px" }}
            />

            {/* Internal button */}
            <button
                type="button"
                onClick={() => onValueChange("internal")}
                className={cn(
                    "relative z-10 flex items-center gap-2 px-4 py-2 rounded-full",
                    "text-sm font-medium transition-colors duration-200",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    value === "internal"
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground/80",
                )}
            >
                <Building2 className="h-4 w-4" />
                <span>Internal</span>
            </button>

            {/* External button */}
            <button
                type="button"
                onClick={() => onValueChange("external")}
                className={cn(
                    "relative z-10 flex items-center gap-2 px-4 py-2 rounded-full",
                    "text-sm font-medium transition-colors duration-200",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    value === "external"
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground/80",
                )}
            >
                <Users className="h-4 w-4" />
                <span>Client</span>
            </button>
        </div>
    );
}
