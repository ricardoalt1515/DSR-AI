"use client";

import { AlertTriangle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Proposal } from "./types";

interface ProposalAssumptionsProps {
	proposal: Proposal;
}

export function ProposalAssumptions({ proposal }: ProposalAssumptionsProps) {
	const technicalData = proposal.aiMetadata.proposal.technicalData;
	const assumptions = technicalData.assumptions || [];
	const alternatives =
		technicalData.technologySelection?.rejectedAlternatives || [];
	const designParams = technicalData.designParameters;

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-3xl font-bold mb-2">Assumptions & Limitations</h2>
				<p className="text-muted-foreground">
					Design assumptions and alternative considerations
				</p>
			</div>

			{/* Design Parameters */}
			{designParams && (
				<Card>
					<CardHeader>
						<CardTitle>Design Parameters</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid md:grid-cols-2 gap-4">
							<div className="space-y-1">
								<p className="text-sm text-muted-foreground">Peak Factor</p>
								<p className="text-lg font-semibold">
									{designParams.peakFactor}
								</p>
							</div>
							<div className="space-y-1">
								<p className="text-sm text-muted-foreground">Safety Factor</p>
								<p className="text-lg font-semibold">
									{designParams.safetyFactor}
								</p>
							</div>
							<div className="space-y-1">
								<p className="text-sm text-muted-foreground">Operating Hours</p>
								<p className="text-lg font-semibold">
									{designParams.operatingHours} h/day
								</p>
							</div>
							<div className="space-y-1">
								<p className="text-sm text-muted-foreground">Design Life</p>
								<p className="text-lg font-semibold">
									{designParams.designLifeYears} years
								</p>
							</div>
							{designParams.regulatoryMarginPercent && (
								<div className="space-y-1">
									<p className="text-sm text-muted-foreground">
										Regulatory Margin
									</p>
									<p className="text-lg font-semibold">
										{designParams.regulatoryMarginPercent}%
									</p>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Assumptions */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Info className="h-5 w-5" />
						Design Assumptions
					</CardTitle>
				</CardHeader>
				<CardContent>
					{assumptions.length > 0 ? (
						<ul className="space-y-2">
							{assumptions.map((assumption) => (
								<li key={assumption} className="flex items-start gap-2">
									<span className="text-muted-foreground mt-1">•</span>
									<span className="text-sm">{assumption}</span>
								</li>
							))}
						</ul>
					) : (
						<p className="text-sm text-muted-foreground">
							No specific assumptions documented
						</p>
					)}
				</CardContent>
			</Card>

			{/* Rejected Alternatives */}
			{alternatives.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<AlertTriangle className="h-5 w-5" />
							Alternatives Considered
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{alternatives.map((alt) => (
								<Alert key={alt.technology}>
									<AlertDescription>
										<div className="space-y-1">
											<div className="flex items-center gap-2">
												<Badge variant="outline">{alt.technology}</Badge>
												<span className="text-xs text-muted-foreground">
													Not selected
												</span>
											</div>
											<p className="text-sm mt-2">{alt.reasonRejected}</p>
										</div>
									</AlertDescription>
								</Alert>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Important Notes */}
			<Alert>
				<AlertTriangle className="h-4 w-4" />
				<AlertDescription>
					<p className="font-semibold mb-1">Important Considerations</p>
					<ul className="text-sm space-y-1 mt-2">
						<li>
							• This proposal is based on the information provided and typical
							industry standards
						</li>
						<li>
							• Actual costs may vary based on local market conditions and site
							conditions
						</li>
						<li>
							• Detailed site assessment and laboratory testing are recommended
							before final design
						</li>
						<li>
							• Regulatory requirements may vary by jurisdiction and should be
							verified locally
						</li>
					</ul>
				</AlertDescription>
			</Alert>
		</div>
	);
}
