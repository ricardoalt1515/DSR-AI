"use client";

import { BarChart3, CheckCircle, Droplets, XCircle } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { EmptyState } from "@/components/ui/empty-state";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { CHART_THEME, waterQualityChartConfig } from "@/lib/chart-config";
import { formatNumber, formatPercent } from "@/lib/utils";
import type { Proposal } from "./types";

interface ProposalWaterQualityProps {
	proposal: Proposal;
}

export function ProposalWaterQuality({ proposal }: ProposalWaterQualityProps) {
	const efficiency =
		proposal.aiMetadata.proposal.technicalData.treatmentEfficiency;

	if (!efficiency) {
		return null;
	}

	// Prepare chart data
	const chartData = efficiency.parameters.map((param) => ({
		name: param.parameterName,
		Influent: param.influentConcentration || 0,
		Effluent: param.effluentConcentration || 0,
		unit: param.unit,
	}));

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-3xl font-bold mb-2">Water Quality</h2>
				<p className="text-muted-foreground">
					Treatment efficiency and compliance
				</p>
			</div>

			{/* Overall Compliance */}
			<Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-card/50 shadow-lg">
				<CardContent className="p-6">
					<div className="flex items-center justify-between">
						<div>
							<h3 className="text-lg font-semibold mb-1">
								Regulatory Compliance
							</h3>
							<p className="text-sm text-muted-foreground">
								All parameters meet discharge limits
							</p>
						</div>
						<div className="flex items-center gap-2">
							{efficiency.overallCompliance ? (
								<>
									<CheckCircle className="h-8 w-8 text-[var(--compliance-pass)]" />
									<Badge
										variant="default"
										className="text-lg px-4 py-2 bg-[var(--compliance-pass)]"
									>
										PASS
									</Badge>
								</>
							) : (
								<>
									<XCircle className="h-8 w-8 text-[var(--compliance-fail)]" />
									<Badge variant="destructive" className="text-lg px-4 py-2">
										FAIL
									</Badge>
								</>
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Water Transformation Visualization */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Droplets className="h-5 w-5 text-primary" />
						Water Transformation
					</CardTitle>
					<p className="text-sm text-muted-foreground">
						Contaminant removal visualization
					</p>
				</CardHeader>
				<CardContent className="space-y-6">
					{efficiency.parameters.slice(0, 5).map((param) => {
						const removalPercent = param.removalEfficiencyPercent || 0;
						const isHighRemoval = removalPercent >= 80;

						return (
							<div key={param.parameterName} className="space-y-2">
								{/* Parameter name and removal */}
								<div className="flex justify-between items-center text-sm">
									<span className="font-medium">{param.parameterName}</span>
									<div className="flex items-center gap-2">
										<span className="text-muted-foreground">
											Removal: {formatPercent(removalPercent)}
										</span>
										{isHighRemoval ? (
											<CheckCircle className="h-4 w-4 text-[var(--compliance-pass)]" />
										) : (
											<XCircle className="h-4 w-4 text-[var(--compliance-partial)]" />
										)}
									</div>
								</div>

								{/* Visual transformation bar */}
								<div className="relative h-12 rounded-lg overflow-hidden border border-border bg-muted/20">
									{/* Background - Influent (full width) */}
									<div
										className="absolute inset-0"
										style={{
											background:
												"linear-gradient(90deg, var(--data-influent) 0%, var(--data-influent) 100%)",
											opacity: 0.3,
										}}
									/>

									{/* Effluent overlay (reduced width) */}
									<div
										className="absolute inset-y-0 right-0 transition-all duration-500"
										style={{
											width: `${100 - removalPercent}%`,
											background:
												"linear-gradient(90deg, var(--data-effluent) 0%, var(--data-effluent) 100%)",
											opacity: 0.6,
										}}
									/>

									{/* Labels */}
									<div className="absolute inset-0 flex items-center justify-between px-4">
										<div className="flex items-center gap-2">
											<span className="text-xs font-semibold text-foreground/80 bg-background/60 px-2 py-1 rounded">
												{formatNumber(param.influentConcentration || 0)}{" "}
												{param.unit}
											</span>
											<span className="text-muted-foreground text-xs">
												Influent
											</span>
										</div>

										<BarChart3 className="h-4 w-4 text-muted-foreground" />

										<div className="flex items-center gap-2">
											<span className="text-muted-foreground text-xs">
												Effluent
											</span>
											<span className="text-xs font-semibold text-foreground/80 bg-background/60 px-2 py-1 rounded">
												{formatNumber(param.effluentConcentration || 0)}{" "}
												{param.unit}
											</span>
										</div>
									</div>
								</div>

								{/* Treatment stage info */}
								{param.treatmentStage && (
									<p className="text-xs text-muted-foreground">
										Stage: {param.treatmentStage}
									</p>
								)}
							</div>
						);
					})}
				</CardContent>
			</Card>

			{/* Before/After Chart */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<BarChart3 className="h-5 w-5 text-primary" />
						Before & After Treatment
					</CardTitle>
					<p className="text-sm text-muted-foreground mt-1">
						Comparison of influent vs effluent concentrations
					</p>
				</CardHeader>
				<CardContent>
					{chartData.length > 0 &&
					chartData.some((d) => d.Influent > 0 || d.Effluent > 0) ? (
						<ChartContainer
							config={waterQualityChartConfig}
							className="h-[300px]"
						>
							<BarChart data={chartData} accessibilityLayer>
								<CartesianGrid {...CHART_THEME.grid} />
								<XAxis
									dataKey="name"
									{...CHART_THEME.axis}
									tickLine={false}
									axisLine={false}
								/>
								<YAxis
									{...CHART_THEME.axis}
									tickLine={false}
									axisLine={false}
									tickFormatter={(value) => formatNumber(value)}
								/>
								<ChartTooltip
									content={
										<ChartTooltipContent
											formatter={(value) => (
												<div className="flex items-center gap-2">
													<span className="font-medium">
														{formatNumber(value as number)}{" "}
														{chartData[0]?.unit || ""}
													</span>
												</div>
											)}
										/>
									}
								/>
								<Legend {...CHART_THEME.legend} />
								<Bar
									dataKey="Influent"
									fill="var(--color-Influent)"
									radius={[4, 4, 0, 0]}
								/>
								<Bar
									dataKey="Effluent"
									fill="var(--color-Effluent)"
									radius={[4, 4, 0, 0]}
								/>
							</BarChart>
						</ChartContainer>
					) : (
						<EmptyState
							icon={BarChart3}
							title="No Chart Data Available"
							description="Water quality data is not available for visualization. This may be because the analysis is still processing or no measurements were recorded."
							className="border-none"
						/>
					)}
				</CardContent>
			</Card>

			{/* Parameters Table */}
			<Card>
				<CardHeader>
					<CardTitle>Treatment Efficiency by Parameter</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Parameter</TableHead>
								<TableHead>Influent</TableHead>
								<TableHead>Effluent</TableHead>
								<TableHead>Removal</TableHead>
								<TableHead>Stage</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{efficiency.parameters.map((param) => (
								<TableRow key={param.parameterName}>
									<TableCell className="font-medium">
										{param.parameterName}
									</TableCell>
									<TableCell>
										{param.influentConcentration !== undefined
											? `${formatNumber(param.influentConcentration)} ${param.unit}`
											: "N/A"}
									</TableCell>
									<TableCell>
										{param.effluentConcentration !== undefined
											? `${formatNumber(param.effluentConcentration)} ${param.unit}`
											: "N/A"}
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-2">
											<Badge
												variant={
													param.removalEfficiencyPercent >= 80
														? "default"
														: "secondary"
												}
											>
												{formatPercent(param.removalEfficiencyPercent)}
											</Badge>
										</div>
									</TableCell>
									<TableCell className="text-sm text-muted-foreground">
										{param.treatmentStage || "Combined"}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{/* Critical Parameters */}
			{efficiency.criticalParameters &&
				efficiency.criticalParameters.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle>Critical Parameters</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex flex-wrap gap-2">
								{efficiency.criticalParameters.map((param) => (
									<Badge key={param} variant="destructive">
										{param}
									</Badge>
								))}
							</div>
							<p className="text-sm text-muted-foreground mt-3">
								These parameters require special attention during operation
							</p>
						</CardContent>
					</Card>
				)}
		</div>
	);
}
