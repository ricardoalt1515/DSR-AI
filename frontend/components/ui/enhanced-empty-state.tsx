"use client";

import { ArrowRight, CheckCircle2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type EmptyStateVariant = "default" | "first-time" | "no-results" | "error";

interface EnhancedEmptyStateProps {
    /** Visual variant of the empty state */
    variant?: EmptyStateVariant;
    /** Icon to display */
    icon: LucideIcon;
    /** Main title */
    title: string;
    /** Description text */
    description: string;
    /** Primary action button */
    action?: {
        label: string;
        onClick: () => void;
        icon?: LucideIcon;
    };
    /** Secondary action (link-style) */
    secondaryAction?: {
        label: string;
        onClick: () => void;
    };
    /** Tips or helpful hints to display */
    tips?: string[];
    /** Quick start steps for onboarding */
    steps?: Array<{
        label: string;
        completed?: boolean;
    }>;
    /** Additional class names */
    className?: string;
}

/**
 * EnhancedEmptyState - Rich empty state component for onboarding and guidance.
 *
 * Variants:
 * - `default`: Standard empty state
 * - `first-time`: Welcome state for new users with onboarding
 * - `no-results`: Search/filter returned no results
 * - `error`: Something went wrong
 */
export function EnhancedEmptyState({
    variant = "default",
    icon: Icon,
    title,
    description,
    action,
    secondaryAction,
    tips,
    steps,
    className,
}: EnhancedEmptyStateProps) {
    const ActionIcon = action?.icon;

    const variantStyles = {
        default: {
            card: "border-dashed",
            iconBg: "bg-muted",
            iconColor: "text-muted-foreground",
        },
        "first-time": {
            card: "bg-gradient-to-br from-primary/5 via-transparent to-accent/5 border-primary/20",
            iconBg: "bg-primary/10",
            iconColor: "text-primary",
        },
        "no-results": {
            card: "border-dashed border-muted-foreground/30",
            iconBg: "bg-muted",
            iconColor: "text-muted-foreground",
        },
        error: {
            card: "border-destructive/30 bg-destructive/5",
            iconBg: "bg-destructive/10",
            iconColor: "text-destructive",
        },
    };

    const styles = variantStyles[variant];

    return (
        <Card className={cn(styles.card, "overflow-hidden", className)}>
            <CardContent className="flex flex-col items-center justify-center gap-6 py-12 px-6 text-center">
                {/* Icon */}
                <div
                    className={cn(
                        "rounded-2xl p-4 transition-transform hover:scale-105",
                        styles.iconBg
                    )}
                >
                    <Icon className={cn("h-10 w-10", styles.iconColor)} />
                </div>

                {/* Text Content */}
                <div className="space-y-2 max-w-md">
                    <h3 className="text-xl font-semibold text-foreground">{title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {description}
                    </p>
                </div>

                {/* Onboarding Steps */}
                {steps && steps.length > 0 && (
                    <div className="w-full max-w-sm space-y-2">
                        {steps.map((step, index) => (
                            <div
                                key={index}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-4 py-2 text-left transition-colors",
                                    step.completed
                                        ? "bg-success/10 text-success"
                                        : "bg-muted/50 text-muted-foreground"
                                )}
                            >
                                <div
                                    className={cn(
                                        "flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium",
                                        step.completed
                                            ? "border-success bg-success text-success-foreground"
                                            : "border-border bg-background"
                                    )}
                                >
                                    {step.completed ? (
                                        <CheckCircle2 className="h-4 w-4" />
                                    ) : (
                                        index + 1
                                    )}
                                </div>
                                <span
                                    className={cn(
                                        "text-sm",
                                        step.completed && "line-through opacity-70"
                                    )}
                                >
                                    {step.label}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tips */}
                {tips && tips.length > 0 && (
                    <div className="w-full max-w-sm rounded-lg bg-muted/50 p-4">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                            Quick tips:
                        </p>
                        <ul className="space-y-1.5">
                            {tips.map((tip, index) => (
                                <li
                                    key={index}
                                    className="flex items-start gap-2 text-xs text-muted-foreground"
                                >
                                    <span className="text-primary mt-0.5">•</span>
                                    {tip}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Actions */}
                {(action || secondaryAction) && (
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        {action && (
                            <Button onClick={action.onClick} size="lg" className="gap-2">
                                {ActionIcon && <ActionIcon className="h-4 w-4" />}
                                {action.label}
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        )}
                        {secondaryAction && (
                            <Button
                                variant="ghost"
                                onClick={secondaryAction.onClick}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                {secondaryAction.label}
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
