"use client";

import { CheckCircle2 } from "lucide-react";
import { memo, useMemo } from "react";
import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TableSection } from "@/lib/types/technical-data";
import { cn } from "@/lib/utils";
import { DynamicSection } from "./dynamic-section";

interface SectionAccordionItemProps {
	section: TableSection;
	isFixed?: boolean | undefined;
	onFieldChange: (
		sectionId: string,
		fieldId: string,
		value: unknown,
		unit?: string,
		notes?: string,
	) => void;
}

function MiniProgressRing({
	value,
	size = 32,
}: {
	value: number;
	size?: number;
}) {
	const stroke = 3;
	const radius = (size - stroke) / 2;
	const circumference = 2 * Math.PI * radius;
	const offset = circumference - (value / 100) * circumference;

	return (
		<svg
			className="transform -rotate-90"
			width={size}
			height={size}
			aria-hidden="true"
		>
			<circle
				cx={size / 2}
				cy={size / 2}
				r={radius}
				fill="none"
				stroke="hsl(var(--muted))"
				strokeWidth={stroke}
				opacity={0.3}
			/>
			<circle
				cx={size / 2}
				cy={size / 2}
				r={radius}
				fill="none"
				stroke={value === 100 ? "hsl(var(--success))" : "hsl(var(--primary))"}
				strokeWidth={stroke}
				strokeLinecap="round"
				strokeDasharray={circumference}
				strokeDashoffset={offset}
				className="transition-all duration-300 ease-out"
			/>
		</svg>
	);
}

export const SectionAccordionItem = memo(function SectionAccordionItem({
	section,
	onFieldChange,
}: SectionAccordionItemProps) {
	const { completedFields, totalFields, percentage, isComplete, isEmpty } =
		useMemo(() => {
			const completed = section.fields.filter(
				(f) => f.value && f.value !== "",
			).length;
			const total = section.fields.length;
			const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
			return {
				completedFields: completed,
				totalFields: total,
				percentage: pct,
				isComplete: total > 0 && completed === total,
				isEmpty: total === 0,
			};
		}, [section.fields]);

	const cardState = isEmpty
		? "section-card--incomplete"
		: isComplete
			? "section-card--complete"
			: percentage > 0
				? "section-card--in-progress"
				: "section-card--incomplete";

	return (
		<AccordionItem
			value={section.id}
			className={cn("section-card", cardState)}
			id={`section-${section.id}`}
		>
			<AccordionTrigger className="px-5 py-4 hover:no-underline group">
				<div className="flex items-center justify-between w-full mr-3">
					<div className="text-left flex-1 min-w-0">
						<div className="flex items-center gap-2">
							<h3 className="font-semibold truncate">{section.title}</h3>
							{isComplete && (
								<CheckCircle2 className="h-4 w-4 text-success flex-shrink-0 animate-checkmark" />
							)}
						</div>
						{section.description && (
							<p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
								{section.description}
							</p>
						)}
					</div>

					<div className="flex items-center gap-3 flex-shrink-0">
						{totalFields > 0 && (
							<TooltipProvider delayDuration={300}>
								<Tooltip>
									<TooltipTrigger asChild>
										<div className="flex items-center gap-2 cursor-default">
											<MiniProgressRing value={percentage} size={28} />
											<span
												className={cn(
													"text-sm font-medium tabular-nums",
													isComplete ? "text-success" : "text-muted-foreground",
												)}
											>
												{completedFields}/{totalFields}
											</span>
										</div>
									</TooltipTrigger>
									<TooltipContent side="left">
										<p className="text-xs">
											{isComplete
												? "Section complete!"
												: `${percentage}% complete - ${totalFields - completedFields} fields remaining`}
										</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						)}
						{isEmpty && (
							<span className="text-xs text-muted-foreground">No fields</span>
						)}
					</div>
				</div>
			</AccordionTrigger>
			<AccordionContent className="px-0 pb-0">
				<div className="border-t border-border/50 px-5 py-4">
					<DynamicSection
						section={section}
						onFieldChange={onFieldChange}
						isCollapsible={false}
					/>
				</div>
			</AccordionContent>
		</AccordionItem>
	);
});
