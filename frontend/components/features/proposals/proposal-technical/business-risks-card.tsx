import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BusinessRisksCardProps {
	risks: string[];
}

export function BusinessRisksCard({ risks }: BusinessRisksCardProps) {
	if (risks.length === 0) return null;

	return (
		<Card className="border-l-4 border-l-warning bg-state-warning-bg">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<AlertCircle className="h-5 w-5 text-warning" />
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
							className="flex items-start gap-2 p-3 rounded-lg bg-warning/10"
						>
							<span className="flex-shrink-0 w-5 h-5 rounded-full bg-warning/20 text-warning flex items-center justify-center text-xs font-bold">
								{idx + 1}
							</span>
							<p className="text-sm text-warning-foreground">{risk}</p>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
