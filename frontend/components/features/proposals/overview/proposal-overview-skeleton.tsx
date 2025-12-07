"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProposalOverviewSkeleton() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-6 w-24 rounded-full" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-20" />
                    </div>
                </div>
            </div>

            {/* Hero Decision Banner Skeleton */}
            <Card className="border-2 overflow-hidden">
                <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-4">
                            <Skeleton className="w-16 h-16 rounded-2xl" />
                            <div className="space-y-2">
                                <Skeleton className="h-8 w-24" />
                                <Skeleton className="h-4 w-36" />
                            </div>
                        </div>
                        <div className="flex flex-col items-center">
                            <Skeleton className="w-14 h-14 rounded-full" />
                            <Skeleton className="h-3 w-16 mt-1" />
                        </div>
                    </div>
                    <Skeleton className="h-6 w-3/4 mb-4" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                </CardContent>
            </Card>

            {/* Photo Evidence Skeleton */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-4 w-56" />
                    </div>
                    <Skeleton className="h-7 w-24 rounded-full" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="overflow-hidden border-l-4 border-l-muted">
                            <CardContent className="p-0">
                                <Skeleton className="h-32 w-full" />
                                <div className="p-4 space-y-3">
                                    <div className="flex justify-between">
                                        <Skeleton className="h-5 w-20" />
                                        <Skeleton className="h-4 w-16" />
                                    </div>
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-1.5 w-full rounded-full" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Pathway Cards Skeleton */}
            <div className="space-y-4">
                <Skeleton className="h-6 w-40" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2].map((i) => (
                        <Card key={i} className="overflow-hidden">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <Skeleton className="w-6 h-6 rounded-full" />
                                    <Skeleton className="h-5 w-20" />
                                </div>
                                <Skeleton className="h-6 w-48 mb-2" />
                                <div className="flex gap-4 mb-3">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-4 w-20" />
                                </div>
                                <Skeleton className="h-20 w-full rounded-lg mb-3" />
                                <Skeleton className="h-8 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Financials Skeleton */}
            <Card className="overflow-hidden">
                <CardContent className="p-6">
                    <Skeleton className="h-6 w-32 mb-4" />
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex-1 p-4 rounded-xl border">
                                <Skeleton className="h-4 w-20 mb-2" />
                                <Skeleton className="h-6 w-28 mb-1" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Action Playbook Skeleton */}
            <div className="space-y-4">
                <Skeleton className="h-6 w-28" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[1, 2].map((i) => (
                        <Card key={i} className="border-l-4 border-l-muted">
                            <CardContent className="p-6">
                                <Skeleton className="h-5 w-32 mb-2" />
                                <Skeleton className="h-3 w-48 mb-4" />
                                <div className="space-y-3">
                                    {[1, 2, 3].map((j) => (
                                        <div key={j} className="flex items-start gap-3">
                                            <Skeleton className="w-6 h-6 rounded-full shrink-0" />
                                            <Skeleton className="h-4 w-full" />
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
