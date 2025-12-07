"use client";

import { motion } from "framer-motion";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FinancialsSnapshotProps {
    currentCost: string;
    dsrOffer: string;
    dsrMargin: string;
}

export function FinancialsSnapshot({
    currentCost,
    dsrOffer,
    dsrMargin,
}: FinancialsSnapshotProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
        >
            <Card className="overflow-hidden">
                <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Financial Flow</h3>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                        {/* Current Cost */}
                        <div className="flex-1 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingDown className="h-4 w-4 text-red-500" />
                                <span className="text-xs font-medium text-red-600 dark:text-red-400">
                                    Current Cost
                                </span>
                            </div>
                            <p className="text-lg font-bold text-red-700 dark:text-red-300">
                                {currentCost}
                            </p>
                            <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1">
                                What client pays now
                            </p>
                        </div>

                        {/* Arrow */}
                        <div className="hidden sm:flex items-center justify-center">
                            <ArrowRight className="h-6 w-6 text-muted-foreground" />
                        </div>

                        {/* DSR Offer */}
                        <div className="flex-1 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                    DSR Offer
                                </span>
                            </div>
                            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                {dsrOffer}
                            </p>
                            <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">
                                We buy at this rate
                            </p>
                        </div>

                        {/* Arrow */}
                        <div className="hidden sm:flex items-center justify-center">
                            <ArrowRight className="h-6 w-6 text-muted-foreground" />
                        </div>

                        {/* DSR Margin */}
                        <div className="flex-1 p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="h-4 w-4 text-green-500" />
                                <span className="text-xs font-medium text-green-600 dark:text-green-400">
                                    DSR Margin
                                </span>
                            </div>
                            <p className="text-lg font-bold text-green-700 dark:text-green-300">
                                {dsrMargin}
                            </p>
                            <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">
                                Our profit potential
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
