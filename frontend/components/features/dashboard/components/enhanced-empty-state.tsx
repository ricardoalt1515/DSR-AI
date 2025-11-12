"use client";

import {
	ArrowRight,
	Brain,
	CheckCircle,
	Clock,
	FileText,
	Play,
	Recycle,
	Sparkles,
	Target,
	Zap,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface EnhancedEmptyStateProps {
	onCreateProject?: () => void;
	onViewDemo?: () => void;
}

export function EnhancedEmptyState({
	onCreateProject,
	onViewDemo,
}: EnhancedEmptyStateProps) {
	const [activeStep, setActiveStep] = useState<number | null>(null);

	const workflowSteps = [
		{
			id: 1,
			title: "Company Info",
			description: "Name, location, industry sector",
			icon: FileText,
			duration: "2 min",
			color: "blue",
		},
		{
			id: 2,
			title: "Waste Assessment",
			description: "Waste types, volumes and handling",
			icon: Target,
			duration: "10 min",
			color: "purple",
		},
		{
			id: 3,
			title: "AI Analysis",
			description: "Deal feasibility and profitability",
			icon: Brain,
			duration: "3 min",
			color: "green",
		},
	];

	const benefits = [
		{
			title: "Fast Analysis",
			description: "Minutes, not hours",
			icon: Clock,
		},
		{
			title: "Business AI",
			description: "Deal profitability focus",
			icon: Brain,
		},
		{
			title: "Track Everything",
			description: "Full audit trail",
			icon: CheckCircle,
		},
	];

	return (
		<div className="max-w-4xl mx-auto space-y-8">
			{/* Hero Section */}
			<Card className="aqua-panel relative overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
				<div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gradient-radial from-primary/20 via-transparent to-transparent blur-3xl" />
				<div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-gradient-radial from-accent/15 via-transparent to-transparent blur-3xl" />
				<CardContent className="relative p-8 lg:p-12 text-center">
					<div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-primary/80 shadow-2xl flex items-center justify-center mb-6 animate-float">
						<Recycle className="h-10 w-10 text-primary-foreground" />
					</div>

					<div className="space-y-4 mb-8">
						<h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
							Welcome to DSR Platform!
						</h1>
						<p className="text-xl text-muted-foreground max-w-2xl mx-auto">
							Your central hub for waste resource opportunities.
							<strong className="text-primary">
								{" "}
								Identify profitable deals in minutes, not days.
							</strong>
						</p>
					</div>

					<div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
						<Button
							size="lg"
							onClick={onCreateProject}
							className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-200"
						>
							<Sparkles className="h-5 w-5 mr-2" />
							Create First Project
							<ArrowRight className="h-4 w-4 ml-2" />
						</Button>

						{onViewDemo && (
							<Button variant="outline" size="lg" onClick={onViewDemo}>
								<Play className="h-4 w-4 mr-2" />
								View Demo (2 min)
							</Button>
						)}
					</div>

					<Badge
						variant="secondary"
						className="bg-primary/10 text-primary border-primary/20"
					>
						🚀 You only need 4 basic pieces of data to start
					</Badge>
				</CardContent>
			</Card>

			{/* Workflow Steps */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				{workflowSteps.map((step, index) => {
					const Icon = step.icon;
					const isActive = activeStep === step.id;
					const colors = {
						blue: {
							bg: "border-primary/30 bg-primary/10",
							icon: "bg-primary/15 text-primary",
							number: "bg-primary text-primary-foreground",
						},
						purple: {
							bg: "border-treatment-auxiliary/30 bg-treatment-auxiliary/10",
							icon: "bg-treatment-auxiliary/15 text-treatment-auxiliary",
							number: "bg-treatment-auxiliary text-primary-foreground",
						},
						green: {
							bg: "border-success/30 bg-success/10",
							icon: "bg-success/15 text-success",
							number: "bg-success text-success-foreground",
						},
					};

					const colorScheme = colors[step.color as keyof typeof colors];

					return (
						<div key={step.id} className="relative">
							<Card
								className={cn(
									colorScheme.bg,
									"transition-all duration-300 hover:shadow-lg cursor-pointer",
									isActive && "ring-2 ring-primary/50 scale-105",
								)}
								onMouseEnter={() => setActiveStep(step.id)}
								onMouseLeave={() => setActiveStep(null)}
							>
								<CardContent className="p-6 text-center">
									<div className="relative mb-4">
										<div
											className={cn(
												"w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3",
												colorScheme.icon,
											)}
										>
											<Icon className="h-6 w-6" />
										</div>
										<div
											className={cn(
												"absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
												colorScheme.number,
											)}
										>
											{step.id}
										</div>
									</div>

									<h3 className="font-semibold text-foreground mb-2">
										{step.title}
									</h3>
									<p className="text-sm text-muted-foreground mb-3">
										{step.description}
									</p>
									<Badge variant="secondary" className="text-xs">
										⏱️ {step.duration}
									</Badge>
								</CardContent>
							</Card>

							{/* Flow Arrow */}
							{index < workflowSteps.length - 1 && (
								<div className="hidden md:block absolute top-1/2 -right-3 z-10">
									<div className="h-6 w-6 bg-background border border-border rounded-full flex items-center justify-center shadow-sm">
										<ArrowRight className="h-3 w-3 text-primary" />
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>

			{/* Benefits Grid */}
			<Card className="aqua-panel">
				<CardContent className="p-6">
					<div className="text-center mb-6">
						<h2 className="text-2xl font-semibold text-foreground mb-2">
							Why DSR Platform?
						</h2>
						<p className="text-muted-foreground">
							Purpose-built for industrial waste deal analysis
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{benefits.map((benefit, index) => {
							const Icon = benefit.icon;

							return (
								<div
									key={`benefit-${index}-${benefit.title}`}
									className="text-center space-y-3"
								>
									<div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
										<Icon className="h-6 w-6 text-primary" />
									</div>
									<div>
										<h3 className="font-semibold text-foreground">
											{benefit.title}
										</h3>
										<p className="text-sm text-muted-foreground">
											{benefit.description}
										</p>
									</div>
								</div>
							);
						})}
					</div>

					<Separator className="my-6" />

					<div className="text-center">
						<p className="text-sm text-muted-foreground mb-4">
							<strong className="text-foreground">💡 Tip:</strong> Start with
							company info and waste data. AI will analyze profitability and suggest
							optimal deal structures.
						</p>
						<Button
							onClick={onCreateProject}
							className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
						>
							<Zap className="h-4 w-4 mr-2" />
							Start Now
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
