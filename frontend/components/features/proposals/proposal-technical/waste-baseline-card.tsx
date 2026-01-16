import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WasteBaselineCardProps {
	primaryWasteTypes: string[];
	dailyMonthlyVolume?: string | undefined;
	existingDisposalMethod?: string | undefined;
}

export function WasteBaselineCard({
	primaryWasteTypes,
	dailyMonthlyVolume,
	existingDisposalMethod,
}: WasteBaselineCardProps) {
	if (primaryWasteTypes.length === 0) return null;

	return (
		<Card className="border-muted">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<Package className="h-5 w-5 text-muted-foreground" />
					Waste Baseline
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
					<div>
						<p className="text-xs text-muted-foreground mb-1">Material Types</p>
						<div className="flex flex-wrap gap-1">
							{primaryWasteTypes.map((wasteType, idx) => (
								<Badge
									key={`waste-${wasteType.slice(0, 10)}-${idx}`}
									variant="secondary"
									className="text-xs"
								>
									{wasteType}
								</Badge>
							))}
						</div>
					</div>
					<div>
						<p className="text-xs text-muted-foreground mb-1">Volume</p>
						<p className="font-medium">{dailyMonthlyVolume}</p>
					</div>
					<div>
						<p className="text-xs text-muted-foreground mb-1">
							Current Disposal
						</p>
						<p className="font-medium">{existingDisposalMethod}</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
