"use client";

import { Fragment } from "react";
import {
	getProjectStatusStep,
	PROJECT_STATUS_FLOW,
} from "@/lib/project-status";
import type { ProjectStatus } from "@/lib/project-types";
import { cn } from "@/lib/utils";

const PROGRESS_STEPS = [
	{ id: 1, label: "Technical Data" },
	{ id: 2, label: "Proposal" },
	{ id: 3, label: "Follow-up" },
];

interface ProjectProgressIndicatorProps {
	status: ProjectStatus;
	className?: string;
}

export function ProjectProgressIndicator({
	status,
	className,
}: ProjectProgressIndicatorProps) {
	const currentStep = Math.min(
		getProjectStatusStep(status),
		PROGRESS_STEPS.length,
	);

	return (
		<div
			className={cn(
				"flex flex-wrap items-center gap-x-3 gap-y-2 sm:flex-nowrap",
				className,
			)}
		>
			{PROGRESS_STEPS.map((step, index) => {
				const completed = step.id < currentStep;
				const active = step.id === currentStep;

				return (
					<Fragment key={step.id}>
						<div className="flex min-w-0 items-center gap-2">
							<div
								className={cn(
									"flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors",
									completed && "border-primary/40 bg-primary/10 text-primary",
									active &&
										!completed &&
										"border-primary bg-primary text-primary-foreground",
									!(completed || active) &&
										"border-border text-muted-foreground",
								)}
							>
								{step.id}
							</div>
							<div className="min-w-0 text-xs leading-tight text-muted-foreground">
								<span className="break-words">{step.label}</span>
							</div>
						</div>
						{index < PROGRESS_STEPS.length - 1 && (
							<div
								className={cn(
									"hidden h-px flex-1 rounded-full sm:block",
									completed ? "bg-primary/40" : "bg-border",
								)}
							/>
						)}
					</Fragment>
				);
			})}
		</div>
	);
}

export function isTerminalProjectStatus(status: ProjectStatus) {
	const terminal = PROJECT_STATUS_FLOW.slice(-2);
	return terminal.includes(status);
}
