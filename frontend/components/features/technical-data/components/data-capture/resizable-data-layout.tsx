"use client";

import { IntakeLayoutGroup } from "@/components/features/projects/intake-layout-group";
import { IntakePanel } from "@/components/features/projects/intake-panel";
import { Card } from "@/components/ui/card";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { TableField, TableSection } from "@/lib/types/technical-data";
import { FlexibleDataCapture } from "./flexible-data-capture";

interface ResizableDataLayoutProps {
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
	focusSectionId?: string | null;
	onOpenSection?: (sectionId: string) => void;
	onUpdateSectionNotes?: (sectionId: string, notes: string) => void;
	onAddSection?: (section: Omit<TableSection, "id">) => void;
	onRemoveSection?: (sectionId: string) => void;
	onAddField?: (sectionId: string, field: Omit<TableField, "id">) => void;
	onRemoveField?: (sectionId: string, fieldId: string) => void;
	disabled?: boolean;
	onUploadComplete?: () => void;
}

export function ResizableDataLayout({
	sections,
	onFieldChange,
	projectId,
	onSave,
	autoSave = true,
	focusSectionId,
	onOpenSection,
	onUpdateSectionNotes,
	disabled = false,
	onUploadComplete,
}: ResizableDataLayoutProps) {
	return (
		<IntakeLayoutGroup>
			<Card className="h-full overflow-hidden rounded-3xl border-none bg-card/80 shadow-sm">
				<ResizablePanelGroup direction="horizontal" className="h-full">
					<ResizablePanel defaultSize={65} minSize={55} className="min-w-0">
						<FlexibleDataCapture
							sections={sections}
							onFieldChange={onFieldChange}
							{...(projectId !== undefined ? { projectId } : {})}
							{...(onSave ? { onSave } : {})}
							autoSave={autoSave}
							className="h-full overflow-y-auto px-6 py-5"
							focusSectionId={focusSectionId ?? null}
							{...(onUpdateSectionNotes ? { onUpdateSectionNotes } : {})}
						/>
					</ResizablePanel>
					<ResizableHandle withHandle className="hidden lg:flex bg-border/60" />
					<ResizablePanel
						defaultSize={35}
						minSize={25}
						maxSize={45}
						className="hidden lg:block min-w-0"
					>
						{projectId ? (
							<IntakePanel
								projectId={projectId}
								sections={sections}
								disabled={disabled}
								onOpenSection={onOpenSection}
								{...(onUploadComplete ? { onUploadComplete } : {})}
							/>
						) : (
							<div className="h-full overflow-y-auto px-5 py-5 surface-muted">
								<p className="text-sm text-muted-foreground">
									Save the project to enable AI suggestions.
								</p>
							</div>
						)}
					</ResizablePanel>
				</ResizablePanelGroup>
			</Card>
		</IntakeLayoutGroup>
	);
}
