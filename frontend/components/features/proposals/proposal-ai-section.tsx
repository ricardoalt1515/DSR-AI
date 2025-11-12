"use client";

import { Brain, Clock, Lightbulb, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CircularGauge } from "@/components/ui/circular-gauge";
import type { Proposal } from "./types";

interface ProposalAISectionProps {
	proposal: Proposal;
}

export function ProposalAISection({ proposal }: ProposalAISectionProps) {
	const aiMetadata = proposal.aiMetadata;
	const report = aiMetadata.proposal;

	if (!aiMetadata) {
		return null;
	}

	const confidence = report.confidenceLevel || "Medium";
	
	// Map confidence to score
	const getConfidenceScore = (level: string): number => {
		const scores = { High: 85, Medium: 65, Low: 45 };
		return scores[level as keyof typeof scores] || 65;
	};

	const confidenceScore = getConfidenceScore(confidence);

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-3xl font-bold mb-2">AI Analysis & Transparency</h2>
				<p className="text-muted-foreground">
					AI-generated insights and report metadata
				</p>
			</div>

			{/* Confidence Level */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Brain className="h-5 w-5 text-primary" />
						AI Confidence Level
					</CardTitle>
					<p className="text-sm text-muted-foreground">
						Overall confidence in this analysis
					</p>
				</CardHeader>
				<CardContent>
					<div className="flex items-center gap-6">
						<CircularGauge
							value={confidenceScore}
							size={120}
							strokeWidth={12}
							label={confidence}
						/>
						<div className="flex-1">
							<p className="text-sm text-muted-foreground mb-2">
								This confidence level is based on:
							</p>
							<ul className="space-y-1 text-sm">
								<li>• Data completeness from questionnaire</li>
								<li>• Market intelligence availability</li>
								<li>• Regulatory clarity for this waste type</li>
								<li>• Historical precedent in similar cases</li>
							</ul>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* AI Creative Insights */}
			{report.aiInsights && report.aiInsights.length > 0 && (
				<Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400" />
							AI Creative Insights
						</CardTitle>
						<p className="text-sm text-muted-foreground">
							Non-obvious opportunities and strategic observations
						</p>
					</CardHeader>
					<CardContent>
						<ul className="space-y-3">
							{report.aiInsights.map((insight: string, idx: number) => (
								<li key={idx} className="flex items-start gap-3">
									<div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
										<Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
									</div>
									<p className="text-sm flex-1 leading-relaxed">{insight}</p>
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			)}

			{/* Report Metadata */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Clock className="h-5 w-5 text-muted-foreground" />
						Report Metadata
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<p className="text-xs text-muted-foreground mb-1">Generated At</p>
							<p className="text-sm font-medium">
								{new Date(aiMetadata.transparency.generatedAt).toLocaleString()}
							</p>
						</div>
						<div>
							<p className="text-xs text-muted-foreground mb-1">Generation Time</p>
							<p className="text-sm font-medium">
								{aiMetadata.transparency.generationTimeSeconds}s
							</p>
						</div>
						<div>
							<p className="text-xs text-muted-foreground mb-1">Report Type</p>
							<Badge variant="outline">{aiMetadata.transparency.reportType}</Badge>
						</div>
						<div>
							<p className="text-xs text-muted-foreground mb-1">Confidence</p>
							<Badge 
								variant={
									confidence === "High" 
										? "default" 
										: confidence === "Low" 
										? "destructive" 
										: "secondary"
								}
							>
								{confidence}
							</Badge>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Markdown Content Preview */}
			{report.markdownContent && (
				<Card>
					<CardHeader>
						<CardTitle>Full Report (Markdown)</CardTitle>
						<p className="text-sm text-muted-foreground">
							Complete AI-generated analysis in markdown format
						</p>
					</CardHeader>
					<CardContent>
						<div className="bg-muted/30 rounded-lg p-4 max-h-96 overflow-y-auto">
							<pre className="text-xs whitespace-pre-wrap font-mono">
								{report.markdownContent}
							</pre>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
