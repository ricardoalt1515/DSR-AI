"use client";

import { memo, useMemo } from "react";
import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { TableField, TableSection } from "@/lib/types/technical-data";
import { cn } from "@/lib/utils";
import { DynamicSection } from "./dynamic-section";


interface SectionAccordionItemProps {
	section: TableSection;
	isFixed?: boolean | undefined;
	onFieldChange: (
		sectionId: string,
		fieldId: string,
		value: any,
		unit?: string,
		notes?: string,
	) => void;
}

/**
 * ✅ OPTIMIZACIÓN: Componente reutilizable para items de accordion
 * - Elimina ~100 líneas de código duplicado
 * - React.memo previene re-renders innecesarios
 * - Se re-renderiza solo cuando section o props cambian
 */
export const SectionAccordionItem = memo(function SectionAccordionItem({
	section,
	isFixed = false,
	onFieldChange,
}: SectionAccordionItemProps) {
	// ✅ OPTIMIZACIÓN: Memoizar cálculos para evitar re-cálculos en cada render
	const { completedFields, totalFields, isEmpty } = useMemo(() => {
		const completed = section.fields.filter(
			(f) => f.value && f.value !== "",
		).length;
		const total = section.fields.length;
		return {
			completedFields: completed,
			totalFields: total,
			isEmpty: total === 0,
		};
	}, [section.fields]);

	return (
		<AccordionItem
			key={section.id}
			value={section.id}
			className={cn("border rounded-lg px-0", isFixed && "bg-muted/20")}
			id={`section-${section.id}`}
		>
			<AccordionTrigger className="px-6 py-4 hover:no-underline">
				<div className="flex items-center justify-between w-full mr-4">
					<div className="text-left">
						<h3 className="font-serif font-semibold">{section.title}</h3>
						{section.description && (
							<p className="text-sm text-muted-foreground mt-1">
								{section.description}
							</p>
						)}
					</div>
					<div className="flex items-center gap-3">
						{/* Mini progress bar for visual feedback */}
						{totalFields > 0 && (
							<Progress
								value={Math.round((completedFields / totalFields) * 100)}
								className="w-16 h-1.5"
							/>
						)}
						<Badge
							variant={completedFields === totalFields && totalFields > 0 ? "default" : "secondary"}
							className="text-xs"
						>
							{completedFields}/{totalFields}
						</Badge>
						{isEmpty && (
							<Badge variant="outline" className="text-xs">
								Empty
							</Badge>
						)}
					</div>

				</div>
			</AccordionTrigger>
			<AccordionContent className="px-0 pb-0">
				<div className="border-t px-6 py-4">
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
