"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { ProjectHeader, ProjectTabs } from "@/components/features/projects";
import { GuidedTour, type TourStep } from "@/components/shared/guided-tour";
import { Skeleton } from "@/components/ui/skeleton";
import {
	useCurrentProject,
	useProjectActions,
	useProjectLoading,
} from "@/lib/stores";

export default function ProjectPage() {
	const params = useParams();
	const id = params.id as string;
	const currentProject = useCurrentProject();
	const loading = useProjectLoading();
	const { loadProject } = useProjectActions();

	// Tour steps for new users - MUST be before any conditional returns
	const tourSteps: TourStep[] = useMemo(
		() => [
			{
				id: "welcome",
				target: "[data-tour='project-tabs']",
				title: "Welcome to your Project",
				content:
					"This is your project workspace. Use these tabs to navigate between different sections.",
				placement: "bottom",
			},
			{
				id: "overview",
				target: "[data-tour='tab-overview']",
				title: "Overview Tab",
				content:
					"See your project summary, progress metrics, and quick actions at a glance.",
				placement: "bottom",
			},
			{
				id: "assessment",
				target: "[data-tour='tab-assessment']",
				title: "Assessment Tab",
				content:
					"Fill in technical data about the waste stream. The more data you provide, the better the AI proposal will be.",
				placement: "bottom",
			},
			{
				id: "proposals",
				target: "[data-tour='tab-proposals']",
				title: "Proposals Tab",
				content:
					"Generate AI-powered proposals once you have enough data. Review and export them here.",
				placement: "bottom",
			},
			{
				id: "files",
				target: "[data-tour='tab-files']",
				title: "Files Tab",
				content:
					"Upload documents, images, and safety data sheets related to your project.",
				placement: "bottom",
			},
		],
		[],
	);

	useEffect(() => {
		if (id && (!currentProject || currentProject.id !== id)) {
			loadProject(id);
		}
	}, [id, currentProject, loadProject]);

	if (loading) {
		return (
			<div className="min-h-screen bg-background">
				<div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
					<div className="container mx-auto px-4 py-6">
						<div className="space-y-4">
							<Skeleton className="h-8 w-64" />
							<Skeleton className="h-4 w-32" />
							<div className="flex gap-2">
								<Skeleton className="h-6 w-20" />
								<Skeleton className="h-6 w-16" />
							</div>
						</div>
					</div>
				</div>
				<main className="container mx-auto px-4 py-6">
					<div className="space-y-4">
						<Skeleton className="h-12 w-full" />
						<Skeleton className="h-64 w-full" />
					</div>
				</main>
			</div>
		);
	}

	if (!currentProject) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<div className="text-center space-y-4">
					<h1 className="text-2xl font-semibold text-foreground">
						Proyecto no encontrado
					</h1>
					<p className="text-muted-foreground">
						El proyecto que buscas no existe o no tienes permisos para verlo.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			<ProjectHeader project={currentProject} />
			<main className="container mx-auto px-4 py-6">
				<ProjectTabs project={currentProject} />
			</main>
			{/* Guided tour for new users */}
			<GuidedTour steps={tourSteps} tourId="project-page-tour" />
		</div>
	);
}
