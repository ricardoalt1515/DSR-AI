"use client";

import { CheckCircle2, Circle, ChevronRight, X, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface OnboardingStep {
    id: string;
    label: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface OnboardingChecklistProps {
    /** Title of the checklist */
    title?: string;
    /** Steps to complete */
    steps: OnboardingStep[];
    /** IDs of completed steps */
    completedSteps: string[];
    /** Callback when user dismisses the checklist */
    onDismiss?: () => void;
    /** Callback when step action is clicked */
    onStepAction?: (stepId: string) => void;
    /** Whether the checklist can be dismissed */
    dismissible?: boolean;
    /** Custom class name */
    className?: string;
}

const STORAGE_KEY = "dsr-onboarding-dismissed";

/**
 * OnboardingChecklist - Progressive onboarding component for new users.
 *
 * Tracks completion progress and guides users through initial setup.
 */
export function OnboardingChecklist({
    title = "Getting Started",
    steps,
    completedSteps,
    onDismiss,
    onStepAction,
    dismissible = true,
    className,
}: OnboardingChecklistProps) {
    const [isDismissed, setIsDismissed] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);

    // Check if dismissed in localStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            const dismissed = localStorage.getItem(STORAGE_KEY);
            if (dismissed === "true") {
                setIsDismissed(true);
            }
        }
    }, []);

    const handleDismiss = useCallback(() => {
        setIsDismissed(true);
        if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY, "true");
        }
        onDismiss?.();
    }, [onDismiss]);

    const completedCount = completedSteps.length;
    const totalCount = steps.length;
    const progressPercent = Math.round((completedCount / totalCount) * 100);
    const isComplete = completedCount === totalCount;

    // Don't render if dismissed or complete
    if (isDismissed || isComplete) {
        return null;
    }

    return (
        <Card className={cn("border-primary/20 bg-gradient-to-br from-primary/5 to-transparent", className)}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm font-medium">{title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                            {completedCount}/{totalCount} completed
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            <ChevronRight
                                className={cn(
                                    "h-4 w-4 transition-transform",
                                    isExpanded && "rotate-90"
                                )}
                            />
                        </Button>
                        {dismissible && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                onClick={handleDismiss}
                            >
                                <X className="h-4 w-4" />
                                <span className="sr-only">Dismiss</span>
                            </Button>
                        )}
                    </div>
                </div>
                <Progress value={progressPercent} className="h-1.5 mt-2" />
            </CardHeader>

            {isExpanded && (
                <CardContent className="pt-0 space-y-2">
                    {steps.map((step) => {
                        const isCompleted = completedSteps.includes(step.id);

                        return (
                            <div
                                key={step.id}
                                className={cn(
                                    "flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors",
                                    isCompleted
                                        ? "bg-success/10"
                                        : "bg-muted/50 hover:bg-muted"
                                )}
                            >
                                <div className="mt-0.5">
                                    {isCompleted ? (
                                        <CheckCircle2 className="h-5 w-5 text-success" />
                                    ) : (
                                        <Circle className="h-5 w-5 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p
                                        className={cn(
                                            "text-sm font-medium",
                                            isCompleted && "text-muted-foreground line-through"
                                        )}
                                    >
                                        {step.label}
                                    </p>
                                    {step.description && !isCompleted && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {step.description}
                                        </p>
                                    )}
                                </div>
                                {step.action && !isCompleted && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-primary"
                                        onClick={() => {
                                            step.action?.onClick();
                                            onStepAction?.(step.id);
                                        }}
                                    >
                                        {step.action.label}
                                        <ChevronRight className="h-3 w-3 ml-1" />
                                    </Button>
                                )}
                            </div>
                        );
                    })}
                </CardContent>
            )}
        </Card>
    );
}

/**
 * Hook to manage onboarding state
 */
export function useOnboardingChecklist() {
    const resetOnboarding = useCallback(() => {
        if (typeof window !== "undefined") {
            localStorage.removeItem(STORAGE_KEY);
        }
    }, []);

    const dismissOnboarding = useCallback(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY, "true");
        }
    }, []);

    const isOnboardingDismissed = useCallback(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem(STORAGE_KEY) === "true";
        }
        return false;
    }, []);

    return {
        resetOnboarding,
        dismissOnboarding,
        isOnboardingDismissed,
    };
}
