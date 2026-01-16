import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BusinessRisksCardProps {
	risks: string[];
}

export function BusinessRisksCard({ risks }: BusinessRisksCardProps) {
	if (risks.length === 0) return null;

	return (
		<Card className="border-l-4 border-l-yellow-500 bg-yellow-50/30 dark:bg-yellow-950/20">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<AlertCircle className="h-5 w-5 text-yellow-600" />
					Business Risks to Monitor
				</CardTitle>
				<p className="text-sm text-muted-foreground">
					Key risks DSR should evaluate before committing CapEx
				</p>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{risks.map((risk, idx) => (
						<div
							key={`risk-${risk.slice(0, 20)}-${idx}`}
							className="flex items-start gap-2 p-3 rounded-lg bg-yellow-100/50 dark:bg-yellow-900/20"
						>
							<span className="flex-shrink-0 w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 flex items-center justify-center text-xs font-bold">
								{idx + 1}
							</span>
							<p className="text-sm text-yellow-800 dark:text-yellow-200">
								{risk}
							</p>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
