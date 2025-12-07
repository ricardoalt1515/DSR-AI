"use client";

import { motion } from "framer-motion";
import { ArrowRight, DollarSign, Leaf, Lightbulb, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface DealSnapshotProps {
    revenueRange: { low: string; high: string };
    diversionRate: string;
    co2Avoided: string;
    businessIdeasCount: number;
}

export function DealSnapshot({
    revenueRange,
    diversionRate,
    co2Avoided,
    businessIdeasCount,
}: DealSnapshotProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
        >
            <Card className="border-none bg-slate-900 text-slate-50 shadow-xl overflow-hidden relative">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />

                <CardContent className="p-6 relative z-10">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                        {/* Revenue Section (Hero) */}
                        <div className="flex-1 w-full lg:w-auto border-b lg:border-b-0 lg:border-r border-slate-700/50 pb-6 lg:pb-0 lg:pr-8">
                            <div className="flex items-center gap-2 mb-2 text-slate-400 text-sm font-medium uppercase tracking-wider">
                                <DollarSign className="h-4 w-4 text-primary" />
                                Annual Revenue Potential
                            </div>
                            <div className="flex items-end gap-4">
                                <div>
                                    <div className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                                        {revenueRange.high}
                                    </div>
                                    <div className="text-sm text-slate-400 mt-1">
                                        Optimistic Scenario
                                    </div>
                                </div>
                                <div className="hidden sm:flex flex-col items-center pb-2 px-2">
                                    <span className="text-xs text-slate-500 mb-1">Range</span>
                                    <div className="w-16 h-1 bg-slate-700 rounded-full overflow-hidden">
                                        <div className="w-2/3 h-full bg-primary/50 ml-auto rounded-full" />
                                    </div>
                                </div>
                                <div className="text-right hidden sm:block">
                                    <div className="text-xl font-semibold text-slate-300">
                                        {revenueRange.low}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        Conservative
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Secondary Metrics Grid */}
                        <div className="flex-1 w-full lg:w-auto grid grid-cols-3 gap-4">
                            <MetricItem
                                icon={Target}
                                label="Diversion"
                                value={diversionRate}
                                color="text-emerald-400"
                            />
                            <MetricItem
                                icon={Leaf}
                                label="CO₂ Avoided"
                                value={co2Avoided}
                                color="text-green-400"
                            />
                            <MetricItem
                                icon={Lightbulb}
                                label="Pathways"
                                value={businessIdeasCount.toString()}
                                color="text-yellow-400"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

function MetricItem({
    icon: Icon,
    label,
    value,
    color,
}: {
    icon: any;
    label: string;
    value: string;
    color: string;
}) {
    return (
        <div className="flex flex-col items-center text-center p-2 rounded-lg hover:bg-white/5 transition-colors">
            <Icon className={cn("h-5 w-5 mb-2", color)} />
            <div className="text-xl font-bold text-white mb-0.5">{value}</div>
            <div className="text-xs text-slate-400 font-medium">{label}</div>
        </div>
    );
}
