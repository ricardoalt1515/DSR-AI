"use client";

import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, HelpCircle, TrendingUp, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface HeroDecisionBannerProps {
    recommendation: "GO" | "NO-GO" | "INVESTIGATE";
    headline: string;
    confidence: "High" | "Medium" | "Low";
    roiSummary?: string;
}

const CONFIDENCE_CONFIG = {
    High: { percent: 90, color: "text-green-500", ring: "stroke-green-500" },
    Medium: { percent: 65, color: "text-yellow-500", ring: "stroke-yellow-500" },
    Low: { percent: 35, color: "text-red-500", ring: "stroke-red-500" },
} as const;

const DECISION_CONFIG = {
    GO: {
        icon: CheckCircle2,
        bg: "from-green-500/20 to-emerald-500/10",
        border: "border-green-500/50",
        text: "text-green-500",
        label: "GO",
    },
    "NO-GO": {
        icon: XCircle,
        bg: "from-red-500/20 to-rose-500/10",
        border: "border-red-500/50",
        text: "text-red-500",
        label: "NO-GO",
    },
    INVESTIGATE: {
        icon: HelpCircle,
        bg: "from-yellow-500/20 to-amber-500/10",
        border: "border-yellow-500/50",
        text: "text-yellow-500",
        label: "INVESTIGATE",
    },
} as const;

function ConfidenceRing({ confidence }: { confidence: "High" | "Medium" | "Low" }) {
    const config = CONFIDENCE_CONFIG[confidence];
    const circumference = 2 * Math.PI * 18;
    const strokeDashoffset = circumference - (config.percent / 100) * circumference;

    return (
        <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 44 44">
                <circle
                    cx="22"
                    cy="22"
                    r="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-muted/20"
                />
                <motion.circle
                    cx="22"
                    cy="22"
                    r="18"
                    fill="none"
                    strokeWidth="4"
                    strokeLinecap="round"
                    className={config.ring}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    style={{ strokeDasharray: circumference }}
                />
            </svg>
            <span className={cn("absolute text-xs font-bold", config.color)}>
                {confidence}
            </span>
        </div>
    );
}

function parseROI(roiSummary: string): { investment: string; revenue: string; percentage: string } | null {
    // Format: "Acquisition $5k → Revenue $28k/yr = 460% ROI"
    const investMatch = roiSummary.match(/\$[\d.,]+k?/);
    const revenueMatch = roiSummary.match(/Revenue\s+(\$[\d.,]+k?\/yr)/i) || roiSummary.match(/→\s+(\$[\d.,]+k?)/);
    const percentMatch = roiSummary.match(/(\d+)%/);

    if (!investMatch || !percentMatch) return null;

    return {
        investment: investMatch[0],
        revenue: revenueMatch?.[1] ?? "N/A",
        percentage: `${percentMatch[1]}%`,
    };
}

export function HeroDecisionBanner({
    recommendation,
    headline,
    confidence,
    roiSummary,
}: HeroDecisionBannerProps) {
    const config = DECISION_CONFIG[recommendation];
    const Icon = config.icon;
    const roi = roiSummary ? parseROI(roiSummary) : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Card className={cn(
                "border-2 overflow-hidden",
                config.border,
                "bg-gradient-to-br",
                config.bg
            )}>
                <CardContent className="p-6">
                    {/* Top Row: Decision + Confidence */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "flex items-center justify-center w-16 h-16 rounded-2xl",
                                "bg-background/80 backdrop-blur-sm shadow-lg"
                            )}>
                                <Icon className={cn("h-10 w-10", config.text)} />
                            </div>
                            <div>
                                <h2 className={cn("text-3xl font-black tracking-tight", config.text)}>
                                    {config.label}
                                </h2>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    DSR Recommendation
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col items-center">
                            <ConfidenceRing confidence={confidence} />
                            <span className="text-xs text-muted-foreground mt-1">Confidence</span>
                        </div>
                    </div>

                    {/* Headline */}
                    <p className="text-lg font-medium text-foreground/90 mb-4">
                        {headline}
                    </p>

                    {/* ROI Hero (if available) */}
                    {roi && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                            className={cn(
                                "flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl",
                                "bg-background/60 dark:bg-background/40 backdrop-blur-sm border border-border/50"
                            )}
                        >
                            <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-center sm:justify-start">
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground mb-1">Investment</p>
                                    <p className="text-lg sm:text-xl font-bold text-foreground">{roi.investment}</p>
                                </div>

                                <TrendingUp className="h-5 w-5 text-muted-foreground hidden sm:block" />
                                <span className="text-muted-foreground sm:hidden">→</span>

                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground mb-1">Annual Revenue</p>
                                    <p className="text-lg sm:text-xl font-bold text-foreground">{roi.revenue}</p>
                                </div>
                            </div>

                            <div className="text-center px-6 py-3 rounded-lg bg-green-500/20 dark:bg-green-500/10 border border-green-500/30">
                                <p className="text-2xl sm:text-3xl font-black text-green-600 dark:text-green-400">
                                    {roi.percentage}
                                </p>
                                <p className="text-xs text-green-600/80 dark:text-green-400/80">ROI</p>
                            </div>
                        </motion.div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
