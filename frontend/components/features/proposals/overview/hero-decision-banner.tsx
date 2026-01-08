"use client";

import { motion } from "framer-motion";
import { CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface HeroDecisionBannerProps {
    recommendation: "GO" | "NO-GO" | "INVESTIGATE";
    headline: string;
    confidence: "High" | "Medium" | "Low";
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
            <span className={cn("absolute text-[10px] font-semibold leading-none", config.color)}>
                {confidence}
            </span>
        </div>
    );
}

export function HeroDecisionBanner({
    recommendation,
    headline,
    confidence,
}: HeroDecisionBannerProps) {
    const config = DECISION_CONFIG[recommendation];
    const Icon = config.icon;

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
                    <p className="text-lg font-medium text-foreground/90">
                        {headline}
                    </p>
                </CardContent>
            </Card>
        </motion.div>
    );
}
