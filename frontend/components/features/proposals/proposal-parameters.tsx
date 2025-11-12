"use client";

import {
	Activity,
	Calendar,
	Droplet,
	Gauge,
	Shield,
	TrendingUp,
	Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { formatNumber } from "@/lib/utils";
import type { DesignParameters, OperationalData } from "./types";

interface ProposalParametersProps {
	designParameters?: DesignParameters | undefined;
	operationalData?: OperationalData | undefined;
}

/**
 * Reusable component to display design parameters and operational data
 * Following DRY principle - single component for all technical metrics
 */
export function ProposalParameters({
	designParameters,
	operationalData,
}: ProposalParametersProps) {
	// Early return if no data
	if (!designParameters && !operationalData) return null;

	return (
		<div className="space-y-8">
			<div>
				<h2 className="text-3xl font-bold mb-2">Operational Metrics</h2>
				<p className="text-muted-foreground">
					Key operational parameters and design criteria
				</p>
			</div>

			{/* Operational Dashboard - Simple metrics grid */}
			{operationalData && (
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					{operationalData.requiredAreaM2 && (
						<MetricCard
							icon={Gauge}
							label="Footprint"
							value={`${formatNumber(operationalData.requiredAreaM2)} m²`}
							subtitle="Required area"
							variant="primary"
						/>
					)}

					{operationalData.energyConsumptionKwhM3 && (
						<MetricCard
							icon={Zap}
							label="Energy"
							value={`${formatNumber(operationalData.energyConsumptionKwhM3)} kWh/m³`}
							subtitle="Specific consumption"
							variant="chart-4"
						/>
					)}

					{operationalData.sludgeProductionKgDay && (
						<MetricCard
							icon={Droplet}
							label="Sludge"
							value={`${formatNumber(operationalData.sludgeProductionKgDay)} kg/d`}
							subtitle="Daily production"
							variant="warning"
						/>
					)}
				</div>
			)}

			{/* Divider between operational and design parameters */}
			{operationalData && designParameters && <div className="border-t my-6" />}

			{/* Design Parameters Section */}
			{designParameters && (
				<div>
					<h3 className="text-xl font-semibold mb-4">Design Parameters</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{/* Peak Factor */}
						<Card className="hover:shadow-md transition-shadow">
							<CardHeader className="pb-2">
								<div className="flex items-center gap-2">
									<div className="p-2 rounded-lg bg-chart-1/10">
										<TrendingUp className="h-4 w-4 text-[hsl(var(--chart-1))]" />
									</div>
									<CardTitle className="text-sm font-medium">
										Peak Factor
									</CardTitle>
								</div>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{formatNumber(designParameters.peakFactor)}x
								</div>
								<p className="text-xs text-muted-foreground mt-1">
									Flow variation multiplier
								</p>
							</CardContent>
						</Card>

						{/* Safety Factor */}
						<Card className="hover:shadow-md transition-shadow">
							<CardHeader className="pb-2">
								<div className="flex items-center gap-2">
									<div className="p-2 rounded-lg bg-chart-2/10">
										<Shield className="h-4 w-4 text-[hsl(var(--chart-2))]" />
									</div>
									<CardTitle className="text-sm font-medium">
										Safety Factor
									</CardTitle>
								</div>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{formatNumber(designParameters.safetyFactor)}x
								</div>
								<p className="text-xs text-muted-foreground mt-1">
									Regulatory compliance margin
								</p>
							</CardContent>
						</Card>

						{/* Operating Hours */}
						<Card className="hover:shadow-md transition-shadow">
							<CardHeader className="pb-2">
								<div className="flex items-center gap-2">
									<div className="p-2 rounded-lg bg-chart-3/10">
										<Activity className="h-4 w-4 text-[hsl(var(--chart-3))]" />
									</div>
									<CardTitle className="text-sm font-medium">
										Operating Hours
									</CardTitle>
								</div>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{designParameters.operatingHours}h
								</div>
								<p className="text-xs text-muted-foreground mt-1">
									Daily operation time
								</p>
							</CardContent>
						</Card>

						{/* Design Life */}
						<Card className="hover:shadow-md transition-shadow">
							<CardHeader className="pb-2">
								<div className="flex items-center gap-2">
									<div className="p-2 rounded-lg bg-chart-4/10">
										<Calendar className="h-4 w-4 text-[hsl(var(--chart-4))]" />
									</div>
									<CardTitle className="text-sm font-medium">
										Design Life
									</CardTitle>
								</div>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{designParameters.designLifeYears} years
								</div>
								<p className="text-xs text-muted-foreground mt-1">
									Equipment lifespan
								</p>
							</CardContent>
						</Card>

						{/* Regulatory Margin */}
						{designParameters.regulatoryMarginPercent !== undefined && (
							<Card className="hover:shadow-md transition-shadow">
								<CardHeader className="pb-2">
									<div className="flex items-center gap-2">
										<div className="p-2 rounded-lg bg-chart-5/10">
											<Gauge className="h-4 w-4 text-[hsl(var(--chart-5))]" />
										</div>
										<CardTitle className="text-sm font-medium">
											Regulatory Margin
										</CardTitle>
									</div>
								</CardHeader>
								<CardContent>
									<div className="text-2xl font-bold">
										{formatNumber(designParameters.regulatoryMarginPercent)}%
									</div>
									<p className="text-xs text-muted-foreground mt-1">
										Above minimum requirements
									</p>
								</CardContent>
							</Card>
						)}
					</div>
				</div>
			)}

			{/* Operational Data Section */}
			{operationalData && (
				<div>
					<h3 className="text-xl font-semibold mb-4">Operational Data</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{/* Required Area */}
						{operationalData.requiredAreaM2 !== undefined && (
							<Card className="hover:shadow-md transition-shadow">
								<CardHeader className="pb-2">
									<div className="flex items-center gap-2">
										<div className="p-2 rounded-lg bg-primary/10">
											<Gauge className="h-4 w-4 text-primary" />
										</div>
										<CardTitle className="text-sm font-medium">
											Required Area
										</CardTitle>
									</div>
								</CardHeader>
								<CardContent>
									<div className="text-2xl font-bold">
										{formatNumber(operationalData.requiredAreaM2)} m²
									</div>
									<p className="text-xs text-muted-foreground mt-1">
										Total footprint
									</p>
								</CardContent>
							</Card>
						)}

						{/* Sludge Production */}
						{operationalData.sludgeProductionKgDay !== undefined && (
							<Card className="hover:shadow-md transition-shadow">
								<CardHeader className="pb-2">
									<div className="flex items-center gap-2">
										<div className="p-2 rounded-lg bg-chart-2/10">
											<Activity className="h-4 w-4 text-[hsl(var(--chart-2))]" />
										</div>
										<CardTitle className="text-sm font-medium">
											Sludge Production
										</CardTitle>
									</div>
								</CardHeader>
								<CardContent>
									<div className="text-2xl font-bold">
										{formatNumber(operationalData.sludgeProductionKgDay)} kg/day
									</div>
									<p className="text-xs text-muted-foreground mt-1">
										Daily waste generation
									</p>
								</CardContent>
							</Card>
						)}

						{/* Energy Consumption */}
						{operationalData.energyConsumptionKwhM3 !== undefined && (
							<Card className="hover:shadow-md transition-shadow">
								<CardHeader className="pb-2">
									<div className="flex items-center gap-2">
										<div className="p-2 rounded-lg bg-chart-4/10">
											<Zap className="h-4 w-4 text-[hsl(var(--chart-4))]" />
										</div>
										<CardTitle className="text-sm font-medium">
											Energy Intensity
										</CardTitle>
									</div>
								</CardHeader>
								<CardContent>
									<div className="text-2xl font-bold">
										{formatNumber(operationalData.energyConsumptionKwhM3)}{" "}
										kWh/m³
									</div>
									<p className="text-xs text-muted-foreground mt-1">
										Energy per volume treated
									</p>
								</CardContent>
							</Card>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
