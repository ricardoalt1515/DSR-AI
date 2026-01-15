"use client";

import { motion } from "framer-motion";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FinancialsSnapshotProps {
	currentCost: string;
	offerTerms: string;
	estimatedMargin: string;
	roiSummary?: string;
}

function parseROI(
	roiSummary: string,
): { investment: string; revenue: string; percentage: string } | null {
	const investMatch = roiSummary.match(/\$[\d.,]+k?/);
	const revenueMatch =
		roiSummary.match(/Revenue\s+(\$[\d.,]+k?\/yr)/i) ||
		roiSummary.match(/→\s+(\$[\d.,]+k?)/);
	const percentMatch = roiSummary.match(/(\d+)%/);

	if (!investMatch || !percentMatch) return null;

	return {
		investment: investMatch[0],
		revenue: revenueMatch?.[1] ?? "N/A",
		percentage: `${percentMatch[1]}%`,
	};
}

export function FinancialsSnapshot({
	currentCost,
	offerTerms,
	estimatedMargin,
	roiSummary,
}: FinancialsSnapshotProps) {
	const roi = roiSummary ? parseROI(roiSummary) : null;
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.2 }}
		>
			<Card className="overflow-hidden border-dashed">
				<CardContent className="p-6">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-semibold text-muted-foreground">
							Financial Estimates
						</h3>
						<span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
							Reference only
						</span>
					</div>

					<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
						{/* Current Cost */}
						<div className="flex-1 p-4 rounded-xl bg-muted/50 border border-border">
							<div className="flex items-center gap-2 mb-2">
								<TrendingDown className="h-4 w-4 text-muted-foreground" />
								<span className="text-xs font-medium text-muted-foreground">
									Current Cost (est.)
								</span>
							</div>
							<p className="text-lg font-bold text-foreground">{currentCost}</p>
							<p className="text-xs text-muted-foreground mt-1">
								What client pays now
							</p>
						</div>

						{/* Arrow */}
						<div className="hidden sm:flex items-center justify-center">
							<ArrowRight className="h-6 w-6 text-muted-foreground" />
						</div>

						{/* Offer Terms */}
						<div className="flex-1 p-4 rounded-xl bg-muted/50 border border-border">
							<div className="flex items-center gap-2 mb-2">
								<span className="text-xs font-medium text-muted-foreground">
									Offer Terms (est.)
								</span>
							</div>
							<p className="text-lg font-bold text-foreground">{offerTerms}</p>
							<p className="text-xs text-muted-foreground mt-1">
								Proposed rate or structure
							</p>
						</div>

						{/* Arrow */}
						<div className="hidden sm:flex items-center justify-center">
							<ArrowRight className="h-6 w-6 text-muted-foreground" />
						</div>

						{/* Estimated Margin */}
						<div className="flex-1 p-4 rounded-xl bg-muted/50 border border-border">
							<div className="flex items-center gap-2 mb-2">
								<TrendingUp className="h-4 w-4 text-muted-foreground" />
								<span className="text-xs font-medium text-muted-foreground">
									Estimated Margin (est.)
								</span>
							</div>
							<p className="text-lg font-bold text-foreground">
								{estimatedMargin}
							</p>
							<p className="text-xs text-muted-foreground mt-1">
								Potential margin estimate
							</p>
						</div>
					</div>

					{roi && (
						<div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mt-6 pt-4 border-t border-border">
							<div className="text-center">
								<p className="text-xs text-muted-foreground mb-1">
									Est. Investment
								</p>
								<p className="text-base font-semibold text-foreground">
									{roi.investment}
								</p>
							</div>
							<ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
							<div className="text-center">
								<p className="text-xs text-muted-foreground mb-1">
									Est. Revenue
								</p>
								<p className="text-base font-semibold text-foreground">
									{roi.revenue}
								</p>
							</div>
							<ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
							<div className="text-center">
								<p className="text-xs text-muted-foreground mb-1">Est. ROI</p>
								<p className="text-base font-semibold text-foreground">
									{roi.percentage}
								</p>
							</div>
						</div>
					)}

					<p className="text-xs text-muted-foreground mt-4 text-center">
						Prices vary by region, quality, and market conditions
					</p>
				</CardContent>
			</Card>
		</motion.div>
	);
}
