import { Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StrategicRecommendationsCardProps {
	recommendations: string[];
}

export function StrategicRecommendationsCard({
	recommendations,
}: StrategicRecommendationsCardProps) {
	if (recommendations.length === 0) return null;

	return (
		<Card className="border-l-4 border-l-primary">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Target className="h-5 w-5 text-primary" />
					Next Steps for DSR
				</CardTitle>
				<p className="text-sm text-muted-foreground">
					Action items to move this opportunity forward
				</p>
			</CardHeader>
			<CardContent>
				<ol className="space-y-3">
					{recommendations.map((rec, idx) => (
						<li
							key={`rec-${rec.slice(0, 20)}-${idx}`}
							className="flex items-start gap-3"
						>
							<span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
								{idx + 1}
							</span>
							<p className="text-sm leading-relaxed pt-0.5">{rec}</p>
						</li>
					))}
				</ol>
			</CardContent>
		</Card>
	);
}
