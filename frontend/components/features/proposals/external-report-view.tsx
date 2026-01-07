"use client";

/**
 * External Report View
 *
 * Client-facing sustainability report that displays sanitized data.
 * Shows CO₂ reduction, water savings, circularity metrics, and
 * profitability band without sensitive commercial details.
 */

import { Leaf, Droplets, Recycle, TrendingUp, ArrowRight, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Proposal } from "./types";

interface ExternalReportViewProps {
    proposal: Proposal;
}

interface SustainabilityMetric {
    status: "computed" | "not_computed";
    value?: string | null;
    basis?: string | null;
    dataNeeded?: string[];
}

interface CircularityIndicator {
    name: string;
    metric: SustainabilityMetric;
}

interface ExternalReport {
    report_version?: string;
    generated_at?: string;
    reportVersion?: string;
    generatedAt?: string;
    sustainability?: {
        summary?: string;
        co2e_reduction?: SustainabilityMetric;
        water_savings?: SustainabilityMetric;
        co2eReduction?: SustainabilityMetric;
        waterSavings?: SustainabilityMetric;
        circularity?: CircularityIndicator[];
        overall_environmental_impact?: string;
        overallEnvironmentalImpact?: string;
    };
    profitability_band?: "High" | "Medium" | "Low" | "Unknown";
    profitabilityBand?: "High" | "Medium" | "Low" | "Unknown";
    end_use_industry_examples?: string[];
    endUseIndustryExamples?: string[];
}

const PROFITABILITY_COLORS = {
    High: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    Medium: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    Low: "bg-rose-500/10 text-rose-600 border-rose-500/30",
    Unknown: "bg-muted text-muted-foreground border-border",
} as const;

function MetricCard({
    icon: Icon,
    title,
    metric,
    colorClass,
}: {
    icon: React.ElementType;
    title: string;
    metric: SustainabilityMetric | undefined;
    colorClass: string;
}) {
    const isComputed = metric?.status === "computed";
    const value = metric?.value;
    const dataNeeded = metric?.dataNeeded || [];

    return (
        <Card className={cn("relative overflow-hidden", !isComputed && "opacity-75")}>
            <div className={cn("absolute inset-0 opacity-5", colorClass)} />
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={cn("p-2 rounded-lg", colorClass)}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-base">{title}</CardTitle>
                    </div>
                    <Badge variant={isComputed ? "default" : "secondary"}>
                        {isComputed ? "Computed" : "Pending"}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                {isComputed && value ? (
                    <>
                        <p className="text-2xl font-bold tracking-tight">{value}</p>
                        {metric?.basis && (
                            <p className="text-xs text-muted-foreground mt-1">{metric.basis}</p>
                        )}
                    </>
                ) : (
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                            This metric requires additional data to compute.
                        </p>
                        {dataNeeded.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-foreground">Data needed:</p>
                                <ul className="text-xs text-muted-foreground space-y-0.5">
                                    {dataNeeded.map((item, i) => (
                                        <li key={i} className="flex items-center gap-1.5">
                                            <ArrowRight className="h-3 w-3 text-primary/60" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function ExternalReportView({ proposal }: ExternalReportViewProps) {
    const aiMetadata = proposal.aiMetadata as unknown as {
        proposal_external?: ExternalReport;
    };
    const external = aiMetadata?.proposal_external;

    if (!external) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                        <Info className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">External Report Not Available</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        The client-facing sustainability report has not been generated for this proposal.
                        Please regenerate the proposal to create the external report.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const sustainability = external.sustainability || {};
    const co2Metric =
        sustainability.co2eReduction || sustainability.co2e_reduction;
    const waterMetric =
        sustainability.waterSavings || sustainability.water_savings;
    const overallImpact =
        sustainability.overallEnvironmentalImpact ||
        sustainability.overall_environmental_impact;
    const profitabilityBand =
        external.profitabilityBand || external.profitability_band || "Unknown";
    const industries =
        external.endUseIndustryExamples || external.end_use_industry_examples || [];
    const generatedAt = external.generatedAt || external.generated_at;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Sustainability Report</h2>
                    <p className="text-sm text-muted-foreground">
                        Client-facing environmental impact summary
                    </p>
                </div>
                <Badge variant="outline" className="gap-1.5">
                    <Leaf className="h-3 w-3" />
                    ESG Ready
                </Badge>
            </div>

            {/* Executive Summary */}
            {sustainability.summary && (
                <Card className="bg-gradient-to-br from-emerald-50/50 to-green-50/30 dark:from-emerald-950/20 dark:to-green-950/10 border-emerald-200/50 dark:border-emerald-800/30">
                    <CardContent className="py-6">
                        <p className="text-lg leading-relaxed text-foreground/90">
                            {sustainability.summary}
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Sustainability Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-2">
                <MetricCard
                    icon={Leaf}
                    title="CO₂e Reduction"
                    metric={co2Metric}
                    colorClass="bg-emerald-500/10 text-emerald-600"
                />
                <MetricCard
                    icon={Droplets}
                    title="Water Savings"
                    metric={waterMetric}
                    colorClass="bg-blue-500/10 text-blue-600"
                />
            </div>

            {/* Circularity Indicators */}
            {sustainability.circularity && sustainability.circularity.length > 0 && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600">
                                <Recycle className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Circularity Indicators</CardTitle>
                                <CardDescription>Circular economy performance metrics</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {sustainability.circularity.map((indicator, i) => (
                                <div
                                    key={i}
                                    className="flex items-start justify-between p-3 rounded-lg bg-muted/50"
                                >
                                    <div>
                                        <p className="font-medium">{indicator.name}</p>
                                        {indicator.metric.status === "computed" && indicator.metric.value ? (
                                            <p className="text-sm text-emerald-600 font-medium">
                                                {indicator.metric.value}
                                            </p>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">
                                                Data collection in progress
                                            </p>
                                        )}
                                    </div>
                                    <Badge variant={indicator.metric.status === "computed" ? "default" : "secondary"}>
                                        {indicator.metric.status === "computed" ? "Active" : "Pending"}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Overall Environmental Impact */}
            {overallImpact && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Overall Environmental Impact</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            {overallImpact}
                        </p>
                    </CardContent>
                </Card>
            )}

            <Separator />

            {/* Profitability Band & End-Use Industries */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Profitability Band */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Profitability Assessment</CardTitle>
                                <CardDescription>Qualitative opportunity evaluation</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "text-lg px-4 py-2 cursor-help",
                                            PROFITABILITY_COLORS[profitabilityBand],
                                        )}
                                    >
                                        {profitabilityBand} Opportunity
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Based on market analysis and material characteristics</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </CardContent>
                </Card>

                {/* End-Use Industries */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Potential End-Use Industries</CardTitle>
                        <CardDescription>Example markets for valorized materials</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {industries.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {industries.map((industry, i) => (
                                    <Badge key={i} variant="secondary">
                                        {industry}
                                    </Badge>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Industry examples will be available after full analysis.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Footer */}
            <div className="text-xs text-muted-foreground text-right space-y-1">
                <p>Report Version: {external.reportVersion || external.report_version || "v1"}</p>
                {generatedAt && (
                    <p>
                        Generated: {new Date(generatedAt).toLocaleDateString()}
                    </p>
                )}
            </div>
        </div>
    );
}
