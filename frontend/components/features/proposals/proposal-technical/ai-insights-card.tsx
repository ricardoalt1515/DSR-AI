import { Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AIInsightsCardProps {
	insights: string[];
}

export function AIInsightsCard({ insights }: AIInsightsCardProps) {
	if (insights.length === 0) return null;

	return (
		<Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Lightbulb className="h-6 w-6 text-blue-600 dark:text-blue-400" />
					AI Creative Insights
				</CardTitle>
				<p className="text-sm text-muted-foreground">
					Non-obvious opportunities and strategic observations
				</p>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					{insights.map((insight, idx) => (
						<div
							key={`insight-${insight.slice(0, 20)}-${idx}`}
							className="flex items-start gap-3 p-4 rounded-lg bg-blue-100/50 dark:bg-blue-900/20"
						>
							<Lightbulb className="h-5 w-5 mt-0.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
							<p className="text-sm leading-relaxed">{insight}</p>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
