"use client";

import { Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Accordion } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Sector, Subsector } from "@/lib/sectors-config";
import { isFixedSection } from "@/lib/technical-sheet-data";
import type { TableField, TableSection } from "@/lib/types/technical-data";
import { cn } from "@/lib/utils";
import { SectionAccordionItem } from "./section-accordion-item";

interface FlexibleDataCaptureProps {
	sections: TableSection[];
	onFieldChange: (
		sectionId: string,
		fieldId: string,
		value: any,
		unit?: string,
		notes?: string,
	) => void;
	projectId?: string | null;
	onSave?: () => void;
	autoSave?: boolean;
	className?: string;
	focusSectionId?: string | null;
	onUpdateSectionNotes?: (sectionId: string, notes: string) => void;
}

export function FlexibleDataCapture({
	sections,
	onFieldChange,
	projectId,
	onSave,
	autoSave = true,
	className,
	focusSectionId,
	onUpdateSectionNotes,
}: FlexibleDataCaptureProps) {
	// State for custom sections accordion
	const [accordionValue, setAccordionValue] = useState<string[]>(() => {
		const incompleteSections = sections
			.filter((s) => !isFixedSection(s.id))
			.filter((s) => {
				const completed = s.fields.filter(
					(f) => f.value && f.value !== "",
				).length;
				const total = s.fields.length;
				return total > 0 && completed < total;
			})
			.slice(0, 3)
			.map((s) => s.id);

		return incompleteSections.length > 0 ? incompleteSections : [];
	});

	// State for fixed sections accordion
	const [fixedAccordionValue, setFixedAccordionValue] = useState<string[]>(
		() => {
			// ✅ OPTIMIZACIÓN: Solo expandir las primeras 2 secciones para mejorar rendimiento inicial
			// Expandir todas causa render masivo de cientos de campos
			return sections
				.filter((s) => isFixedSection(s.id))
				.slice(0, 2)
				.map((s) => s.id);
		},
	);

	// When a specific section is requested to be focused, ensure it is open and scrolled into view
	useEffect(() => {
		if (!focusSectionId) return;
		setAccordionValue((current) =>
			current.includes(focusSectionId) ? current : [...current, focusSectionId],
		);
		// Smooth scroll to the section container
		const el = document.getElementById(`section-${focusSectionId}`);
		if (el) {
			el.scrollIntoView({ behavior: "smooth", block: "start" });
			// Optional: brief highlight could be added here
		}
	}, [focusSectionId]);

	// handleAddParametersFromLibrary removed - not needed for fixed questionnaire

	// ✅ OPTIMIZACIÓN: Memoizar cálculos pesados
	const completedFields = useMemo(
		() =>
			sections.reduce((acc, section) => {
				return (
					acc +
					section.fields.filter((field) => field.value && field.value !== "")
						.length
				);
			}, 0),
		[sections],
	);

	const totalFields = useMemo(
		() => sections.reduce((acc, section) => acc + section.fields.length, 0),
		[sections],
	);

	const completionPercentage = useMemo(
		() =>
			totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0,
		[completedFields, totalFields],
	);

	return (
		<div className={cn("space-y-6", className)}>
			{/* Configuration Panel removed - questionnaire is fixed, no custom sections/fields needed */}
			{/* Progress indicators now shown in dashboard stats */}

			{/* Sections */}
			{sections.length === 0 ? (
				<Card>
					<CardContent className="py-12 text-center">
						<div className="text-muted-foreground">
							No questionnaire sections loaded. Please refresh the page.
						</div>
					</CardContent>
				</Card>
			) : (
				<>
					{/* Accordion Controls */}
					<div className="flex items-center justify-between">
						<p className="text-sm text-muted-foreground">
							{accordionValue.length + fixedAccordionValue.length} of{" "}
							{sections.length} sections expanded
						</p>
						<div className="flex gap-2">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => {
									// Expand all sections (both custom and fixed)
									const customSections = sections.filter(
										(s) => !isFixedSection(s.id),
									);
									const fixedSections = sections.filter((s) =>
										isFixedSection(s.id),
									);
									setAccordionValue(customSections.map((s) => s.id));
									setFixedAccordionValue(fixedSections.map((s) => s.id));
								}}
							>
								Expand All
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => {
									// Collapse all sections
									setAccordionValue([]);
									setFixedAccordionValue([]);
								}}
								disabled={
									accordionValue.length === 0 &&
									fixedAccordionValue.length === 0
								}
							>
								Collapse All
							</Button>
						</div>
					</div>

					{/* All Sections - Single unified accordion sorted by completion */}
					<Accordion
						type="multiple"
						value={[...accordionValue, ...fixedAccordionValue]}
						onValueChange={(newValue) => {
							// Split values back into custom and fixed for state management
							const customIds = sections.filter((s) => !isFixedSection(s.id)).map((s) => s.id);
							const fixedIds = sections.filter((s) => isFixedSection(s.id)).map((s) => s.id);
							setAccordionValue(newValue.filter((v) => customIds.includes(v)));
							setFixedAccordionValue(newValue.filter((v) => fixedIds.includes(v)));
						}}
						className="space-y-3"
					>
						{/* Render sections in original order (sorted by backend order field) */}
						{sections.map((section) => (
								<SectionAccordionItem
									key={section.id}
									section={section}
									onFieldChange={onFieldChange}
								/>
							))}
					</Accordion>
				</>
			)}
		</div>
	);
}
