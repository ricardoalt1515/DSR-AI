"use client";

import { memo, useEffect, useState } from "react";
import { SectionErrorBoundary } from "@/components/features/proposals/overview/section-error-boundary";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isFixedSection } from "@/lib/technical-sheet-data";
import type { TableSection } from "@/lib/types/technical-data";
import { cn } from "@/lib/utils";
import { SectionAccordionItem } from "./section-accordion-item";

interface FlexibleDataCaptureProps {
	sections: TableSection[];
	onFieldChange: (
		sectionId: string,
		fieldId: string,
		value: unknown,
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

export const FlexibleDataCapture = memo(function FlexibleDataCapture({
	sections,
	onFieldChange,
	className,
	focusSectionId,
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
			// Expandir todas las secciones fijas para mejor UX
			return sections.filter((s) => isFixedSection(s.id)).map((s) => s.id);
		},
	);

	// Rehidratar accordion cuando sections cambia de vacío a poblado
	useEffect(() => {
		if (sections.length > 0) {
			// Expandir secciones fijas
			const fixedIds = sections
				.filter((s) => isFixedSection(s.id))
				.map((s) => s.id);
			setFixedAccordionValue(fixedIds);

			// Expandir secciones custom incompletas (primeras 3)
			const incompleteCustomIds = sections
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
			setAccordionValue(incompleteCustomIds);
		}
	}, [sections]);

	useEffect(() => {
		if (!focusSectionId) return;
		const isFixed = isFixedSection(focusSectionId);
		if (isFixed) {
			setFixedAccordionValue((current) =>
				current.includes(focusSectionId)
					? current
					: [...current, focusSectionId],
			);
		} else {
			setAccordionValue((current) =>
				current.includes(focusSectionId)
					? current
					: [...current, focusSectionId],
			);
		}
		const el = document.getElementById(`section-${focusSectionId}`);
		if (el) {
			el.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	}, [focusSectionId]);

	// handleAddParametersFromLibrary removed - not needed for fixed questionnaire

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
							const customIds = sections
								.filter((s) => !isFixedSection(s.id))
								.map((s) => s.id);
							const fixedIds = sections
								.filter((s) => isFixedSection(s.id))
								.map((s) => s.id);
							setAccordionValue(newValue.filter((v) => customIds.includes(v)));
							setFixedAccordionValue(
								newValue.filter((v) => fixedIds.includes(v)),
							);
						}}
						className="space-y-3"
					>
						{/* Render sections in original order (sorted by backend order field) */}
						{sections.map((section) => (
							<SectionErrorBoundary
								key={section.id}
								sectionName={section.title}
							>
								<SectionAccordionItem
									section={section}
									onFieldChange={onFieldChange}
								/>
							</SectionErrorBoundary>
						))}
					</Accordion>
				</>
			)}
		</div>
	);
});
